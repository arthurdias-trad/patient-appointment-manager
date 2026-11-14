"use client";

import { useActionState } from "react";
import { signIn, type AuthFormState } from "../actions";
import { InputField } from "../input-field";

const initialState: AuthFormState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, initialState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      {state.formError && (
        <p role="alert" className="text-sm text-red-600">
          {state.formError}
        </p>
      )}
      <InputField
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        errors={state.fieldErrors?.email}
      />
      <InputField
        id="password"
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        required
        errors={state.fieldErrors?.password}
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
      >
        Sign in
      </button>
    </form>
  );
}
