export const CLINIC_TIME_ZONE = "America/New_York";
export const CLINIC_TIME_ZONE_LABEL = "Eastern Time";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: CLINIC_TIME_ZONE,
  weekday: "long",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: CLINIC_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

const calendarDateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: CLINIC_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatAppointmentDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

export function formatAppointmentTimeRange(
  startIso: string,
  endIso: string,
): string {
  return timeFormat.formatRange(new Date(startIso), new Date(endIso));
}

export function clinicToday(now: Date): string {
  const parts = Object.fromEntries(
    calendarDateFormat.formatToParts(now).map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
