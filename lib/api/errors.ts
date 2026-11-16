import { z } from "zod";

const apiErrorCodeSchema = z.enum([
  "forbidden",
  "unsupported_media_type",
  "invalid_json",
  "unauthenticated",
  "not_found",
  "validation_failed",
  "appointment_conflict",
  "appointment_started",
  "appointment_cancelled",
  "internal_error",
]);

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

const fieldErrorsSchema = z.object({
  providerId: z.array(z.string()).optional(),
  startsAt: z.array(z.string()).optional(),
  reason: z.array(z.string()).optional(),
  status: z.array(z.string()).optional(),
});

export type FieldErrors = z.infer<typeof fieldErrorsSchema>;

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
    fieldErrors: fieldErrorsSchema.optional(),
    formErrors: z.array(z.string()).optional(),
  }),
});

export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;

export const API_ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  forbidden: "This request isn't allowed.",
  unsupported_media_type:
    "The appointment details couldn't be read. Please try again.",
  invalid_json: "The request couldn't be read.",
  unauthenticated: "Sign in to continue.",
  not_found: "Appointment not found.",
  validation_failed: "Check the appointment details and try again.",
  appointment_conflict: "You already have an appointment at that time.",
  appointment_started:
    "This appointment has already started and can't be changed.",
  appointment_cancelled: "This appointment was cancelled and can't be changed.",
  internal_error: "Something went wrong. Try again.",
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly fieldErrors?: FieldErrors;
  readonly formErrors?: string[];

  constructor(
    code: ApiErrorCode,
    details?: { fieldErrors?: FieldErrors; formErrors?: string[] },
  ) {
    super(API_ERROR_MESSAGES[code]);
    this.name = "ApiError";
    this.code = code;
    this.fieldErrors = details?.fieldErrors;
    this.formErrors = details?.formErrors;
  }
}
