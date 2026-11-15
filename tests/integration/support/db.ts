import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const PROVIDER_IDS = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
  "00000000-0000-4000-8000-000000000004",
  "00000000-0000-4000-8000-000000000005",
] as const;

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

const SLOT_BASE = Date.parse("2031-01-06T15:00:00Z");
const HOUR_MS = 60 * 60 * 1000;
const SLOT_MS = 30 * 60 * 1000;

export function slot(n: number) {
  const start = SLOT_BASE + n * HOUR_MS;
  return {
    starts_at: new Date(start).toISOString(),
    ends_at: new Date(start + SLOT_MS).toISOString(),
  };
}
