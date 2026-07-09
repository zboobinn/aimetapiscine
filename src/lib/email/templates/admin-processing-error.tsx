import { Body, Container, Head, Heading, Hr, Html, Preview, Text } from "@react-email/components";

export interface AdminProcessingErrorEmailProps {
  orderId: string;
  sessionId: string;
  message: string;
}

/**
 * Alerte admin (17) : commande payée mais bloquée (documents ou emails en
 * échec, `orders.processing_error`). Pas d'idempotence voulue — une alerte à
 * chaque échec/rejeu, volume V1 trop faible pour justifier un anti-spam.
 */
export function AdminProcessingErrorEmail({ orderId, sessionId, message }: AdminProcessingErrorEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Commande ${orderId} bloquée — intervention requise`}</Preview>
      <Body style={{ backgroundColor: "#f6f6f6", fontFamily: "Arial, Helvetica, sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "8px" }}>
          <Heading as="h2" style={{ color: "#c0392b" }}>
            Commande bloquée
          </Heading>
          <Text>Commande : {orderId}</Text>
          <Text>Session Stripe : {sessionId}</Text>
          <Hr />
          <Text style={{ fontWeight: "bold" }}>Erreur</Text>
          <Text>{message}</Text>
          <Hr />
          <Text>
            Le paiement est encaissé (statut PAID conservé). Rejeu possible via{" "}
            <code>stripe events resend {sessionId}</code>, ou intervention manuelle dans Supabase
            Studio.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
