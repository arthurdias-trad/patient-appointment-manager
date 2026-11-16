"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { controlClassName, Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { signIn, type AuthFormState } from "../actions";

const initialState: AuthFormState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, initialState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      {state.formError && <Alert tone="error">{state.formError}</Alert>}
      <Field
        id="email"
        label="Email address"
        required
        errors={state.fieldErrors?.email}
      >
        {(aria) => (
          <input
            {...aria}
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={state.values?.email}
            className={controlClassName}
          />
        )}
      </Field>
      <Field
        id="password"
        label="Password"
        required
        errors={state.fieldErrors?.password}
      >
        {(aria) => (
          <PasswordInput
            {...aria}
            name="password"
            autoComplete="current-password"
          />
        )}
      </Field>
      <Button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        className="mt-4 w-full"
      >
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
