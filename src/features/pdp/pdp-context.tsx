"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CartProductSummary } from "@/components/cart/add-to-cart-button";
import type { CalculatorConfig, CalculatorInput, StairType } from "@/features/calculator";
import { DIMENSION_BOUNDS, serializeCalculatorState } from "@/features/calculator";
import { useAuthUser } from "@/lib/supabase/use-auth-user";
import {
  computeChecklistPackAmounts,
  isChecklistPackFormed,
  type ChecklistAccessoryInput,
  type ChecklistPackAmounts,
} from "./checklist-pack-pricing";
import { recalculatePdpBuyBoxAmounts, type RecalculatedPdpResult } from "./recalculate-buy-box";
import { resolveAtcPanelValues, type AtcPanelValues } from "./resolve-atc-panel-values";

/**
 * Réponse de `/api/pricing/product-price` (29b②/③) — forme structurellement
 * dépendante du rôle : un b2c n'a JAMAIS de `proUnitAmountCents`/`proUnitHtCents`
 * dans son objet (absents, pas nuls). Le prix pro n'existe dans le DOM
 * qu'après ce fetch authentifié, jamais dans le HTML ISR (D5/29b) : le rôle
 * est résolu côté serveur (`resolvePricingRole()`, cookies de session),
 * jamais transmis ni recalculé côté client — ce composant ne fait que
 * réinjecter des montants déjà résolus pour un rôle déjà vérifié dans la
 * MÊME chaîne de recalcul que le b2c (`recalculatePdpBuyBoxAmounts`, 29b①).
 */
type ProductPriceResponse =
  | { role: "b2c"; publicTtcCents: number }
  | {
      role: "b2b";
      publicTtcCents: number;
      proUnitAmountCents: number;
      proUnitHtCents: number;
      /**
       * HT pro de chaque accessoire de la checklist (29c② partie A, correctif
       * « PDP ≠ panier ») — résolu dans le MÊME aller-retour que la membrane.
       * Avant ce correctif, les accessoires restaient facturés au prix PUBLIC
       * même quand la membrane basculait en pro : le total affiché sur la PDP
       * divergeait de celui du panier.
       */
      accessoryProPricing: Record<string, { proUnitHtCents: number; proUnitAmountCents: number }>;
    };

/** Debounce du recalcul (spec 29 §3) : synchrone, aucun appel réseau, budget INP < 150 ms. */
const RECALC_DEBOUNCE_MS = 150;

export type CalculatorMode = "guided" | "direct";
export type DimensionField = "length" | "width" | "depth";

export function parseDimension(raw: string): number {
  return Number(raw.replace(",", "."));
}

export type ChecklistAccessoryItem = ChecklistAccessoryInput & { name: string; unit: string; motif: string };

export interface PdpProviderProps {
  product: CartProductSummary;
  calculatorConfig: CalculatorConfig;
  /**
   * HT unitaire PUBLIC résolu côté serveur (`resolvePriceBreakdown`, b2c,
   * 29a) — état initial (identique au HTML SSR, D5). Bascule en interne vers
   * `proUnitHtCents` dès que le fetch authentifié (29b②/③) résout un rôle
   * b2b ; ce prop lui-même ne change jamais après montage.
   */
  unitHtCents: number;
  vatRateBps: number;
  /** `roll_area_m2` du produit (04). */
  membraneRollAreaM2: number;
  initialInput: CalculatorInput;
  /**
   * Résultat calculé côté serveur sur `initialInput` (29a,
   * `computePdpBuyBoxAmounts`) — utilisé tel quel comme état initial, jamais
   * recalculé au montage : garantit un rendu client identique au HTML SSR
   * (pas de flash, pas de saut, D5).
   */
  initialResult: RecalculatedPdpResult;
  /**
   * Accessoires proposés par la checklist de chantier (29 §9, 29c②) — quantités
   * calculées côté serveur sur `initialInput` (`calculatePack`, 08), `sku`
   * jamais transmis (23a). HT/TVA nécessaires ici pour que la checklist et le
   * panier facturent au centime près via la MÊME `computeLineChargeFromUnitHt`.
   */
  checklistAccessories: ChecklistAccessoryItem[];
  /** `PACK_DISCOUNT_BPS` (13/26) — jamais recalculé côté client, lu une fois côté serveur. */
  packDiscountBps: number;
  children: ReactNode;
}

export interface PdpContextValue {
  product: CartProductSummary;
  checklistAccessories: ChecklistAccessoryItem[];
  packDiscountBps: number;

  mode: CalculatorMode;
  setMode: (mode: CalculatorMode) => void;
  guidedRevealCount: number;
  advanceGuidedReveal: () => void;
  dimensions: Record<DimensionField, string>;
  stairType: StairType;
  errors: Partial<Record<DimensionField, string>>;
  handleDimensionChange: (field: DimensionField, value: string) => void;
  handleStairChange: (value: StairType) => void;
  showField: (field: DimensionField) => boolean;
  showStairs: boolean;
  isGuidedSequenceActive: boolean;

  panelValues: AtcPanelValues;
  packAmounts: ChecklistPackAmounts;
  calculatorParamsString: string;
  checkedAccessoryLines: { slug: string; quantity: number }[];

  checkedAccessorySlugs: string[];
  toggleAccessory: (slug: string) => void;
}

const PdpContext = createContext<PdpContextValue | null>(null);

/**
 * État unique du calculateur PDP (29b①) ET de la checklist de chantier
 * (29c②) — remonté ici (Correctif hydratation 29c②) pour que la buy-box
 * (haut de page) et la checklist (bas de page, après la fiche technique/FAQ)
 * partagent le même état SANS portail : les deux consomment ce contexte,
 * chacune rendue à sa place naturelle dans l'arbre React que compose
 * `[couleur]/page.tsx` (Server Component). `PdpProvider` reçoit `children`
 * déjà rendus côté serveur (galerie, highlights, fiche technique/FAQ,
 * `Collapsible­Section`) — ces enfants restent des Server Components,
 * jamais convertis en client : seul ce module l'est, `children` n'est qu'une
 * prop React normale.
 */
export function PdpProvider({
  product,
  calculatorConfig,
  unitHtCents,
  vatRateBps,
  membraneRollAreaM2,
  initialInput,
  initialResult,
  checklistAccessories,
  packDiscountBps,
  children,
}: PdpProviderProps) {
  const [mode, setMode] = useState<CalculatorMode>("guided");
  const [guidedRevealCount, setGuidedRevealCount] = useState(1);
  const [dimensions, setDimensions] = useState<Record<DimensionField, string>>({
    length: String(initialInput.pool.dimensions.length),
    width: String(initialInput.pool.dimensions.width),
    depth: String(initialInput.pool.dimensions.depth),
  });
  const [stairType, setStairType] = useState<StairType>(initialInput.stairType);
  const [result, setResult] = useState<RecalculatedPdpResult>(initialResult);
  const [errors, setErrors] = useState<Partial<Record<DimensionField, string>>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Dernières cotes valides ayant produit `result` — rejouées en pro dès que le fetch (29b②/③) résout un rôle b2b, sans attendre une nouvelle frappe. */
  const lastValidInputRef = useRef<CalculatorInput>(initialInput);

  /**
   * Checklist de chantier (29 §9, 29c②) — état partagé, via ce contexte,
   * entre la buy-box (discount sur le total/€ m², réserve 28b) et la section
   * rendue en bas de page (`PdpChecklistUpsell`) : un seul état, aucune
   * divergence possible entre les deux vues.
   */
  const [checkedAccessorySlugs, setCheckedAccessorySlugs] = useState<string[]>([]);

  function toggleAccessory(slug: string) {
    setCheckedAccessorySlugs((current) =>
      current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
    );
  }

  const user = useAuthUser();
  const [proPricing, setProPricing] = useState<Extract<ProductPriceResponse, { role: "b2b" }>>();

  // Hydratation prix pro (29b②) : la PDP reste rendue en prix public (ISR,
  // 29a) — ce fetch, déclenché après montage et uniquement pour un
  // utilisateur connecté, COMPLÈTE l'affichage sans jamais le bloquer (l'ATC
  // reste actif pendant ce temps, D5). Un visiteur non connecté ne déclenche
  // même pas la requête.
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    // Accessoires de la checklist demandés dans le MÊME aller-retour que la
    // membrane (29c② partie A) — un seul fetch, jamais un second appel par
    // accessoire : `accessoryProPricing` (b2b uniquement) permet à la
    // checklist de basculer sur le même rôle que la membrane.
    const params = new URLSearchParams({ slug: product.slug });
    if (checklistAccessories.length > 0) {
      params.set("accessorySlugs", checklistAccessories.map((accessory) => accessory.slug).join(","));
    }

    fetch(`/api/pricing/product-price?${params.toString()}`)
      .then((res) => (res.ok ? (res.json() as Promise<ProductPriceResponse>) : null))
      .then((data) => {
        if (!cancelled && data?.role === "b2b") setProPricing(data);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [product.slug, user, checklistAccessories]);

  /**
   * Montants d'entrée de la chaîne de recalcul (29b①) — publics par défaut,
   * basculent en pro dès que le fetch authentifié (29b②/③) résout un rôle
   * b2b. MÊME fonction `recalculatePdpBuyBoxAmounts`, seuls `unitHtCents`/
   * `unitAmountCents` changent : aucune seconde chaîne de calcul pour le pro.
   */
  const activeUnitHtCents = proPricing ? proPricing.proUnitHtCents : unitHtCents;
  const activeUnitAmountCents = proPricing
    ? proPricing.proUnitAmountCents
    : initialResult.buyBox.unitAmountCents;

  /**
   * Réserve 28b soldée (29c②) : dès qu'au moins un item de la checklist est
   * coché, un pack complet existe (membrane + cet accessoire, seuil de 13) —
   * le vrai `discountBps` remplace le 0 figé et traverse
   * `recalculatePdpBuyBoxAmounts` → `computeLineChargeFromUnitHt`, comme le
   * fera `/api/cart/resolve` pour le même pack. Total et €/m² de la buy-box
   * incluent donc la remise dès que le pack se forme.
   */
  const activeDiscountBps = isChecklistPackFormed(checkedAccessorySlugs) ? packDiscountBps : 0;

  const recalcParams = useMemo(
    () => ({
      config: calculatorConfig,
      membraneRollAreaM2,
      unitHtCents: activeUnitHtCents,
      unitAmountCents: activeUnitAmountCents,
      vatRateBps,
      shippingCents: initialResult.buyBox.shippingCents,
      discountBps: activeDiscountBps,
    }),
    [
      calculatorConfig,
      membraneRollAreaM2,
      activeUnitHtCents,
      activeUnitAmountCents,
      vatRateBps,
      initialResult.buyBox.shippingCents,
      activeDiscountBps,
    ],
  );

  // Bascule public → pro (29b③) OU pack (29c②) : dès que `recalcParams`
  // change (résolution du fetch authentifié, ou checklist cochée/décochée),
  // les 4 valeurs sont rejouées sur les DERNIÈRES cotes valides, sans
  // attendre une nouvelle frappe. Mise à jour sèche du prix déjà affiché
  // (D5) : aucune animation, le prix change, il ne se révèle pas.
  useEffect(() => {
    setResult(recalculatePdpBuyBoxAmounts(lastValidInputRef.current, recalcParams));
  }, [recalcParams]);

  function scheduleRecalculate(nextDimensions: Record<DimensionField, string>, nextStairType: StairType) {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const nextErrors: Partial<Record<DimensionField, string>> = {};
      const parsed: Partial<Record<DimensionField, number>> = {};

      (["length", "width", "depth"] as DimensionField[]).forEach((field) => {
        const raw = nextDimensions[field];
        const bounds = DIMENSION_BOUNDS[field];
        const value = parseDimension(raw);

        if (raw.trim() === "" || Number.isNaN(value)) {
          nextErrors[field] = "Valeur requise";
        } else if (value < bounds.min || value > bounds.max) {
          nextErrors[field] = `Entre ${bounds.min} et ${bounds.max} m`;
        } else {
          parsed[field] = value;
        }
      });

      setErrors(nextErrors);

      if (Object.keys(nextErrors).length > 0) return;

      const nextInput: CalculatorInput = {
        pool: {
          shape: "rectangle",
          dimensions: {
            length: parsed.length as number,
            width: parsed.width as number,
            depth: parsed.depth as number,
          },
        },
        stairType: nextStairType,
      };

      lastValidInputRef.current = nextInput;
      setResult(recalculatePdpBuyBoxAmounts(nextInput, recalcParams));
    }, RECALC_DEBOUNCE_MS);
  }

  function handleDimensionChange(field: DimensionField, value: string) {
    const next = { ...dimensions, [field]: value };
    setDimensions(next);
    scheduleRecalculate(next, stairType);
  }

  function handleStairChange(value: StairType) {
    setStairType(value);
    scheduleRecalculate(dimensions, value);
  }

  function advanceGuidedReveal() {
    setGuidedRevealCount((count) => Math.min(count + 1, 4));
  }

  const showField = (field: DimensionField) =>
    mode === "direct" || guidedRevealCount > ["length", "width", "depth"].indexOf(field);
  const showStairs = mode === "direct" || guidedRevealCount > 3;
  const isGuidedSequenceActive = mode === "guided" && guidedRevealCount <= 3;

  /**
   * Accessoires au tarif ACTIF (29c② partie A, correctif « PDP ≠ panier ») :
   * public par défaut, basculent en HT pro dès que `proPricing.accessoryProPricing`
   * résout ce slug — MÊME rôle que la membrane (`activeUnitHtCents`
   * ci-dessus), jamais un accessoire resté au public pendant que la membrane
   * est en pro. `vatRateBps`/`quantity`/`name`/`unit` ne dépendent jamais du
   * rôle, seul `unitHtCents` est substitué.
   */
  const activeChecklistAccessories = useMemo(
    () =>
      checklistAccessories.map((accessory) => {
        const proOverride = proPricing?.accessoryProPricing[accessory.slug];
        return proOverride ? { ...accessory, unitHtCents: proOverride.proUnitHtCents } : accessory;
      }),
    [checklistAccessories, proPricing],
  );

  /**
   * Aperçu du pack checklist (29c②) : MÊME chaîne que le panier
   * (`computeChecklistPackAmounts` → `discounts.ts` + `line-charge.ts`),
   * jamais recalculée à la main. Sert à la fois à l'affichage des prix par
   * item dans la checklist, au sous-total « Accessoires » du bloc prix ET à
   * construire les lignes envoyées à `addPackLines` — une seule source.
   */
  const packAmounts = useMemo(
    () =>
      computeChecklistPackAmounts(
        product.slug,
        activeUnitHtCents,
        result.membrane.quantity,
        vatRateBps,
        activeChecklistAccessories,
        checkedAccessorySlugs,
        packDiscountBps,
      ),
    [
      product.slug,
      activeUnitHtCents,
      result.membrane.quantity,
      vatRateBps,
      activeChecklistAccessories,
      checkedAccessorySlugs,
      packDiscountBps,
    ],
  );

  /**
   * Correctif invariant panier (29c②) : le sous-total accessoires cochés,
   * remise incluse, dérivé de `packAmounts` (jamais recalculé) —
   * `packAmounts.totalCents` = membrane + accessoires cochés, donc soustraire
   * la charge membrane (identique à `result.buyBox.membraneSubtotalCents`,
   * même fonction/mêmes arguments) isole exactement le sous-total accessoires.
   */
  const checkedAccessoriesTotals = {
    count: checkedAccessorySlugs.length,
    subtotalCents: packAmounts.totalCents - packAmounts.membraneCharge.lineTtcCents,
  };

  /**
   * Calculé UNE FOIS par rendu (29c①, `resolveAtcPanelValues`) : la buy-box
   * desktop, le drawer ATC mobile, la barre fixe et le bouton « Valider »
   * lisent tous `panelValues`, jamais `result`/`proPricing`/`packAmounts`
   * séparément — aucun second calcul, aucune divergence possible entre les
   * vues NI avec ce que le panier facturera (29c②, invariant panier).
   * Libellé toujours TTC (29c② partie A, correctif « le total ne bascule
   * jamais en HT ») : le rôle n'influence plus `totalLabel`.
   */
  const panelValues = resolveAtcPanelValues(result, checkedAccessoriesTotals);

  /** Query string du calculateur (08) capturée aux cotes courantes — sert au lien « recalculer » du panier (13), comme `calculator-wizard.tsx`. */
  const calculatorParamsString = serializeCalculatorState({
    input: {
      pool: {
        shape: "rectangle",
        dimensions: {
          length: parseDimension(dimensions.length),
          width: parseDimension(dimensions.width),
          depth: parseDimension(dimensions.depth),
        },
      },
      stairType,
    },
    membraneSlug: product.slug,
  }).toString();

  /** Lignes accessoires cochées (29c②), prêtes pour `addPackLines`/`AddToCartButton` — vide si la checklist n'a aucune sélection (comportement `addCatalogLine` inchangé). */
  const checkedAccessoryLines = checkedAccessorySlugs.map((slug) => {
    const accessory = checklistAccessories.find((item) => item.slug === slug);
    return { slug, quantity: accessory ? accessory.quantity : 1 };
  });

  const value: PdpContextValue = {
    product,
    checklistAccessories,
    packDiscountBps,
    mode,
    setMode,
    guidedRevealCount,
    advanceGuidedReveal,
    dimensions,
    stairType,
    errors,
    handleDimensionChange,
    handleStairChange,
    showField,
    showStairs,
    isGuidedSequenceActive,
    panelValues,
    packAmounts,
    calculatorParamsString,
    checkedAccessoryLines,
    checkedAccessorySlugs,
    toggleAccessory,
  };

  return <PdpContext.Provider value={value}>{children}</PdpContext.Provider>;
}

/** Lecteur du contexte PDP (29c②) — throw explicite si utilisé hors `PdpProvider` plutôt qu'un `undefined` silencieux. */
export function usePdpContext(): PdpContextValue {
  const context = useContext(PdpContext);
  if (!context) {
    throw new Error("usePdpContext doit être utilisé à l'intérieur d'un <PdpProvider>.");
  }
  return context;
}

export type { AtcPanelValues } from "./resolve-atc-panel-values";
export type { ChecklistPackAmounts } from "./checklist-pack-pricing";
