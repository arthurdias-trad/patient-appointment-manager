"use server";

import {
  isPwnedPassword,
  PwnedPasswordCheckUnavailableError,
} from "@/lib/auth/pwned-password";
import {
  DEFAULT_AUTHENTICATED_PATH,
  LOGIN_PATH,
  safeNextPath,
} from "@/lib/auth/redirects";
import { signInSchema, signUpSchema } from "@/lib/auth/schemas";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

export type AuthFormState = {
  formError?: string;
  fieldErrors?: Partial<
    Record<
      | "firstName"
      | "middleName"
      | "lastName"
      | "email"
      | "password"
      | "confirmPassword",
      string[]
    >
  >;
  values?: {
    email?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
  };
};

export async function signUp(
  _prev: AuthFormState,
  form: FormData,
): Promise<AuthFormState> {
  const formData = Object.fromEntries(form);
  const result = signUpSchema.safeParse(formData);
  const values = {
    email: typeof formData.email === "string" ? formData.email : "",
    firstName: typeof formData.firstName === "string" ? formData.firstName : "",
    middleName:
      typeof formData.middleName === "string" ? formData.middleName : "",
    lastName: typeof formData.lastName === "string" ? formData.lastName : "",
  };
  if (!result.success) {
    return {
      fieldErrors: z.flattenError(result.error).fieldErrors,
      values,
    };
  }

  try {
    const isPasswordPwned = await isPwnedPassword(result.data.password);
    if (isPasswordPwned)
      return {
        fieldErrors: {
          password: [
            "This password has appeared in a data breach. Choose a different one.",
          ],
        },
        values,
      };
  } catch (e) {
    if (e instanceof PwnedPasswordCheckUnavailableError)
      return {
        formError:
          "We couldn't verify your password right now. Try again in a moment.",
        values,
      };
    return { formError: "Something went wrong. Try again.", values };
  }

  const client = await createClient();
  const { data, error } = await client.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: {
        first_name: result.data.firstName,
        middle_name: result.data.middleName,
        last_name: result.data.lastName,
      },
    },
  });

  if (error) {
    switch (error.code) {
      case "over_request_rate_limit":
        return {
          formError: "Too many attempts. Wait a few minutes and try again.",
          values,
        };
      case "weak_password":
        return {
          fieldErrors: { password: ["Choose a stronger password."] },
          values,
        };
      default:
        return {
          formError:
            "We couldn't create your account. Try again, or sign in if you already have an account.",
          values,
        };
    }
  }

  if (!data.session)
    return {
      formError:
        "We couldn't create your account. Try again, or sign in if you already have an account.",
      values,
    };

  redirect(DEFAULT_AUTHENTICATED_PATH);
}

export async function signIn(
  _prev: AuthFormState,
  form: FormData,
): Promise<AuthFormState> {
  const formData = Object.fromEntries(form);
  const result = signInSchema.safeParse(formData);
  const values = {
    email: typeof formData.email === "string" ? formData.email : "",
  };

  if (!result.success) {
    const fieldErrors = z.flattenError(result.error).fieldErrors;
    if (fieldErrors.password) {
      return { formError: "Invalid email or password.", values };
    } else {
      return { fieldErrors, values };
    }
  }

  const client = await createClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  });
  if (error) {
    switch (error.code) {
      case "invalid_credentials":
        return { formError: "Invalid email or password.", values };
      case "over_request_rate_limit":
        return {
          formError: "Too many attempts. Wait a few minutes and try again.",
          values,
        };
      default:
        return { formError: "Something went wrong. Try again.", values };
    }
  }

  if (!data.session)
    return { formError: "Something went wrong. Try again.", values };

  const redirectTo =
    typeof formData.next === "string" ? formData.next : undefined;

  redirect(safeNextPath(redirectTo));
}

export async function signOut(): Promise<void> {
  const client = await createClient();
  const { error } = await client.auth.signOut({ scope: "local" });

  if (error) {
    throw new Error("Sign out failed.");
  }

  redirect(LOGIN_PATH);
}
