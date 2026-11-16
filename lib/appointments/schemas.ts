import { z } from "zod";

export const APPOINTMENT_MINUTES = 30;
export const START_STEP_MINUTES = 15;
export const REASON_MAX_CHARS = 500;

export const PROVIDER_REQUIRED_MESSAGE = "Choose a provider.";
export const START_IN_FUTURE_MESSAGE = "Choose a time in the future.";

const offGridMessage =
  "Choose a start time on the hour or at 15, 30, or 45 minutes past.";
const reasonRequiredMessage = "Enter a reason for the appointment.";

const bodyError: z.core.$ZodErrorMap = (issue) => {
  if (issue.code === "unrecognized_keys") {
    return "This request includes fields that can't be set.";
  }
  if (issue.code === "invalid_type") {
    return "The appointment details couldn't be read. Please try again.";
  }
};

export const appointmentIdSchema = z.uuid();

const providerIdSchema = z.uuid({ error: PROVIDER_REQUIRED_MESSAGE });

const startsAtSchema = z.iso
  .datetime({
    offset: true,
    abort: true,
    error: "Enter a valid date and time.",
  })
  .refine((s) => !/\.\d*[1-9]/.test(s), {
    message: offGridMessage,
    abort: true,
  })
  .refine(
    (s) => Date.parse(s) % (START_STEP_MINUTES * 60_000) === 0,
    offGridMessage,
  );

const reasonSchema = z
  .string({ error: reasonRequiredMessage })
  .trim()
  .min(1, reasonRequiredMessage)
  .refine(
    (s) => [...s].length <= REASON_MAX_CHARS,
    `Reason cannot exceed ${REASON_MAX_CHARS} characters.`,
  );

export const createAppointmentSchema = z.strictObject(
  {
    providerId: providerIdSchema,
    startsAt: startsAtSchema,
    reason: reasonSchema,
  },
  { error: bodyError },
);

export const updateAppointmentSchema = z
  .strictObject(
    {
      providerId: providerIdSchema.optional(),
      startsAt: startsAtSchema.optional(),
      reason: reasonSchema.optional(),
      status: z
        .literal("cancelled", { error: "Appointments can only be cancelled." })
        .optional(),
    },
    { error: bodyError },
  )
  .check((ctx) => {
    if (ctx.issues.length > 0) return;
    const { status, ...details } = ctx.value;
    const hasDetails = Object.values(details).some((v) => v !== undefined);
    if (status === undefined && !hasDetails) {
      ctx.issues.push({
        code: "custom",
        path: [],
        message: "No changes to save.",
        input: ctx.value,
      });
    } else if (status !== undefined && hasDetails) {
      ctx.issues.push({
        code: "custom",
        path: [],
        message: "Changes and cancellation must be submitted separately.",
        input: ctx.value,
      });
    }
  });

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

export function appointmentEndsAt(startsAt: string): string {
  return new Date(
    Date.parse(startsAt) + APPOINTMENT_MINUTES * 60_000,
  ).toISOString();
}
