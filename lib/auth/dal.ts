import { LOGIN_PATH } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";
import type { JwtPayload } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";
import "server-only";

export type CurrentUser = {
  id: string;
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const client = await createClient();
  const { data, error } = await client.auth.getClaims();

  if (error || !data?.claims) redirect(LOGIN_PATH);

  const userId = data.claims.sub;
  const email = data.claims.email;

  if (!userId || !email) redirect(LOGIN_PATH);

  return {
    id: userId,
    email,
    ...getUserNames(data.claims),
  };
});

const getUserNames = (claims: JwtPayload) => {
  const firstName = claims.user_metadata?.first_name;
  const middleName = claims.user_metadata?.middle_name;
  const lastName = claims.user_metadata?.last_name;
  return {
    firstName: typeof firstName === "string" ? firstName : "",
    middleName:
      typeof middleName === "string" && middleName.trim()
        ? middleName.trim()
        : undefined,
    lastName: typeof lastName === "string" ? lastName : "",
  };
};
