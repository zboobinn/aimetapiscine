import { QuestionIcon } from "./home-icons";
import { HOME_RADIUS, HOME_SHADOW } from "./home-look";
import { withRemakeGuaranteeAnswer, type FaqItem } from "./faq-data";

export interface FaqProps {
  items: FaqItem[];
}

/**
 * FAQ inline (30 §09) — `<details>` natif écrit directement ICI (pas le
 * `CollapsibleSection` partagé de la spec 28 : le style de carte de cette
 * passe est scopé à la route, on ne touche pas la primitive partagée avec la
 * PDP). Contenu dans le DOM au rendu serveur (indexable), jamais d'onglets.
 * `name="home-faq"` : accordéon exclusif propre à cette page.
 *
 * Accès LITTÉRAL à `NEXT_PUBLIC_REMAKE_GUARANTEE` (piège 28 : jamais via un
 * accesseur/Zod, sinon Next n'inline pas la valeur). `page.tsx` fait la même
 * lecture littérale indépendamment pour le JSON-LD `FAQPage` — les deux sont
 * inlinées à la même valeur au build, texte affiché et texte balisé ne
 * peuvent donc jamais diverger.
 */
export function Faq({ items }: FaqProps) {
  const resolvedItems = withRemakeGuaranteeAnswer(items, process.env.NEXT_PUBLIC_REMAKE_GUARANTEE);

  return (
    <section
      aria-label="Questions fréquentes"
      className="mx-auto w-full px-4 py-[var(--space-block)] sm:px-6"
      style={{ maxWidth: "var(--page-max)" }}
    >
      <h2 className="font-display" style={{ fontSize: "var(--step-2)" }}>
        Questions fréquentes
      </h2>

      <div className="mt-8 flex flex-col gap-4">
        {resolvedItems.map((item) => (
          <details
            key={item.question}
            name="home-faq"
            className="overflow-hidden border"
            style={{
              borderColor: "var(--coping)",
              borderRadius: HOME_RADIUS,
              boxShadow: HOME_SHADOW,
              background: "var(--surface)",
            }}
          >
            <summary
              className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 font-display"
              style={{ fontSize: "var(--step-1)", color: "var(--ink)" }}
            >
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{ background: "color-mix(in oklab, var(--turquoise) 14%, white)", color: "var(--turquoise)" }}
              >
                <QuestionIcon />
              </span>
              {item.question}
            </summary>
            <div className="px-5 pb-5 pl-15" style={{ color: "var(--ink-60)", lineHeight: "var(--lh-body)" }}>
              <p>{item.answer}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
