import { beforeAll, expect, test } from "vitest";
import { PROVIDER_IDS, anonClient, signUpUser } from "../support/db";

let user: Awaited<ReturnType<typeof signUpUser>>;

beforeAll(async () => {
  user = await signUpUser();
});

test("lists the seeded providers to authenticated users", async () => {
  const { data, error } = await user.client
    .from("providers")
    .select("id, name, specialty")
    .order("id");

  expect(error).toBeNull();
  expect(data!.map((provider) => provider.id)).toEqual([...PROVIDER_IDS]);
  for (const provider of data!) {
    expect(provider.name).toEqual(expect.any(String));
    expect(provider.name.trim()).toBeTruthy();
    expect(provider.specialty).toEqual(expect.any(String));
    expect(provider.specialty.trim()).toBeTruthy();
  }
});

test("denies provider writes to authenticated", async () => {
  const inserted = await user.client
    .from("providers")
    .insert({ name: "Dr. Test Provider", specialty: "Testing" });
  expect(inserted.error?.code).toBe("42501");

  const updated = await user.client
    .from("providers")
    .update({ name: "Changed" })
    .eq("id", PROVIDER_IDS[0]);
  expect(updated.error?.code).toBe("42501");

  const deleted = await user.client
    .from("providers")
    .delete()
    .eq("id", PROVIDER_IDS[0]);
  expect(deleted.error?.code).toBe("42501");
});

test("denies anonymous provider access", async () => {
  const { error } = await anonClient().from("providers").select();

  expect(error?.code).toBe("42501");
});
