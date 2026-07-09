/**
 * Sérialisation JSON-LD sûre pour injection dans le HTML (18) : le JSON-LD
 * est un `<script>` inline, donc soumis aux mêmes règles d'échappement que
 * tout autre contenu inséré via `dangerouslySetInnerHTML` — `<`/`>` doivent
 * être neutralisés pour empêcher une fermeture prématurée de la balise
 * `<script>` (ou pire, l'injection d'un tag) si une donnée catalogue venait
 * à contenir ces caractères.
 */
function escapeJsonLd(json: string): string {
  return json.replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

/** Rendu UNIQUEMENT côté serveur (Server Component) — jamais depuis un Client Component (18). */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: escapeJsonLd(JSON.stringify(data)) }}
    />
  );
}
