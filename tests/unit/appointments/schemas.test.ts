// @vitest-environment node
import {
  appointmentEndsAt,
  appointmentIdSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
} from "@/lib/appointments/schemas";
import { PROVIDER_IDS } from "@/tests/integration/support/db";
import { describe, expect, test } from "vitest";
import { z } from "zod";

const valid = {
  providerId: PROVIDER_IDS[0],
  startsAt: "2031-01-06T15:45:00Z",
  reason: "  Routine follow-up  ",
};

const offGrid =
  "Choose a start time on the hour or at 15, 30, or 45 minutes past.";
const unknownKeys = "This request includes fields that can't be set.";
const notObject = "The appointment details couldn't be read. Please try again.";

function flatten(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  expect(result.success).toBe(false);
  if (result.success) throw new Error("expected failure");
  return z.flattenError(result.error) as {
    formErrors: string[];
    fieldErrors: Record<string, string[] | undefined>;
  };
}

describe("createAppointmentSchema", () => {
  test("accepts a valid booking and trims the reason", () => {
    const result = createAppointmentSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data?.reason).toBe("Routine follow-up");
  });

  test("accepts quarter-hour starts in any offset or with a zero fraction", () => {
    for (const startsAt of [
      "2031-03-10T09:45:00+05:45",
      "2031-01-06T15:00:00.000Z",
      "2031-01-06T15:00:00.000000Z",
    ]) {
      expect(
        createAppointmentSchema.safeParse({ ...valid, startsAt }).success,
      ).toBe(true);
    }
  });

  test("rejects invalid or off-grid start times", () => {
    for (const startsAt of ["2031-01-06T15:00:00", "soon"]) {
      expect(
        flatten(createAppointmentSchema, { ...valid, startsAt }).fieldErrors
          .startsAt,
      ).toEqual(["Enter a valid date and time."]);
    }
    for (const startsAt of [
      "2031-01-06T15:07:00Z",
      "2031-01-06T15:00:30Z",
      "2031-01-06T15:00:00.001Z",
    ]) {
      expect(
        flatten(createAppointmentSchema, { ...valid, startsAt }).fieldErrors
          .startsAt,
      ).toEqual([offGrid]);
    }
  });

  test("rejects nonzero fractions that millisecond parsing would hide", () => {
    for (const startsAt of [
      "2031-01-06T15:00:00.000001Z",
      "2031-01-06T15:00:00.0000001Z",
    ]) {
      expect(
        flatten(createAppointmentSchema, { ...valid, startsAt }).fieldErrors
          .startsAt,
      ).toEqual([offGrid]);
    }
  });

  test("counts reason length like Postgres", () => {
    expect(
      createAppointmentSchema.safeParse({ ...valid, reason: "😀".repeat(500) })
        .success,
    ).toBe(true);
    for (const reason of ["😀".repeat(501), "a".repeat(501)]) {
      expect(
        flatten(createAppointmentSchema, { ...valid, reason }).fieldErrors
          .reason,
      ).toEqual(["Reason cannot exceed 500 characters."]);
    }
    expect(
      flatten(createAppointmentSchema, { ...valid, reason: "   " }).fieldErrors
        .reason,
    ).toEqual(["Enter a reason for the appointment."]);
  });

  test("gives each missing field its own message", () => {
    expect(flatten(createAppointmentSchema, {}).fieldErrors).toEqual({
      providerId: ["Choose a provider."],
      startsAt: ["Enter a valid date and time."],
      reason: ["Enter a reason for the appointment."],
    });
  });

  test("rejects protected or unknown fields as a form error", () => {
    for (const extra of [
      { patientId: PROVIDER_IDS[1] },
      { endsAt: "2031-01-06T16:15:00Z" },
      { status: "cancelled" },
    ]) {
      const errors = flatten(createAppointmentSchema, { ...valid, ...extra });
      expect(errors.formErrors).toEqual([unknownKeys]);
      expect(errors.fieldErrors).toEqual({});
    }
    const errors = flatten(updateAppointmentSchema, {
      patientId: PROVIDER_IDS[1],
    });
    expect(errors.formErrors).toEqual([unknownKeys]);
    expect(errors.fieldErrors).toEqual({});
  });

  test("rejects non-object bodies as a form error", () => {
    for (const schema of [createAppointmentSchema, updateAppointmentSchema]) {
      for (const input of [null, [], "x"]) {
        const errors = flatten(schema, input);
        expect(errors.formErrors).toEqual([notObject]);
        expect(errors.fieldErrors).toEqual({});
      }
    }
  });
});

describe("updateAppointmentSchema", () => {
  test("update accepts one field or cancellation alone", () => {
    for (const input of [
      { reason: "Check-in" },
      { startsAt: "2031-01-06T16:00:00Z" },
      { status: "cancelled" },
    ]) {
      expect(updateAppointmentSchema.safeParse(input).success).toBe(true);
    }
    expect(flatten(updateAppointmentSchema, {}).formErrors).toEqual([
      "No changes to save.",
    ]);
    expect(
      flatten(updateAppointmentSchema, { status: "cancelled", reason: "x" })
        .formErrors,
    ).toEqual(["Changes and cancellation must be submitted separately."]);
    expect(
      flatten(updateAppointmentSchema, { status: "scheduled" }).fieldErrors
        .status,
    ).toEqual(["Appointments can only be cancelled."]);
  });
});

test("appointmentEndsAt adds 30 minutes in UTC", () => {
  expect(appointmentEndsAt("2031-03-10T09:45:00+05:45")).toBe(
    "2031-03-10T04:30:00.000Z",
  );
});

test("appointment ids must be UUIDs", () => {
  expect(appointmentIdSchema.safeParse(PROVIDER_IDS[0]).success).toBe(true);
  expect(appointmentIdSchema.safeParse("not-a-uuid").success).toBe(false);
});
