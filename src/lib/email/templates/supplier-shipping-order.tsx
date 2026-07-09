import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

export interface SupplierShippingOrderLine {
  sku: string;
  name: string;
  quantity: number;
}

export interface SupplierShippingOrderEmailProps {
  orderId: string;
  createdAt: string;
  lines: SupplierShippingOrderLine[];
  shippingAddressLines: string[];
}

/**
 * Ordre d'expédition APF (17) — destinataire interne, mention fournisseur
 * autorisée. Corps sobre, sans prix (blind shipping, le BL PDF joint non plus).
 */
export function SupplierShippingOrderEmail({
  orderId,
  createdAt,
  lines,
  shippingAddressLines,
}: SupplierShippingOrderEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Nouvelle commande à préparer — ${orderId}`}</Preview>
      <Body style={{ backgroundColor: "#f6f6f6", fontFamily: "Arial, Helvetica, sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "8px" }}>
          <Heading as="h2">Commande {orderId}</Heading>
          <Text>Date : {dateFormatter.format(new Date(createdAt))}</Text>
          <Hr />
          <Section>
            <Text style={{ fontWeight: "bold" }}>Adresse de livraison</Text>
            {shippingAddressLines.map((line, index) => (
              <Text key={index} style={{ margin: "2px 0" }}>
                {line}
              </Text>
            ))}
          </Section>
          <Hr />
          <Section>
            <Text style={{ fontWeight: "bold" }}>Lignes</Text>
            {lines.map((line, index) => (
              <Text key={`${line.sku}-${index}`} style={{ margin: "2px 0" }}>
                {line.sku} — {line.name} × {line.quantity}
              </Text>
            ))}
          </Section>
          <Hr />
          <Text style={{ fontWeight: "bold", color: "#c0392b" }}>
            Ne joindre aucune facture APF au colis (blind shipping).
          </Text>
          <Text>Bon de livraison joint à cet email.</Text>
        </Container>
      </Body>
    </Html>
  );
}
