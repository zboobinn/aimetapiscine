"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updatePasswordAction, type UpdatePasswordState } from "./actions";

const initialState: UpdatePasswordState = {};

export function MettreAJourMotDePasseForm() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, initialState);

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-6">
      <Input
        label="Nouveau mot de passe"
        name="password"
        type="password"
        hint="8 caractères minimum"
        minLength={8}
        required
      />
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button variant="primary" size="lg" type="submit" disabled={pending}>
        {pending ? "Mise à jour…" : "Mettre à jour le mot de passe"}
      </Button>
    </form>
  );
}
