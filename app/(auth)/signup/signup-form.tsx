"use client";

import { useActionState, useId } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { controlClassName, Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { signUp, type AuthFormState } from "../actions";

const initialState: AuthFormState = {};

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, initialState);
  const idPrefix = useId();

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.formError && <Alert tone="error">{state.formError}</Alert>}
      <Field
        id={`${idPrefix}firstName`}
        label="First name"
        required
        errors={state.fieldErrors?.firstName}
      >
        {(aria) => (
          <input
            {...aria}
            name="firstName"
            autoComplete="given-name"
            defaultValue={state.values?.firstName}
            className={controlClassName}
          />
        )}
      </Field>
      <Field
        id={`${idPrefix}middleName`}
        label="Middle name (optional)"
        errors={state.fieldErrors?.middleName}
      >
        {(aria) => (
          <input
            {...aria}
            name="middleName"
            autoComplete="additional-name"
            defaultValue={state.values?.middleName}
            className={controlClassName}
          />
        )}
      </Field>
      <Field
        id={`${idPrefix}lastName`}
        label="Last name"
        required
        errors={state.fieldErrors?.lastName}
      >
        {(aria) => (
          <input
            {...aria}
            name="lastName"
            autoComplete="family-name"
            defaultValue={state.values?.lastName}
            className={controlClassName}
          />
        )}
      </Field>
      <Field
        id={`${idPrefix}email`}
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
        id={`${idPrefix}password`}
        label="Password"
        hint="Use at least 15 characters."
        required
        errors={state.fieldErrors?.password}
      >
        {(aria) => (
          <PasswordInput
            {...aria}
            name="password"
            autoComplete="new-password"
            minLength={15}
          />
        )}
      </Field>
      <Field
        id={`${idPrefix}confirmPassword`}
        label="Confirm password"
        required
        errors={state.fieldErrors?.confirmPassword}
      >
        {(aria) => (
          <PasswordInput
            {...aria}
            name="confirmPassword"
            autoComplete="new-password"
          />
        )}
      </Field>
      <Button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        className="mt-4 w-full"
      >
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
