import type { ApiErrorBody, FieldErrors } from "@/lib/api/errors";
import { errorMessageFor } from "./api-client";
import type { AppointmentFormErrors } from "./form-model";

export function fromFieldErrors(
  f: FieldErrors | undefined,
  formErrors: string[] = [],
): AppointmentFormErrors {
  const fieldErrors: AppointmentFormErrors["fieldErrors"] = {};
  if (f?.providerId) fieldErrors.providerId = f.providerId;
  if (f?.startsAt) fieldErrors.time = f.startsAt;
  if (f?.reason) fieldErrors.reason = f.reason;
  return {
    fieldErrors,
    formErrors: [...formErrors, ...(f?.status ?? [])],
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
