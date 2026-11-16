// @vitest-environment node
import { toApiError } from "@/lib/appointments/database-errors";
import { afterEach, describe, expect, test, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("toApiError", () => {
  test.each([
    ["23503", "validation_failed", { providerId: ["Choose a provider."] }],
    [
      "AP001",
      "validation_failed",
      { startsAt: ["Choose a time in the future."] },
    ],
    ["23514", "validation_failed", undefined],
    ["22007", "validation_failed", undefined],
    ["22008", "validation_failed", undefined],
    ["23P01", "appointment_conflict", undefined],
    ["AP002", "appointment_started", undefined],
    ["AP003", "appointment_cancelled", undefined],
  ])(
    "maps each database error to the API contract (%s)",
    (code, apiCode, fieldErrors) => {
      const error = toApiError({ code });
      expect(error.code).toBe(apiCode);
      expect(error.fieldErrors).toEqual(fieldErrors);
    },
  );

  test("unmapped database errors log only the code", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const databaseError = {
      code: "XX000",
      message: "Routine follow-up",
      details: "Routine follow-up",
    };
    const error = toApiError(databaseError);
    expect(error.code).toBe("internal_error");
    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).toContain("XX000");
    expect(logged).not.toContain("Routine follow-up");
  });
});
