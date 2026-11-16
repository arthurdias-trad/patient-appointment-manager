// @vitest-environment node
import {
  clinicToday,
  formatAppointmentDate,
  formatAppointmentTimeRange,
} from "@/app/(protected)/appointments/_lib/clinic-time";
import { expect, test } from "vitest";

const plain = (value: string) => value.replace(/\s/g, " ");

test("formatAppointmentDate shows the clinic date", () => {
  expect(plain(formatAppointmentDate("2032-01-05T14:00:00.000Z"))).toBe(
    "Monday, Jan 5, 2032",
  );
});

test("formatAppointmentTimeRange shows clinic wall time", () => {
  expect(
    plain(
      formatAppointmentTimeRange(
        "2032-01-05T14:00:00.000Z",
        "2032-01-05T14:30:00.000Z",
      ),
    ),
  ).toBe("9:00 – 9:30 AM");
  expect(
    plain(
      formatAppointmentTimeRange(
        "2032-01-05T16:45:00.000Z",
        "2032-01-05T17:15:00.000Z",
      ),
    ),
  ).toBe("11:45 AM – 12:15 PM");
  expect(
    plain(
      formatAppointmentTimeRange(
        "2032-07-06T13:00:00.000Z",
        "2032-07-06T13:30:00.000Z",
      ),
    ),
  ).toBe("9:00 – 9:30 AM");
});

test("clinicToday uses the clinic calendar date", () => {
  expect(clinicToday(new Date("2032-01-06T03:00:00Z"))).toBe("2032-01-05");
});
