import "server-only";

import fs from "node:fs";
import path from "node:path";

/**
 * pdfkit résout ses 14 polices standard (Helvetica...) via des fichiers
 * .afm internes, chargés à un chemin construit dynamiquement (`name +
 * '.afm'`) à l'intérieur de son propre code (`pdfkit/js/font/afm.js`).
 * Cette résolution casse en environnement Next.js/Vercel :
 * - en dev (Turbopack, Next 16) : le bundling du module ne préserve pas le
 *   dossier `data/` attendu à côté du fichier JS de pdfkit → ENOENT.
 * - en build de prod (Vercel) : le file tracing (nft) ne peut PAS détecter
 *   ces lectures fs car le nom de fichier est une chaîne construite au
 *   runtime (pas un littéral statique), donc les .afm ne sont jamais
 *   inclus dans le bundle de la fonction serverless → même ENOENT.
 *
 * On évite ce mécanisme entièrement : jamais d'appel à `.font("Helvetica")`
 * dans ce projet. À la place, on enregistre nos propres polices (PT Sans,
 * licence OFL, `src/lib/pdf/fonts/`) via `doc.registerFont(name, buffer)`.
 * Le chemin de lecture ici est un littéral statique dans NOTRE code (pas
 * dans une dépendance), donc :
 * - en dev, `process.cwd()` pointe la racine du projet, Turbopack ne
 *   transforme pas nos appels `fs`/`path` runtime ;
 * - en prod, ce littéral est détecté par le file tracing Vercel (et
 *   doublement garanti par `outputFileTracingIncludes`, next.config.ts).
 */

const FONTS_DIR = path.join(process.cwd(), "src/lib/pdf/fonts");

export const PDF_FONT_REGULAR = "PTSans";
export const PDF_FONT_BOLD = "PTSans-Bold";

let regularFont: Buffer | undefined;
let boldFont: Buffer | undefined;

function loadFont(filename: string): Buffer {
  return fs.readFileSync(path.join(FONTS_DIR, filename));
}

/** À appeler juste après `new PDFDocument(...)`, avant tout `.font(...)`. */
export function registerPdfFonts(doc: PDFKit.PDFDocument): void {
  regularFont ??= loadFont("PTSans-Regular.ttf");
  boldFont ??= loadFont("PTSans-Bold.ttf");

  doc.registerFont(PDF_FONT_REGULAR, regularFont);
  doc.registerFont(PDF_FONT_BOLD, boldFont);
  doc.font(PDF_FONT_REGULAR);
}
