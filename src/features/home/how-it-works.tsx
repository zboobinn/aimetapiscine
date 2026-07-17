interface Step {
  number: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    number: "01",
    title: "Mesurez",
    body: "Renseignez les cotes de votre bassin dans le calculateur. (copie provisoire — OK)",
  },
  {
    number: "02",
    title: "Recevez",
    body: "Votre pack prêt à poser — membrane et accessoires calculés au m² près. (copie provisoire — OK)",
  },
  {
    number: "03",
    title: "Posez",
    body: "Vous-même ou avec un poseur professionnel, selon votre chantier. (copie provisoire — OK)",
  },
  {
    number: "04",
    title: "Profitez",
    body: "Un bassin étanche, sans mauvaise surprise de cote. (copie provisoire — OK)",
  },
];

/**
 * Comment ça marche (30 §05) — 4 étapes numérotées, AUCUNE animation. La
 * numérotation encode une vraie séquence temporelle (mesurer → recevoir →
 * poser → profiter) : légitime ici, nulle part ailleurs sur le site (28,
 * « la numérotation n'est pas un motif décoratif »). Chiffres en mono (28,
 * règle stricte : mono réservé aux nombres/métadonnées).
 */
export function HowItWorks() {
  return (
    <section
      aria-label="Comment ça marche"
      className="mx-auto w-full px-4 py-[var(--space-block)] sm:px-6"
      style={{ maxWidth: "var(--page-max)" }}
    >
      <h2 className="font-display" style={{ fontSize: "var(--step-2)" }}>
        Comment ça marche
      </h2>

      <ol className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step) => (
          <li key={step.number} className="flex flex-col gap-2">
            <span
              className="font-mono"
              style={{ fontSize: "var(--step-1)", color: "var(--deep-blue)" }}
            >
              {step.number}
            </span>
            <h3 className="font-display" style={{ fontSize: "var(--step-1)" }}>
              {step.title}
            </h3>
            <p style={{ color: "var(--ink-60)", lineHeight: "var(--lh-body)" }}>{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
