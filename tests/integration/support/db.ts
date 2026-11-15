import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export function anonClient() {
  return createClient(url, publishableKey, {
    auth: { persistSession: false },
  });
}

export async function signUpUser(metadata?: Record<string, string>) {
  const client = anonClient();
  const { data, error } = await client.auth.signUp({
    email: `db+${randomUUID()}@example.com`,
    password: `${randomUUID()}-db`,
    options: metadata ? { data: metadata } : undefined,
  });

  if (error || !data.user) {
    throw new Error(`sign-up failed: ${error?.code ?? "no user returned"}`);
  }

  return { client, userId: data.user.id };
}
