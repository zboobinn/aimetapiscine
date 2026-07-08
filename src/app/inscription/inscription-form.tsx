"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUpAction, type SignUpState } from "./actions";

const initialState: SignUpState = {};

export function InscriptionForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);

  if (state.success) {
    return (
      <p className="rounded-lg border border-border bg-surface p-6 text-ink">
        Compte créé. Un e-mail de confirmation vient de vous être envoyé —
        cliquez sur le lien qu&apos;il contient pour activer votre compte et
        pouvoir vous connecter.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-6">
      <Input label="Adresse e-mail" name="email" type="email" placeholder="vous@exemple.fr" required />
      <Input
        label="Mot de passe"
        name="password"
        type="password"
        hint="8 caractères minimum"
        minLength={8}
        required
      />
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button variant="primary" size="lg" type="submit" disabled={pending}>
        {pending ? "Création en cours…" : "Créer mon compte"}
      </Button>
    </form>
  );
}
