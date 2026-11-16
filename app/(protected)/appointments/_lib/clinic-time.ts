import { TZDate } from "@date-fns/tz";
import { START_STEP_MINUTES } from "@/lib/appointments/schemas";

export const CLINIC_TIME_ZONE = "America/New_York";
export const CLINIC_TIME_ZONE_LABEL = "Eastern Time";

const FIRST_START_MINUTES = 8 * 60 + 15;
const LAST_START_MINUTES = 16 * 60 + 30;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export const BOOKING_START_TIMES: readonly string[] = Array.from(
  {
    length:
      (LAST_START_MINUTES - FIRST_START_MINUTES) / START_STEP_MINUTES + 1,
  },
  (_, i) => {
    const minutes = FIRST_START_MINUTES + i * START_STEP_MINUTES;
    return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  },
);

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

// Expects a validated calendar date and a time from BOOKING_START_TIMES.
export function clinicWallTimeToIso(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const wall = new TZDate(
    year,
    month - 1,
    day,
    hours,
    minutes,
    CLINIC_TIME_ZONE,
  );
  return new Date(wall.getTime()).toISOString();
}

export function isoToClinicWallTime(iso: string): {
  date: string;
  time: string;
} {
  const d = new TZDate(iso, CLINIC_TIME_ZONE);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function formatClockTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const hour12 = hours % 12 || 12;
  return `${hour12}:${pad(minutes)} ${hours < 12 ? "AM" : "PM"}`;
}
