"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validateSiret } from "@/lib/siret/validate";
import { submitProSignupAction, type ProSignupState } from "./actions";

const initialState: ProSignupState = {};

export function ProSignupForm() {
  const [state, formAction, pending] = useActionState(submitProSignupAction, initialState);
  // Retour immédiat côté client (14) : la Server Action revalide de toute
  // façon le format (23), cette erreur locale n'est qu'un confort de saisie.
  const [siretClientError, setSiretClientError] = useState<string>();

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Input label="Raison sociale" name="companyName" placeholder="Ma société SARL" required />
      <Input
        label="SIRET"
        name="siret"
        placeholder="123 456 789 00012"
        hint="14 chiffres"
        required
        error={siretClientError}
        onBlur={(event) => {
          const value = event.currentTarget.value.trim();
          if (!value) {
            setSiretClientError(undefined);
            return;
          }
          const { valid, error } = validateSiret(value);
          setSiretClientError(valid ? undefined : error);
        }}
        onChange={() => setSiretClientError(undefined)}
      />
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button variant="primary" size="lg" type="submit" disabled={pending} className="self-start">
        {pending ? "Envoi en cours…" : "Envoyer ma demande"}
      </Button>
    </form>
  );
}
