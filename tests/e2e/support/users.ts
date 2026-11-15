import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";
import type { Database } from "../../../lib/supabase/database.types";

export async function createTestUser(): Promise<{
  email: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
}> {
  const user = {
    email: `e2e+${randomUUID()}@example.com`,
    password: randomBytes(16).toString("base64url"),
    firstName: "E2E",
    lastName: "Patient",
  };

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { error } = await supabase.auth.signUp({
    email: user.email,
    password: user.password,
    options: {
      data: { first_name: user.firstName, last_name: user.lastName },
    },
  });
  if (error) {
    throw new Error(`Test user sign-up failed: ${error.code ?? error.status}`);
  }

  return user;
}
