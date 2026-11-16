// @vitest-environment node
import {
  allowedActions,
  appointmentPhase,
  groupAppointments,
  parseTab,
} from "@/app/(protected)/appointments/_lib/phase";
import type { Appointment } from "@/lib/appointments/types";
import { expect, test } from "vitest";

const slot = {
  startsAt: "2032-01-05T14:00:00.000Z",
  endsAt: "2032-01-05T14:30:00.000Z",
  status: "scheduled" as const,
};

function appointment(
  id: string,
  startsAt: string,
  endsAt: string,
  status: Appointment["status"] = "scheduled",
): Appointment {
  return {
    id,
    provider: { id: "p1", name: "Dr. Synthetic", specialty: "General" },
    startsAt,
    endsAt,
    reason: "Checkup",
    status,
  };
}

test("appointmentPhase follows the start and end boundaries", () => {
  const at = (iso: string) => appointmentPhase(slot, new Date(iso));
  expect(at("2032-01-05T13:59:00.000Z")).toBe("upcoming");
  expect(at("2032-01-05T14:00:00.000Z")).toBe("in_progress");
  expect(at("2032-01-05T14:29:00.000Z")).toBe("in_progress");
  expect(at("2032-01-05T14:30:00.000Z")).toBe("past");
});

test("appointmentPhase reports cancelled regardless of time", () => {
  expect(
    appointmentPhase(
      { ...slot, status: "cancelled" },
      new Date("2032-01-05T13:00:00.000Z"),
    ),
  ).toBe("cancelled");
});

test("allowedActions permits edit and cancel only while upcoming", () => {
  expect(allowedActions("upcoming")).toEqual({
    edit: true,
    cancel: true,
    delete: false,
  });
  for (const phase of ["in_progress", "past", "cancelled"] as const) {
    expect(allowedActions(phase)).toEqual({
      edit: false,
      cancel: false,
      delete: true,
    });
  }
});

test("groupAppointments places and orders each tab", () => {
  const now = new Date("2032-01-05T14:10:00.000Z");
  const later = appointment(
    "later",
    "2032-01-07T14:00:00.000Z",
    "2032-01-07T14:30:00.000Z",
  );
  const current = appointment(
    "current",
    "2032-01-05T14:00:00.000Z",
    "2032-01-05T14:30:00.000Z",
  );
  const older = appointment(
    "older",
    "2032-01-01T14:00:00.000Z",
    "2032-01-01T14:30:00.000Z",
  );
  const recent = appointment(
    "recent",
    "2032-01-04T14:00:00.000Z",
    "2032-01-04T14:30:00.000Z",
  );
  const cancelledEarly = appointment(
    "cancelled-early",
    "2032-01-02T14:00:00.000Z",
    "2032-01-02T14:30:00.000Z",
    "cancelled",
  );
  const cancelledLate = appointment(
    "cancelled-late",
    "2032-01-09T14:00:00.000Z",
    "2032-01-09T14:30:00.000Z",
    "cancelled",
  );

  const groups = groupAppointments(
    [later, older, cancelledEarly, current, recent, cancelledLate],
    now,
  );
  const ids = (tab: keyof typeof groups) =>
    groups[tab].map((entry) => entry.appointment.id);

  expect(ids("upcoming")).toEqual(["current", "later"]);
  expect(groups.upcoming[0].phase).toBe("in_progress");
  expect(ids("past")).toEqual(["recent", "older"]);
  expect(ids("cancelled")).toEqual(["cancelled-late", "cancelled-early"]);
});

test("parseTab falls back to upcoming", () => {
  expect(parseTab("past")).toBe("past");
  expect(parseTab("x")).toBe("upcoming");
  expect(parseTab(null)).toBe("upcoming");
});
