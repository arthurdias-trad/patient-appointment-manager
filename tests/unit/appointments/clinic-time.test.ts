// @vitest-environment node
import {
  BOOKING_START_TIMES,
  clinicToday,
  clinicWallTimeToIso,
  formatAppointmentDate,
  formatAppointmentTimeRange,
  formatClockTime,
  isoToClinicWallTime,
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

test("converts Eastern wall time across DST changes", () => {
  const cases = [
    ["2026-03-07", "2026-03-07T14:00:00.000Z"],
    ["2026-03-08", "2026-03-08T13:00:00.000Z"],
    ["2026-10-31", "2026-10-31T13:00:00.000Z"],
    ["2026-11-01", "2026-11-01T14:00:00.000Z"],
  ];
  for (const [date, iso] of cases) {
    expect(clinicWallTimeToIso(date, "09:00")).toBe(iso);
    expect(isoToClinicWallTime(iso)).toEqual({ date, time: "09:00" });
  }
});

test("BOOKING_START_TIMES covers 8:15 to 4:30 in 15-minute steps", () => {
  expect(BOOKING_START_TIMES).toHaveLength(34);
  expect(BOOKING_START_TIMES[0]).toBe("08:15");
  expect(BOOKING_START_TIMES.at(-1)).toBe("16:30");
  for (const time of BOOKING_START_TIMES) {
    expect(["00", "15", "30", "45"]).toContain(time.slice(3));
  }
});

test("formats option labels with plain spaces", () => {
  expect(formatClockTime("08:15")).toBe("8:15 AM");
  expect(formatClockTime("12:00")).toBe("12:00 PM");
  expect(formatClockTime("16:30")).toBe("4:30 PM");
});
