import "server-only";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { toApiError } from "@/lib/appointments/database-errors";
import {
  appointmentEndsAt,
  appointmentIdSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
} from "@/lib/appointments/schemas";
import type {
  Appointment,
  AppointmentStatus,
  Provider,
} from "@/lib/appointments/types";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

const APPOINTMENT_COLUMNS =
  "id, starts_at, ends_at, reason, status, provider:providers(id, name, specialty)";

type Tables = Database["public"]["Tables"];
type AppointmentUpdate = Tables["appointments"]["Update"];

type AppointmentRow = Pick<
  Tables["appointments"]["Row"],
  "id" | "starts_at" | "ends_at" | "reason" | "status"
> & { provider: Provider };

function toAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    provider: {
      id: row.provider.id,
      name: row.provider.name,
      specialty: row.provider.specialty,
    },
    startsAt: new Date(row.starts_at).toISOString(),
    endsAt: new Date(row.ends_at).toISOString(),
    reason: row.reason,
    status: row.status as AppointmentStatus,
  };
}

async function authorizedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) throw new ApiError("unauthenticated");
  return supabase;
}

function parseId(id: unknown): string {
  const result = appointmentIdSchema.safeParse(id);
  if (!result.success) throw new ApiError("not_found");
  return result.data;
}

function parseBody<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const { fieldErrors, formErrors } = z.flattenError(result.error);
  throw new ApiError("validation_failed", {
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
    formErrors: formErrors.length > 0 ? formErrors : undefined,
  });
}

function unwrap<T>(result: { data: T | null; error: { code: string } | null }) {
  if (result.error) throw toApiError(result.error);
  if (result.data === null) throw new ApiError("not_found");
  return result.data;
}

export async function listProviders(): Promise<Provider[]> {
  const supabase = await authorizedClient();
  return unwrap(
    await supabase
      .from("providers")
      .select("id, name, specialty")
      .order("name"),
  );
}

export async function listAppointments(): Promise<Appointment[]> {
  const supabase = await authorizedClient();
  const rows = unwrap(
    await supabase
      .from("appointments")
      .select(APPOINTMENT_COLUMNS)
      .order("starts_at")
      .order("id"),
  );
  return rows.map(toAppointment);
}

export async function getAppointment(id: unknown): Promise<Appointment> {
  const supabase = await authorizedClient();
  const appointmentId = parseId(id);
  const row = unwrap(
    await supabase
      .from("appointments")
      .select(APPOINTMENT_COLUMNS)
      .eq("id", appointmentId)
      .maybeSingle(),
  );
  return toAppointment(row);
}

export async function createAppointment(input: unknown): Promise<Appointment> {
  const supabase = await authorizedClient();
  const { providerId, startsAt, reason } = parseBody(
    createAppointmentSchema,
    input,
  );
  const row = unwrap(
    await supabase
      .from("appointments")
      .insert({
        provider_id: providerId,
        starts_at: startsAt,
        ends_at: appointmentEndsAt(startsAt),
        reason,
      })
      .select(APPOINTMENT_COLUMNS)
      .single(),
  );
  return toAppointment(row);
}

export async function updateAppointment(
  id: unknown,
  input: unknown,
): Promise<Appointment> {
  const supabase = await authorizedClient();
  const appointmentId = parseId(id);
  const { providerId, startsAt, reason, status } = parseBody(
    updateAppointmentSchema,
    input,
  );
  const patch: AppointmentUpdate = {};
  if (providerId !== undefined) patch.provider_id = providerId;
  if (startsAt !== undefined) {
    patch.starts_at = startsAt;
    patch.ends_at = appointmentEndsAt(startsAt);
  }
  if (reason !== undefined) patch.reason = reason;
  if (status !== undefined) patch.status = status;

  const row = unwrap(
    await supabase
      .from("appointments")
      .update(patch)
      .eq("id", appointmentId)
      .select(APPOINTMENT_COLUMNS)
      .maybeSingle(),
  );
  return toAppointment(row);
}

export async function deleteAppointment(id: unknown): Promise<void> {
  const supabase = await authorizedClient();
  const appointmentId = parseId(id);
  const deleted = unwrap(
    await supabase.rpc("delete_appointment", { appointment_id: appointmentId }),
  );
  if (!deleted) throw new ApiError("not_found");
}
