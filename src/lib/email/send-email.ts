import "server-only";

import type { ReactElement } from "react";

import { getEmailEnv } from "@/lib/env";
import { getResendClient } from "./client";

export interface EmailAttachment {
  filename: string;
  content: Buffer;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  react: ReactElement;
  attachments?: EmailAttachment[];
}

/**
 * Point d'envoi UNIQUE (17) — aucun autre module n'appelle Resend
 * directement. Applique `EMAIL_OVERRIDE_TO` : tant qu'aucun domaine de
 * production n'est vérifié dans Resend (prévu septembre, decisions.md),
 * l'API n'autorise l'envoi qu'à l'adresse du compte Resend — si
 * `EMAIL_OVERRIDE_TO` est définie, TOUT part vers cette adresse avec le
 * destinataire réel préfixé dans le sujet. Sur le modèle du domaine `insee` :
 * sans `RESEND_API_KEY`, l'envoi est un no-op loggé, jamais une exception —
 * le webhook Stripe ne doit jamais échouer à cause d'un email (23).
 */
export async function sendEmail({ to, subject, react, attachments }: SendEmailInput): Promise<void> {
  const client = getResendClient();

  if (!client) {
    console.warn(`[email] RESEND_API_KEY absente — envoi ignoré (no-op) : "${subject}" → ${to}`);
    return;
  }

  const env = getEmailEnv();
  const finalTo = env.EMAIL_OVERRIDE_TO ?? to;
  const finalSubject = env.EMAIL_OVERRIDE_TO ? `[dev → ${to}] ${subject}` : subject;

  const { error } = await client.emails.send({
    from: env.EMAIL_FROM,
    to: finalTo,
    subject: finalSubject,
    react,
    attachments: attachments?.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content,
    })),
  });

  if (error) {
    throw new Error(`Envoi email échoué ("${subject}" → ${to}) : ${error.message}`);
  }
}
