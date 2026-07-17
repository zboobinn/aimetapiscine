import { CollapsibleSection } from "@/components/nuancier";
import type { FaqItem } from "./faq-data";

export interface FaqProps {
  items: FaqItem[];
}

/**
 * FAQ inline (30 §09) — `<details>` natif via `CollapsibleSection` (28),
 * jamais d'onglets. Contenu dans le DOM au rendu serveur (indexable). Aucune
 * animation. `name="home-faq"` : accordéon exclusif propre à cette page,
 * distinct de `name="pdp"` (29).
 */
export function Faq({ items }: FaqProps) {
  return (
    <section
      aria-label="Questions fréquentes"
      className="mx-auto w-full px-4 py-[var(--space-block)] sm:px-6"
      style={{ maxWidth: "var(--page-max)" }}
    >
      <h2 className="font-display" style={{ fontSize: "var(--step-2)" }}>
        Questions fréquentes
      </h2>

      <div className="mt-8">
        {items.map((item) => (
          <CollapsibleSection key={item.question} title={item.question} name="home-faq">
            <p>{item.answer}</p>
          </CollapsibleSection>
        ))}
      </div>
    </section>
  );
}
