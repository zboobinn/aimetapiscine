import { getRemakeGuaranteeCopy } from "@/features/pdp/remake-guarantee-copy";
import { SHIPPING_DELAY_LABEL } from "@/lib/shipping/delay-label";

export interface FaqItem {
  question: string;
  answer: string;
}

/** Question dont la réponse dépend de `NEXT_PUBLIC_REMAKE_GUARANTEE` (30 §09, A1). */
export const REMAKE_GUARANTEE_QUESTION =
  "Puis-je retourner ma membrane si je me suis trompé de mesure ?";

/**
 * Réutilise la copie canonique de la PDP (`getRemakeGuaranteeCopy`, 29 §8) —
 * une seule formulation de la garantie de reprise sur tout le site, jamais
 * une deuxième version qui pourrait diverger. Fonction pure : prend la
 * valeur déjà lue par l'appelant, ne lit jamais `process.env` elle-même.
 */
function resolveRemakeGuaranteeAnswer(rawValue: string | undefined): string {
  const copy = getRemakeGuaranteeCopy(rawValue);
  if (rawValue === "material-only" || rawValue === "full") {
    return `${copy} Contactez notre service client pour connaître les modalités.`;
  }
  return `${copy} Vérifiez bien vos cotes avant de valider.`;
}

/**
 * Applique la réponse résolue à l'item `REMAKE_GUARANTEE_QUESTION` — appelée
 * indépendamment par `Faq` (rendu) et `page.tsx` (JSON-LD `FAQPage`), chacun
 * avec sa PROPRE lecture LITTÉRALE de `NEXT_PUBLIC_REMAKE_GUARANTEE` (piège
 * 28) : les deux lectures littérales du même nom de variable sont inlinées à
 * la même valeur au build, donc texte affiché et texte balisé ne peuvent
 * jamais diverger.
 */
export function withRemakeGuaranteeAnswer(
  items: FaqItem[],
  rawValue: string | undefined,
): FaqItem[] {
  return items.map((item) =>
    item.question === REMAKE_GUARANTEE_QUESTION
      ? { ...item, answer: resolveRemakeGuaranteeAnswer(rawValue) }
      : item,
  );
}

/**
 * FAQ homepage (30 §09) — source UNIQUE, consommée à la fois par le rendu
 * (`Faq`, `<details>` natif) et par le JSON-LD `FAQPage` (page.tsx) : le
 * texte affiché et le texte balisé ne peuvent jamais diverger, par
 * construction (Google exige une correspondance exacte). Copie éditoriale
 * provisoire — sauf le délai de livraison, qui reprend `SHIPPING_DELAY_LABEL`
 * (12), même donnée réelle (5 à 10 jours ouvrés) que la forme courte affichée
 * dans le bandeau de réassurance (reassurance-bar, 30 §02), reformulée pour
 * tenir sur une ligne.
 */
export const HOME_FAQ_ITEMS: FaqItem[] = [
  {
    question: "Comment savoir combien de membrane il me faut ?",
    answer:
      "Utilisez le calculateur : renseignez les cotes de votre bassin, il calcule la quantité de rouleaux et les accessoires nécessaires. (copie provisoire — OK)",
  },
  {
    question: "Quel est le délai de livraison ?",
    answer: SHIPPING_DELAY_LABEL,
  },
  {
    question: "Livrez-vous en Corse ?",
    answer: "Oui, la Corse est desservie, avec un léger surcoût de transport. (copie provisoire — OK)",
  },
  {
    // Réponse réelle substituée par `withRemakeGuaranteeAnswer` (Faq + JSON-LD) —
    // ce texte n'est qu'un repli si jamais l'un des deux appelants oublie
    // d'appeler la fonction (ne devrait jamais s'afficher tel quel).
    question: REMAKE_GUARANTEE_QUESTION,
    answer: resolveRemakeGuaranteeAnswer(undefined),
  },
  {
    question: "Proposez-vous des tarifs professionnels ?",
    answer:
      "Oui, un compte pro avec SIRET vérifié donne accès à des tarifs HT remisés. (copie provisoire — OK)",
  },
  {
    question: "Comment se passe le paiement ?",
    answer: "Le paiement s'effectue en ligne par carte bancaire, de façon sécurisée. (copie provisoire — OK)",
  },
];
