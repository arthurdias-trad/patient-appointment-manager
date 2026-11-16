import {
  createAppointmentSchema,
  updateAppointmentSchema,
  type CreateAppointmentInput,
  type UpdateAppointmentInput,
} from "@/lib/appointments/schemas";
import type { Appointment } from "@/lib/appointments/types";
import { z } from "zod";
import {
  BOOKING_START_TIMES,
  clinicWallTimeToIso,
  isoToClinicWallTime,
} from "./clinic-time";
import { fromFieldErrors } from "./form-errors";

export type AppointmentFormValues = {
  providerId: string;
  date: string;
  time: string;
  reason: string;
};

export type AppointmentFormField = "providerId" | "date" | "time" | "reason";

export type AppointmentFormErrors = {
  fieldErrors: Partial<Record<AppointmentFormField, string[]>>;
  formErrors: string[];
  signInRequired: boolean;
};

type Prepared<T> = { body: T } | { errors: AppointmentFormErrors };

const DATE_REQUIRED_MESSAGE = "Choose a date.";
const DATE_INVALID_MESSAGE = "Enter a valid date.";
const TIME_REQUIRED_MESSAGE = "Choose a start time.";
const TIME_OUTSIDE_WINDOW_MESSAGE =
  "Choose a start time between 8:15 AM and 4:30 PM Eastern Time.";

export const EMPTY_VALUES: AppointmentFormValues = {
  providerId: "",
  date: "",
  time: "",
  reason: "",
};

export function valuesFromAppointment(a: Appointment): AppointmentFormValues {
  const { date, time } = isoToClinicWallTime(a.startsAt);
  return {
    providerId: a.provider.id,
    date,
    time: BOOKING_START_TIMES.includes(time) ? time : "",
    reason: a.reason,
  };
}

function isCalendarDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

function startFromValues(v: AppointmentFormValues): {
  startsAt?: string;
  fieldErrors: AppointmentFormErrors["fieldErrors"];
} {
  const fieldErrors: AppointmentFormErrors["fieldErrors"] = {};
  if (!v.date) fieldErrors.date = [DATE_REQUIRED_MESSAGE];
  else if (!isCalendarDate(v.date)) fieldErrors.date = [DATE_INVALID_MESSAGE];
  if (!v.time) fieldErrors.time = [TIME_REQUIRED_MESSAGE];
  else if (!BOOKING_START_TIMES.includes(v.time)) {
    fieldErrors.time = [TIME_OUTSIDE_WINDOW_MESSAGE];
  }
  if (fieldErrors.date || fieldErrors.time) return { fieldErrors };
  try {
    return { startsAt: clinicWallTimeToIso(v.date, v.time), fieldErrors };
  } catch {
    return { fieldErrors: { date: [DATE_INVALID_MESSAGE] } };
  }
}

// Date and time errors replace the schema's startsAt error, which only
// reflects the placeholder sent when no start could be built.
function parse<T>(
  schema: z.ZodType<T>,
  body: unknown,
  startErrors: AppointmentFormErrors["fieldErrors"],
): Prepared<T> {
  const result = schema.safeParse(body);
  const hasStartErrors = Object.keys(startErrors).length > 0;
  if (result.success && !hasStartErrors) return { body: result.data };
  const flat = result.success ? undefined : z.flattenError(result.error);
  const errors = fromFieldErrors(flat?.fieldErrors, flat?.formErrors);
  if (hasStartErrors) delete errors.fieldErrors.time;
  return {
    errors: {
      ...errors,
      fieldErrors: { ...errors.fieldErrors, ...startErrors },
    },
  };
}

export function prepareCreate(
  v: AppointmentFormValues,
): Prepared<CreateAppointmentInput> {
  const { startsAt = "", fieldErrors } = startFromValues(v);
  return parse(
    createAppointmentSchema,
    { providerId: v.providerId, startsAt, reason: v.reason },
    fieldErrors,
  );
}

// `original` is the form's initial values from valuesFromAppointment, so an
// off-window start (time "") must be replaced before any edit can be saved.
export function preparePatch(
  original: AppointmentFormValues,
  v: AppointmentFormValues,
): Prepared<UpdateAppointmentInput> {
  const { startsAt, fieldErrors } = startFromValues(v);
  const changed = {
    providerId: v.providerId !== original.providerId,
    startsAt: v.date !== original.date || v.time !== original.time,
    reason: v.reason.trim() !== original.reason.trim(),
  };
  return parse(
    updateAppointmentSchema,
    {
      providerId: changed.providerId ? v.providerId : undefined,
      startsAt: changed.startsAt ? startsAt : undefined,
      reason: changed.reason ? v.reason : undefined,
    },
    fieldErrors,
  );
}
