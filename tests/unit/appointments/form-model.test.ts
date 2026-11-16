// @vitest-environment node
import {
  EMPTY_VALUES,
  prepareCreate,
  preparePatch,
  valuesFromAppointment,
  type AppointmentFormValues,
} from "@/app/(protected)/appointments/_lib/form-model";
import type { Appointment } from "@/lib/appointments/types";
import { expect, test } from "vitest";

const PROVIDER_ID = "00000000-0000-4000-8000-000000000001";

const valid: AppointmentFormValues = {
  providerId: PROVIDER_ID,
  date: "2032-01-05",
  time: "09:00",
  reason: "  Follow-up  ",
};

test("prepareCreate reports every missing field", () => {
  expect(prepareCreate(EMPTY_VALUES)).toEqual({
    errors: {
      fieldErrors: {
        providerId: ["Choose a provider."],
        date: ["Choose a date."],
        time: ["Choose a start time."],
        reason: ["Enter a reason for the appointment."],
      },
      formErrors: [],
      signInRequired: false,
    },
  });
});

test("prepareCreate builds a create body in clinic time", () => {
  expect(prepareCreate(valid)).toEqual({
    body: {
      providerId: PROVIDER_ID,
      startsAt: "2032-01-05T14:00:00.000Z",
      reason: "Follow-up",
    },
  });
});

test("prepareCreate limits the reason by code points", () => {
  const tooLong = prepareCreate({ ...valid, reason: "😀".repeat(501) });
  expect("errors" in tooLong && tooLong.errors.fieldErrors.reason).toEqual([
    "Reason cannot exceed 500 characters.",
  ]);
  const atLimit = prepareCreate({ ...valid, reason: "😀".repeat(500) });
  expect(atLimit).toHaveProperty("body");
});

test("rejects impossible calendar dates", () => {
  for (const date of ["2032-02-30", "2032-1-5"]) {
    const result = prepareCreate({ ...valid, date });
    expect("errors" in result && result.errors.fieldErrors).toEqual({
      date: ["Enter a valid date."],
    });
  }
});

test("prepareCreate rejects times outside the booking window", () => {
  const result = prepareCreate({ ...valid, time: "07:00" });
  expect("errors" in result && result.errors.fieldErrors).toEqual({
    time: ["Choose a start time between 8:15 AM and 4:30 PM Eastern Time."],
  });
});

test("preparePatch refuses an unchanged form", () => {
  expect(preparePatch(valid, valid)).toEqual({
    errors: {
      fieldErrors: {},
      formErrors: ["No changes to save."],
      signInRequired: false,
    },
  });
});

test("preparePatch sends only a changed reason", () => {
  expect(preparePatch(valid, { ...valid, reason: " New reason " })).toEqual({
    body: { reason: "New reason" },
  });
});

test("preparePatch requires an in-window time for off-window starts", () => {
  const appointment: Appointment = {
    id: "a",
    provider: { id: PROVIDER_ID, name: "Dr. Test", specialty: "General" },
    startsAt: "2032-01-05T12:00:00.000Z",
    endsAt: "2032-01-05T12:30:00.000Z",
    reason: "Follow-up",
    status: "scheduled",
  };
  const original = valuesFromAppointment(appointment);
  expect(original.time).toBe("");
  const result = preparePatch(original, { ...original, reason: "Other" });
  expect("errors" in result && result.errors.fieldErrors).toEqual({
    time: ["Choose a start time."],
  });
});

test("preparePatch sends a new start when the time changes", () => {
  expect(preparePatch(valid, { ...valid, time: "10:00" })).toEqual({
    body: { startsAt: "2032-01-05T15:00:00.000Z" },
  });
});
