"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordResetAction, type ResetRequestState } from "./actions";

const initialState: ResetRequestState = {};

export function MotDePasseOublieForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialState);

  if (state.submitted) {
    return (
      <p className="rounded-lg border border-border bg-surface p-6 text-ink">
        Si un compte existe pour cette adresse, un e-mail contenant un lien de
        réinitialisation vient de vous être envoyé.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-6">
      <Input label="Adresse e-mail" name="email" type="email" placeholder="vous@exemple.fr" required />
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button variant="primary" size="lg" type="submit" disabled={pending}>
        {pending ? "Envoi en cours…" : "Envoyer le lien de réinitialisation"}
      </Button>
    </form>
  );
}
