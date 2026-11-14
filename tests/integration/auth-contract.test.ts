import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { expect, test } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

function newClient() {
  return createClient(url, publishableKey, {
    auth: { persistSession: false },
  });
}

function newCredentials() {
  return {
    email: `contract+${randomUUID()}@example.com`,
    password: `${randomUUID()}-contract`,
  };
}

test("sign-up returns a session immediately and stores structured names", async () => {
  const { data, error } = await newClient().auth.signUp({
    ...newCredentials(),
    options: {
      data: { first_name: "Test", middle_name: "Middle", last_name: "Patient" },
    },
  });

  expect(error).toBeNull();
  expect(data.session).not.toBeNull();
  expect(data.user?.user_metadata).toMatchObject({
    first_name: "Test",
    middle_name: "Middle",
    last_name: "Patient",
  });
});

test("Auth rejects passwords under 15 characters even when called directly", async () => {
  const { error } = await newClient().auth.signUp({
    email: newCredentials().email,
    password: "a".repeat(14),
  });

  expect(error?.code).toBe("weak_password");
});

test("local sign-out keeps the user's other sessions alive", async () => {
  const credentials = newCredentials();
  const { error: signUpError } = await newClient().auth.signUp(credentials);
  expect(signUpError).toBeNull();

  const a = newClient();
  const b = newClient();
  const { data: signedInA } = await a.auth.signInWithPassword(credentials);
  const { error: signInBError } = await b.auth.signInWithPassword(credentials);
  expect(signInBError).toBeNull();
  const aRefresh = signedInA.session!.refresh_token;

  await a.auth.signOut({ scope: "local" });

  const revoked = await a.auth.refreshSession({ refresh_token: aRefresh });
  expect(revoked.error).not.toBeNull();

  const alive = await b.auth.refreshSession();
  expect(alive.error).toBeNull();
  expect(alive.data.session).not.toBeNull();
});
