"use client";

import { useActionState } from "react";
import { signUp, type AuthFormState } from "../actions";
import { InputField } from "../input-field";

const initialState: AuthFormState = {};

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, initialState);

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.formError && (
        <p role="alert" className="text-sm text-red-600">
          {state.formError}
        </p>
      )}
      <InputField
        id="firstName"
        name="firstName"
        label="First name"
        autoComplete="given-name"
        required
        defaultValue={state.values?.firstName}
        errors={state.fieldErrors?.firstName}
      />
      <InputField
        id="middleName"
        name="middleName"
        label="Middle name"
        autoComplete="additional-name"
        defaultValue={state.values?.middleName}
        errors={state.fieldErrors?.middleName}
      />
      <InputField
        id="lastName"
        name="lastName"
        label="Last name"
        autoComplete="family-name"
        required
        defaultValue={state.values?.lastName}
        errors={state.fieldErrors?.lastName}
      />
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
        autoComplete="new-password"
        minLength={15}
        required
        errors={state.fieldErrors?.password}
      />
      <InputField
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        label="Confirm password"
        autoComplete="new-password"
        required
        errors={state.fieldErrors?.confirmPassword}
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
      >
        Create account
      </button>
    </form>
  );
}
