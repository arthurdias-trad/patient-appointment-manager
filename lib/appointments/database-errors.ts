import { ApiError } from "@/lib/api/errors";
import {
  PROVIDER_REQUIRED_MESSAGE,
  START_IN_FUTURE_MESSAGE,
} from "@/lib/appointments/schemas";

export function toApiError(error: { code: string }): ApiError {
  switch (error.code) {
    case "23503":
      return new ApiError("validation_failed", {
        fieldErrors: { providerId: [PROVIDER_REQUIRED_MESSAGE] },
      });
    case "23514":
    case "22007":
    case "22008":
      return new ApiError("validation_failed");
    case "23P01":
      return new ApiError("appointment_conflict");
    case "AP001":
      return new ApiError("validation_failed", {
        fieldErrors: { startsAt: [START_IN_FUTURE_MESSAGE] },
      });
    case "AP002":
      return new ApiError("appointment_started");
    case "AP003":
      return new ApiError("appointment_cancelled");
    default:
      console.error("Unexpected database error", { code: error.code });
      return new ApiError("internal_error");
  }
}
