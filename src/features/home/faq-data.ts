import { SHIPPING_DELAY_LABEL } from "@/lib/shipping/delay-label";

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * FAQ homepage (30 §09) — source UNIQUE, consommée à la fois par le rendu
 * (`Faq`, `<details>` natif) et par le JSON-LD `FAQPage` (page.tsx) : le
 * texte affiché et le texte balisé ne peuvent jamais diverger, par
 * construction (Google exige une correspondance exacte). Copie éditoriale
 * provisoire — sauf le délai de livraison, qui reprend `SHIPPING_DELAY_LABEL`
 * (12), donnée réelle déjà affichée ailleurs sur le site (reassurance-bar,
 * 30 §02).
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
    question: "Puis-je retourner ma membrane si je me suis trompé de mesure ?",
    answer:
      "Des conditions de retour existent — consultez notre page Livraison & retours avant de commander. (copie provisoire — OK)",
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
