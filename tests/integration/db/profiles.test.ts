import { randomUUID } from "node:crypto";
import { beforeAll, expect, test } from "vitest";
import { anonClient, signUpUser } from "../support/db";

let named: Awaited<ReturnType<typeof signUpUser>>;
let bare: Awaited<ReturnType<typeof signUpUser>>;

beforeAll(async () => {
  named = await signUpUser({
    first_name: " Ada ",
    middle_name: "",
    last_name: "Lovelace",
  });
  bare = await signUpUser();
});

test("creates a trimmed profile from sign-up metadata", async () => {
  const { data, error } = await named.client.from("profiles").select("*");

  expect(error).toBeNull();
  expect(data).toHaveLength(1);
  expect(data![0]).toMatchObject({
    id: named.userId,
    first_name: "Ada",
    middle_name: null,
    last_name: "Lovelace",
  });
});

test("creates a profile without name metadata", async () => {
  const { data, error } = await bare.client.from("profiles").select("*");

  expect(error).toBeNull();
  expect(data).toHaveLength(1);
  expect(data![0]).toMatchObject({
    id: bare.userId,
    first_name: null,
    middle_name: null,
    last_name: null,
  });
});

test("rejects oversize name metadata at sign-up", async () => {
  const { data, error } = await anonClient().auth.signUp({
    email: `db+${randomUUID()}@example.com`,
    password: `${randomUUID()}-db`,
    options: { data: { first_name: "a".repeat(101) } },
  });

  expect(error).not.toBeNull();
  expect(data.session).toBeNull();
});

test("hides other users' profiles", async () => {
  const { data, error } = await named.client
    .from("profiles")
    .select()
    .eq("id", bare.userId);

  expect(error).toBeNull();
  expect(data).toEqual([]);
});

test("denies profile writes to authenticated", async () => {
  const inserted = await named.client.from("profiles").insert({ id: named.userId });
  expect(inserted.error?.code).toBe("42501");

  const updated = await named.client
    .from("profiles")
    .update({ first_name: "Changed" })
    .eq("id", named.userId);
  expect(updated.error?.code).toBe("42501");

  const deleted = await named.client
    .from("profiles")
    .delete()
    .eq("id", named.userId);
  expect(deleted.error?.code).toBe("42501");
});

test("denies anonymous profile access", async () => {
  const { error } = await anonClient().from("profiles").select();

  expect(error?.code).toBe("42501");
});
