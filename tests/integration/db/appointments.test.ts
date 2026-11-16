import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, test } from "vitest";
import { PROVIDER_IDS, anonClient, signUpUser, slot } from "../support/db";

type TestUser = Awaited<ReturnType<typeof signUpUser>>;

let alice: TestUser;
let bob: TestUser;

beforeAll(async () => {
  alice = await signUpUser();
  bob = await signUpUser();
});

function insertAppointment(
  user: TestUser,
  slotIndex: number,
  overrides: Record<string, unknown> = {},
) {
  return user.client
    .from("appointments")
    .insert({
      provider_id: PROVIDER_IDS[0],
      ...slot(slotIndex),
      reason: "Routine follow-up",
      ...overrides,
    })
    .select()
    .single();
}

async function createAppointment(user: TestUser, slotIndex: number) {
  const { data, error } = await insertAppointment(user, slotIndex);
  expect(error).toBeNull();
  return data!;
}

function pastSlot() {
  const start = Date.now() - 60 * 60 * 1000;
  return {
    starts_at: new Date(start).toISOString(),
    ends_at: new Date(start + 30 * 60 * 1000).toISOString(),
  };
}

function slotWithDuration(slotIndex: number, minutes: number) {
  const { starts_at } = slot(slotIndex);
  return {
    starts_at,
    ends_at: new Date(
      Date.parse(starts_at) + minutes * 60 * 1000,
    ).toISOString(),
  };
}

test("owner inserts with patient_id defaulted and status scheduled", async () => {
  const row = await createAppointment(alice, 0);

  expect(row.patient_id).toBe(alice.userId);
  expect(row.status).toBe("scheduled");
  expect(row.deleted_at).toBeNull();
});

test("owner reads own appointments", async () => {
  const row = await createAppointment(alice, 1);

  const { data, error } = await alice.client
    .from("appointments")
    .select()
    .eq("id", row.id);

  expect(error).toBeNull();
  expect(data).toEqual([row]);
});

test("owner updates reason and time", async () => {
  const row = await createAppointment(alice, 2);
  const moved = slot(3);

  const { data, error } = await alice.client
    .from("appointments")
    .update({ reason: "Routine check-in", ...moved })
    .eq("id", row.id)
    .select()
    .single();

  expect(error).toBeNull();
  expect(data!.reason).toBe("Routine check-in");
  expect(Date.parse(data!.starts_at)).toBe(Date.parse(moved.starts_at));
  expect(Date.parse(data!.ends_at)).toBe(Date.parse(moved.ends_at));
});

test("owner cancels", async () => {
  const row = await createAppointment(alice, 4);

  const { data, error } = await alice.client
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", row.id)
    .select()
    .single();

  expect(error).toBeNull();
  expect(data!.status).toBe("cancelled");
});

test("other user cannot read", async () => {
  const aliceRow = await createAppointment(alice, 5);

  const { data, error } = await bob.client
    .from("appointments")
    .select()
    .eq("id", aliceRow.id);

  expect(error).toBeNull();
  expect(data).toEqual([]);
});

test("cross-user update matches nonexistent id", async () => {
  const aliceRow = await createAppointment(alice, 6);

  const crossUser = await bob.client
    .from("appointments")
    .update({ reason: "Patient takeover" })
    .eq("id", aliceRow.id)
    .select();
  const missing = await bob.client
    .from("appointments")
    .update({ reason: "Patient takeover" })
    .eq("id", randomUUID())
    .select();

  expect({ data: crossUser.data, error: crossUser.error }).toEqual({
    data: [],
    error: null,
  });
  expect({ data: missing.data, error: missing.error }).toEqual({
    data: [],
    error: null,
  });

  const { data } = await alice.client
    .from("appointments")
    .select()
    .eq("id", aliceRow.id)
    .single();
  expect(data).toEqual(aliceRow);
});

test("cannot insert for another user", async () => {
  const { error } = await insertAppointment(alice, 7, {
    patient_id: bob.userId,
  });
  expect(error?.code).toBe("42501");

  const { data } = await bob.client
    .from("appointments")
    .select("id")
    .eq("starts_at", slot(7).starts_at);
  expect(data).toEqual([]);
});

test("cannot reassign or stamp protected columns", async () => {
  const row = await createAppointment(alice, 8);

  for (const change of [
    { patient_id: bob.userId },
    { deleted_at: new Date().toISOString() },
    { id: randomUUID() },
    { created_at: new Date().toISOString() },
    { updated_at: new Date().toISOString() },
  ]) {
    const { error } = await alice.client
      .from("appointments")
      .update(change)
      .eq("id", row.id);
    expect(error?.code).toBe("42501");
  }

  const { error } = await insertAppointment(alice, 9, { status: "cancelled" });
  expect(error?.code).toBe("42501");
});

test("hard delete is denied", async () => {
  const row = await createAppointment(alice, 10);

  const { error } = await alice.client
    .from("appointments")
    .delete()
    .eq("id", row.id);
  expect(error?.code).toBe("42501");

  const { data } = await alice.client
    .from("appointments")
    .select("id")
    .eq("id", row.id);
  expect(data).toEqual([{ id: row.id }]);
});

test("anonymous select, insert, update, delete are denied", async () => {
  const appointments = () => anonClient().from("appointments");
  const id = randomUUID();

  const selected = await appointments().select();
  expect(selected.error?.code).toBe("42501");

  const inserted = await appointments().insert({
    provider_id: PROVIDER_IDS[0],
    ...slot(11),
    reason: "Routine follow-up",
  });
  expect(inserted.error?.code).toBe("42501");

  const updated = await appointments()
    .update({ reason: "Another routine follow-up" })
    .eq("id", id);
  expect(updated.error?.code).toBe("42501");

  const deleted = await appointments().delete().eq("id", id);
  expect(deleted.error?.code).toBe("42501");
});

test("rejects durations other than 30 minutes", async () => {
  for (const [slotIndex, minutes] of [
    [12, 29],
    [13, 31],
  ]) {
    const { error } = await alice.client.from("appointments").insert({
      provider_id: PROVIDER_IDS[0],
      ...slotWithDuration(slotIndex, minutes),
      reason: "Routine follow-up",
    });
    expect(error?.code).toBe("23514");
  }
});

test("accepts offset timestamps", async () => {
  const { error } = await alice.client
    .from("appointments")
    .insert({
      provider_id: PROVIDER_IDS[0],
      starts_at: "2031-03-09T09:00:00-05:00",
      ends_at: "2031-03-09T14:30:00Z",
      reason: "Synthetic follow-up",
    })
    .select()
    .single();

  expect(error).toBeNull();
});

test("rejects starts off the 15-minute grid", async () => {
  const base = Date.parse(slot(40).starts_at);
  const shifted = (ms: number) => ({
    starts_at: new Date(base + ms).toISOString(),
    ends_at: new Date(base + ms + 30 * 60 * 1000).toISOString(),
  });

  for (const times of [
    shifted(7 * 60 * 1000),
    shifted(30 * 1000),
    shifted(1),
    {
      starts_at: slot(40).starts_at.replace(".000Z", ".000001Z"),
      ends_at: slot(40).ends_at.replace(".000Z", ".000001Z"),
    },
  ]) {
    const { error } = await insertAppointment(alice, 40, times);
    expect(error?.code).toBe("23514");
  }
});

test("accepts quarter-hour starts in any offset", async () => {
  const start = Date.parse(slot(41).starts_at) + 45 * 60 * 1000;

  for (const times of [
    {
      starts_at: new Date(start).toISOString(),
      ends_at: new Date(start + 30 * 60 * 1000).toISOString(),
    },
    {
      starts_at: "2031-03-10T09:45:00+05:45",
      ends_at: "2031-03-10T04:30:00Z",
    },
  ]) {
    const { error } = await insertAppointment(alice, 41, times);
    expect(error).toBeNull();
  }
});

test("rejects blank, untrimmed, oversize reasons", async () => {
  for (const [slotIndex, reason] of [
    [14, ""],
    [15, " x"],
    [16, "a".repeat(501)],
  ] as const) {
    const { error } = await insertAppointment(alice, slotIndex, { reason });
    expect(error?.code).toBe("23514");
  }

  const { error } = await insertAppointment(alice, 17, {
    reason: "a".repeat(500),
  });
  expect(error).toBeNull();
});

test("rejects unknown status", async () => {
  const row = await createAppointment(alice, 18);

  const { error } = await alice.client
    .from("appointments")
    .update({ status: "past" })
    .eq("id", row.id);

  expect(error?.code).toBe("23514");
});

test("rejects unknown provider", async () => {
  const { error } = await insertAppointment(alice, 19, {
    provider_id: randomUUID(),
  });

  expect(error?.code).toBe("23503");
});

test("rejects overlapping scheduled appointments", async () => {
  await createAppointment(alice, 20);
  const start = Date.parse(slot(20).starts_at) + 15 * 60 * 1000;

  const { error } = await insertAppointment(alice, 20, {
    starts_at: new Date(start).toISOString(),
    ends_at: new Date(start + 30 * 60 * 1000).toISOString(),
  });

  expect(error?.code).toBe("23P01");
});

test("allows back-to-back", async () => {
  const first = await createAppointment(alice, 21);
  const start = Date.parse(first.ends_at);

  const { error } = await insertAppointment(alice, 21, {
    starts_at: new Date(start).toISOString(),
    ends_at: new Date(start + 30 * 60 * 1000).toISOString(),
  });

  expect(error).toBeNull();
});

test("cancelled slot is reusable", async () => {
  const original = await createAppointment(alice, 22);
  const cancelled = await alice.client
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", original.id);
  expect(cancelled.error).toBeNull();

  await createAppointment(alice, 22);
});

test("other users' bookings never conflict", async () => {
  await createAppointment(alice, 23);

  const { error } = await insertAppointment(bob, 23);

  expect(error).toBeNull();
});

test("rejects booking in the past", async () => {
  const { error } = await alice.client.from("appointments").insert({
    provider_id: PROVIDER_IDS[0],
    ...pastSlot(),
    reason: "Synthetic follow-up",
  });

  expect(error?.code).toBe("P0001");
});

test("rejects rescheduling into the past", async () => {
  const row = await createAppointment(alice, 24);

  const { error } = await alice.client
    .from("appointments")
    .update(pastSlot())
    .eq("id", row.id);
  expect(error?.code).toBe("P0001");

  const { data } = await alice.client
    .from("appointments")
    .select()
    .eq("id", row.id)
    .single();
  expect(data).toEqual(row);
});

test("cancelled appointment cannot be edited or reinstated", async () => {
  const row = await createAppointment(alice, 25);
  const cancelled = await alice.client
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", row.id);
  expect(cancelled.error).toBeNull();

  for (const change of [
    { reason: "Synthetic check-in" },
    { status: "scheduled" },
  ]) {
    const { error } = await alice.client
      .from("appointments")
      .update(change)
      .eq("id", row.id);
    expect(error?.code).toBe("P0001");
  }
});

test("updated_at starts at created_at and advances on update", async () => {
  const row = await createAppointment(alice, 26);
  expect(row.updated_at).toBe(row.created_at);

  const { data, error } = await alice.client
    .from("appointments")
    .update({ reason: "Synthetic check-in" })
    .eq("id", row.id)
    .select()
    .single();

  expect(error).toBeNull();
  expect(Date.parse(data!.updated_at)).toBeGreaterThan(
    Date.parse(row.updated_at),
  );
});

describe("soft delete", () => {
  function deleteAppointment(user: TestUser, id: string) {
    return user.client.rpc("delete_appointment", { appointment_id: id });
  }

  test("owner soft-deletes own appointment", async () => {
    const row = await createAppointment(alice, 27);

    const deleted = await deleteAppointment(alice, row.id);
    expect({ data: deleted.data, error: deleted.error }).toEqual({
      data: true,
      error: null,
    });

    const selected = await alice.client
      .from("appointments")
      .select()
      .eq("id", row.id);
    expect({ data: selected.data, error: selected.error }).toEqual({
      data: [],
      error: null,
    });

    const updated = await alice.client
      .from("appointments")
      .update({ reason: "Routine check-in" })
      .eq("id", row.id)
      .select();
    expect({ data: updated.data, error: updated.error }).toEqual({
      data: [],
      error: null,
    });

    const again = await deleteAppointment(alice, row.id);
    expect({ data: again.data, error: again.error }).toEqual({
      data: false,
      error: null,
    });
  });

  test("deleted appointment cannot be restored or edited", async () => {
    const row = await createAppointment(alice, 28);
    const deleted = await deleteAppointment(alice, row.id);
    expect(deleted.data).toBe(true);

    const { error } = await alice.client
      .from("appointments")
      .update({ deleted_at: null })
      .eq("id", row.id);
    expect(error?.code).toBe("42501");
  });

  test("cross-user delete returns false like a missing id", async () => {
    const aliceRow = await createAppointment(alice, 29);

    const crossUser = await deleteAppointment(bob, aliceRow.id);
    const missing = await deleteAppointment(bob, randomUUID());

    expect({ data: crossUser.data, error: crossUser.error }).toEqual({
      data: false,
      error: null,
    });
    expect({ data: missing.data, error: missing.error }).toEqual({
      data: false,
      error: null,
    });

    const { data } = await alice.client
      .from("appointments")
      .select()
      .eq("id", aliceRow.id)
      .single();
    expect(data).toEqual(aliceRow);
  });

  test("anonymous delete is denied", async () => {
    const { error } = await anonClient().rpc("delete_appointment", {
      appointment_id: randomUUID(),
    });

    expect(error?.code).toBe("42501");
  });

  test("deleted slot is reusable", async () => {
    const original = await createAppointment(alice, 30);
    const deleted = await deleteAppointment(alice, original.id);
    expect(deleted.data).toBe(true);

    const { error } = await insertAppointment(alice, 30);

    expect(error).toBeNull();
  });

  test("deleting a cancelled appointment works", async () => {
    const row = await createAppointment(alice, 31);
    const cancelled = await alice.client
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", row.id);
    expect(cancelled.error).toBeNull();

    const { data, error } = await deleteAppointment(alice, row.id);

    expect({ data, error }).toEqual({ data: true, error: null });
  });
});
