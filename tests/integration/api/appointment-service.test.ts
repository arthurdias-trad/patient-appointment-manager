import { randomUUID } from "node:crypto";
import { beforeAll, expect, test, vi } from "vitest";
import {
  createAppointment,
  deleteAppointment,
  getAppointment,
  listAppointments,
  listProviders,
  updateAppointment,
} from "@/lib/appointments/service";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_IDS, anonClient, signUpUser, slot } from "../support/db";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

type TestUser = Awaited<ReturnType<typeof signUpUser>>;
type ServerClient = Awaited<ReturnType<typeof createClient>>;

let alice: TestUser;
let bob: TestUser;

beforeAll(async () => {
  alice = await signUpUser();
  bob = await signUpUser();
});

function as(user: { client: unknown }) {
  vi.mocked(createClient).mockResolvedValue(user.client as ServerClient);
}

function input(slotIndex: number) {
  return {
    providerId: PROVIDER_IDS[0],
    startsAt: slot(slotIndex).starts_at,
    reason: "Routine follow-up",
  };
}

function pastQuarterHour() {
  const step = 15 * 60 * 1000;
  return new Date(
    Math.floor((Date.now() - 60 * 60 * 1000) / step) * step,
  ).toISOString();
}

test("anonymous callers are rejected", async () => {
  as({ client: anonClient() });
  const id = randomUUID();
  const unauthenticated = { code: "unauthenticated" };

  await expect(listProviders()).rejects.toMatchObject(unauthenticated);
  await expect(listAppointments()).rejects.toMatchObject(unauthenticated);
  await expect(getAppointment(id)).rejects.toMatchObject(unauthenticated);
  await expect(createAppointment(input(0))).rejects.toMatchObject(
    unauthenticated,
  );
  await expect(
    updateAppointment(id, { reason: "Routine follow-up" }),
  ).rejects.toMatchObject(unauthenticated);
  await expect(deleteAppointment(id)).rejects.toMatchObject(unauthenticated);
});

test("lists the provider directory", async () => {
  as(alice);
  const providers = await listProviders();

  expect(providers).toHaveLength(5);
  const names = providers.map((p) => p.name);
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  for (const provider of providers) {
    expect(Object.keys(provider).sort()).toEqual(["id", "name", "specialty"]);
  }
});

test("creates with a computed end and a narrow DTO", async () => {
  as(alice);
  const result = await createAppointment({
    providerId: PROVIDER_IDS[0],
    startsAt: "2031-03-10T09:45:00+05:45",
    reason: "Routine follow-up",
  });

  expect(result).toMatchObject({
    startsAt: "2031-03-10T04:00:00.000Z",
    endsAt: "2031-03-10T04:30:00.000Z",
    status: "scheduled",
    reason: "Routine follow-up",
    provider: { id: PROVIDER_IDS[0] },
  });
  expect(Object.keys(result.provider).sort()).toEqual([
    "id",
    "name",
    "specialty",
  ]);
  expect(Object.keys(result).sort()).toEqual([
    "endsAt",
    "id",
    "provider",
    "reason",
    "startsAt",
    "status",
  ]);
});

test("create maps scheduling rules", async () => {
  as(alice);

  await expect(
    createAppointment({ ...input(10), startsAt: "2031-01-06T15:05:00Z" }),
  ).rejects.toMatchObject({
    code: "validation_failed",
    fieldErrors: { startsAt: expect.any(Array) },
  });
  await expect(
    createAppointment({ ...input(10), startsAt: pastQuarterHour() }),
  ).rejects.toMatchObject({
    code: "validation_failed",
    fieldErrors: { startsAt: ["Choose a time in the future."] },
  });
  await expect(
    createAppointment({ ...input(10), providerId: randomUUID() }),
  ).rejects.toMatchObject({
    code: "validation_failed",
    fieldErrors: { providerId: ["Choose a provider."] },
  });

  await createAppointment(input(10));
  await expect(
    createAppointment({ ...input(10), providerId: PROVIDER_IDS[1] }),
  ).rejects.toMatchObject({ code: "appointment_conflict" });

  await expect(
    createAppointment({ ...input(11), patientId: bob.userId }),
  ).rejects.toMatchObject({
    code: "validation_failed",
    formErrors: ["This request includes fields that can't be set."],
  });
});

test("lists own live appointments in start order", async () => {
  as(alice);
  const later = await createAppointment(input(3));
  const earlier = await createAppointment(input(2));
  const deleted = await createAppointment(input(4));
  await updateAppointment(later.id, { status: "cancelled" });
  await deleteAppointment(deleted.id);

  const ids = (await listAppointments()).map((a) => a.id);
  expect(ids).toContain(earlier.id);
  expect(ids).toContain(later.id);
  expect(ids.indexOf(earlier.id)).toBeLessThan(ids.indexOf(later.id));
  expect(ids).not.toContain(deleted.id);

  as(bob);
  const bobIds = (await listAppointments()).map((a) => a.id);
  expect(bobIds).not.toContain(earlier.id);
  expect(bobIds).not.toContain(later.id);
});

test("gets an own appointment by id", async () => {
  as(alice);
  const created = await createAppointment(input(6));

  await expect(getAppointment(created.id)).resolves.toEqual(created);
});

test("updates reschedule, edit, and cancel", async () => {
  as(alice);
  const created = await createAppointment(input(7));

  const moved = await updateAppointment(created.id, {
    startsAt: slot(5).starts_at,
  });
  expect(moved.startsAt).toBe(slot(5).starts_at);
  expect(moved.endsAt).toBe(slot(5).ends_at);

  const edited = await updateAppointment(created.id, {
    reason: "Annual check-up",
  });
  expect(edited.reason).toBe("Annual check-up");

  const switched = await updateAppointment(created.id, {
    providerId: PROVIDER_IDS[1],
  });
  expect(switched.provider.id).toBe(PROVIDER_IDS[1]);

  const cancelled = await updateAppointment(created.id, {
    status: "cancelled",
  });
  expect(cancelled.status).toBe("cancelled");

  await expect(
    updateAppointment(created.id, { reason: "Routine follow-up" }),
  ).rejects.toMatchObject({ code: "appointment_cancelled" });
  await expect(
    updateAppointment(created.id, { status: "cancelled" }),
  ).rejects.toMatchObject({ code: "appointment_cancelled" });

  const live = await createAppointment(input(8));
  await expect(
    updateAppointment(live.id, { startsAt: pastQuarterHour() }),
  ).rejects.toMatchObject({
    code: "validation_failed",
    fieldErrors: { startsAt: ["Choose a time in the future."] },
  });
  await expect(getAppointment(live.id)).resolves.toEqual(live);
});

test("deletes through the RPC", async () => {
  as(alice);
  const created = await createAppointment(input(9));

  await expect(deleteAppointment(created.id)).resolves.toBeUndefined();
  const notFound = { code: "not_found" };
  await expect(getAppointment(created.id)).rejects.toMatchObject(notFound);
  await expect(
    updateAppointment(created.id, { reason: "Routine follow-up" }),
  ).rejects.toMatchObject(notFound);
  await expect(deleteAppointment(created.id)).rejects.toMatchObject(notFound);

  const cancelled = await createAppointment(input(12));
  await updateAppointment(cancelled.id, { status: "cancelled" });
  await expect(deleteAppointment(cancelled.id)).resolves.toBeUndefined();
});

test("another user's appointment is indistinguishable from a missing one", async () => {
  as(alice);
  const owned = await createAppointment(input(13));

  as(bob);
  const shape = (e: unknown) => {
    const { code, message, fieldErrors, formErrors } = e as Record<
      string,
      unknown
    >;
    return { code, message, fieldErrors, formErrors };
  };
  const attempts = [
    (id: string) => getAppointment(id),
    (id: string) => updateAppointment(id, { reason: "x" }),
    (id: string) => deleteAppointment(id),
  ];
  for (const attempt of attempts) {
    const foreign = await attempt(owned.id).catch(shape);
    const missing = await attempt(randomUUID()).catch(shape);
    expect(foreign).toMatchObject({ code: "not_found" });
    expect(foreign).toEqual(missing);
  }
  await expect(getAppointment("not-a-uuid")).rejects.toMatchObject({
    code: "not_found",
  });

  as(alice);
  await expect(getAppointment(owned.id)).resolves.toEqual(owned);
});
