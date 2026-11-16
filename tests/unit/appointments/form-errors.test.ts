// @vitest-environment node
import {
  NETWORK_ERROR_MESSAGE,
} from "@/app/(protected)/appointments/_lib/api-client";
import { toFormErrors } from "@/app/(protected)/appointments/_lib/form-errors";
import { expect, test } from "vitest";

const message = "Check the appointment details and try again.";

test("maps startsAt field errors to the time field", () => {
  expect(
    toFormErrors(422, {
      error: {
        code: "validation_failed",
        message,
        fieldErrors: { startsAt: ["Choose a time in the future."] },
      },
    }),
  ).toEqual({
    fieldErrors: { time: ["Choose a time in the future."] },
    formErrors: [],
    signInRequired: false,
  });
});

test("keeps form errors", () => {
  expect(
    toFormErrors(422, {
      error: {
        code: "validation_failed",
        message,
        formErrors: ["No changes to save."],
      },
    }).formErrors,
  ).toEqual(["No changes to save."]);
});

test("shows a conflict as a form error", () => {
  const conflict = "You already have an appointment at that time.";
  expect(
    toFormErrors(409, {
      error: { code: "appointment_conflict", message: conflict },
    }),
  ).toEqual({ fieldErrors: {}, formErrors: [conflict], signInRequired: false });
});

test("flags sign-in for 401 responses", () => {
  expect(
    toFormErrors(401, {
      error: { code: "unauthenticated", message: "Sign in to continue." },
    }),
  ).toEqual({
    fieldErrors: {},
    formErrors: ["Sign in to continue."],
    signInRequired: true,
  });
  expect(toFormErrors(401, null).signInRequired).toBe(true);
});

test("falls back to messages when there is no body", () => {
  expect(toFormErrors(0, null).formErrors).toEqual([NETWORK_ERROR_MESSAGE]);
  expect(toFormErrors(500, null).formErrors).toEqual([
    "Something went wrong. Try again.",
  ]);
});

test("uses the message when a 422 has no details", () => {
  expect(
    toFormErrors(422, { error: { code: "validation_failed", message } })
      .formErrors,
  ).toEqual([message]);
});
