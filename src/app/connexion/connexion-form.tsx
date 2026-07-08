"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInAction, type SignInState } from "./actions";

const initialState: SignInState = {};

export function ConnexionForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-6">
      <Input label="Adresse e-mail" name="email" type="email" placeholder="vous@exemple.fr" required />
      <Input label="Mot de passe" name="password" type="password" required />
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button variant="primary" size="lg" type="submit" disabled={pending}>
        {pending ? "Connexion en cours…" : "Se connecter"}
      </Button>
    </form>
  );
}
