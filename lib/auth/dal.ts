import { LOGIN_PATH } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import "server-only";

export type CurrentUser = {
  id: string;
  email: string;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const client = await createClient();
  const { data, error } = await client.auth.getClaims();

  if (error || !data?.claims) redirect(LOGIN_PATH);

  const userId = data.claims.sub;
  const email = data.claims.email;

  if (!userId || !email) redirect(LOGIN_PATH);

  return { id: userId, email };
});
