import type { Appointment } from "@/lib/appointments/types";

export type AppointmentPhase =
  | "upcoming"
  | "in_progress"
  | "past"
  | "cancelled";

export type AppointmentTab = "upcoming" | "past" | "cancelled";

export const APPOINTMENT_TABS: readonly AppointmentTab[] = [
  "upcoming",
  "past",
  "cancelled",
];

export function appointmentPhase(
  a: Pick<Appointment, "startsAt" | "endsAt" | "status">,
  now: Date,
): AppointmentPhase {
  if (a.status === "cancelled") return "cancelled";
  const time = now.getTime();
  if (time < Date.parse(a.startsAt)) return "upcoming";
  if (time < Date.parse(a.endsAt)) return "in_progress";
  return "past";
}

export function tabForPhase(p: AppointmentPhase): AppointmentTab {
  return p === "in_progress" ? "upcoming" : p;
}

export function allowedActions(p: AppointmentPhase): {
  edit: boolean;
  cancel: boolean;
  delete: boolean;
} {
  const upcoming = p === "upcoming";
  return { edit: upcoming, cancel: upcoming, delete: !upcoming };
}

type PhasedAppointment = { appointment: Appointment; phase: AppointmentPhase };

export function groupAppointments(
  list: Appointment[],
  now: Date,
): Record<AppointmentTab, PhasedAppointment[]> {
  const groups: Record<AppointmentTab, PhasedAppointment[]> = {
    upcoming: [],
    past: [],
    cancelled: [],
  };
  for (const appointment of list) {
    const phase = appointmentPhase(appointment, now);
    groups[tabForPhase(phase)].push({ appointment, phase });
  }
  const byStart = (a: PhasedAppointment, b: PhasedAppointment) =>
    Date.parse(a.appointment.startsAt) - Date.parse(b.appointment.startsAt);
  groups.upcoming.sort(byStart);
  groups.past.sort((a, b) => byStart(b, a));
  groups.cancelled.sort((a, b) => byStart(b, a));
  return groups;
}

export function parseTab(value: string | null): AppointmentTab {
  return APPOINTMENT_TABS.find((tab) => tab === value) ?? "upcoming";
}
