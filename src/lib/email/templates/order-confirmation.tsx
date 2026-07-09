import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from "@react-email/components";

const moneyFormatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

function formatCents(cents: number): string {
  return moneyFormatter.format(cents / 100);
}

export interface OrderConfirmationLine {
  name: string;
  quantity: number;
  lineTtcCents: number;
}

export interface OrderConfirmationEmailProps {
  orderId: string;
  createdAt: string;
  lines: OrderConfirmationLine[];
  shippingFeeCents: number;
  totalTtcCents: number;
  accountOrdersUrl: string;
}

/**
 * Confirmation client (17) : PAS de mention fournisseur, PAS d'URL signée
 * dans le corps (les URL Storage signées expirent — 11) ; le lien pointe
 * vers l'espace client qui régénère une URL fraîche derrière l'authentification.
 */
export function OrderConfirmationEmail({
  orderId,
  createdAt,
  lines,
  shippingFeeCents,
  totalTtcCents,
  accountOrdersUrl,
}: OrderConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Votre commande est confirmée</Preview>
      <Body style={{ backgroundColor: "#f6f6f6", fontFamily: "Arial, Helvetica, sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "8px" }}>
          <Heading as="h2" style={{ color: "#0e4d64" }}>
            Merci pour votre commande
          </Heading>
          <Text>
            Nous avons bien reçu votre paiement pour la commande n° {orderId} du{" "}
            {dateFormatter.format(new Date(createdAt))}.
          </Text>
          <Hr />
          <Section>
            {lines.map((line, index) => (
              <Text key={`${line.name}-${index}`} style={{ margin: "4px 0" }}>
                {line.name} × {line.quantity} — {formatCents(line.lineTtcCents)}
              </Text>
            ))}
            {shippingFeeCents > 0 && (
              <Text style={{ margin: "4px 0" }}>Livraison — {formatCents(shippingFeeCents)}</Text>
            )}
          </Section>
          <Hr />
          <Text style={{ fontWeight: "bold" }}>Total payé : {formatCents(totalTtcCents)}</Text>
          <Text>Votre facture est jointe à cet email.</Text>
          <Text>
            Suivez l&apos;avancement de votre commande depuis{" "}
            <Link href={accountOrdersUrl}>votre espace client</Link>.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
