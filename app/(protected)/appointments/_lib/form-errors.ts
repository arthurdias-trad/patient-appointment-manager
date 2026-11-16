import type { ApiErrorBody, FieldErrors } from "@/lib/api/errors";
import { errorMessageFor } from "./api-client";
import type { AppointmentFormErrors, AppointmentFormField } from "./form-model";

const FIELD_TARGETS: Record<keyof FieldErrors, AppointmentFormField | null> = {
  providerId: "providerId",
  startsAt: "time",
  reason: "reason",
  status: null,
};

export function fromFieldErrors(
  f: FieldErrors | undefined,
  formErrors: string[] = [],
): AppointmentFormErrors {
  const fieldErrors: AppointmentFormErrors["fieldErrors"] = {};
  const messages = [...formErrors];
  for (const [source, target] of Object.entries(FIELD_TARGETS)) {
    const errors = f?.[source as keyof FieldErrors];
    if (!errors) continue;
    if (target === null) messages.push(...errors);
    else fieldErrors[target] = errors;
  }
  return {
    fieldErrors,
    formErrors: messages,
    signInRequired: false,
  };
}

export function toFormErrors(
  status: number,
  body: ApiErrorBody | null,
): AppointmentFormErrors {
  const message = errorMessageFor({ status, body });
  if (status === 401) {
    return { fieldErrors: {}, formErrors: [message], signInRequired: true };
  }
  const errors = fromFieldErrors(
    body?.error.fieldErrors,
    body?.error.formErrors,
  );
  const hasDetails =
    errors.formErrors.length > 0 || Object.keys(errors.fieldErrors).length > 0;
  return hasDetails ? errors : { ...errors, formErrors: [message] };
}
