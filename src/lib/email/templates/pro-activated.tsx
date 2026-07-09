import { Body, Container, Head, Heading, Html, Link, Preview, Text } from "@react-email/components";

export interface ProActivatedEmailProps {
  accountUrl: string;
}

/** Compte pro activé (14/17) : activation 100 % manuelle en Studio, cet email ne fait qu'en informer. */
export function ProActivatedEmail({ accountUrl }: ProActivatedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Votre compte professionnel est activé</Preview>
      <Body style={{ backgroundColor: "#f6f6f6", fontFamily: "Arial, Helvetica, sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "8px" }}>
          <Heading as="h2" style={{ color: "#0e4d64" }}>
            Votre compte professionnel est activé
          </Heading>
          <Text>
            Votre statut professionnel a été vérifié. Vous bénéficiez désormais des tarifs HT
            remisés sur l&apos;ensemble du catalogue.
          </Text>
          <Text>
            Accédez à <Link href={accountUrl}>votre espace client</Link> pour commander.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
