import {
  API_ERROR_MESSAGES,
  apiErrorBodySchema,
  type ApiErrorBody,
} from "@/lib/api/errors";

export const NETWORK_ERROR_MESSAGE =
  "We couldn't reach the server. Check your connection and try again.";

type MutationResult =
  | { ok: true; status: number }
  | { ok: false; status: number; body: ApiErrorBody | null };

export async function sendAppointmentMutation(req: {
  method: "POST" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
}): Promise<MutationResult> {
  let response: Response;
  try {
    response = await fetch(req.path, {
      method: req.method,
      headers:
        req.body === undefined
          ? undefined
          : { "Content-Type": "application/json" },
      body: req.body === undefined ? undefined : JSON.stringify(req.body),
    });
  } catch {
    return { ok: false, status: 0, body: null };
  }

  if (response.ok) return { ok: true, status: response.status };
  const body: unknown = await response.json().catch(() => null);
  const parsed = apiErrorBodySchema.safeParse(body);
  return {
    ok: false,
    status: response.status,
    body: parsed.success ? parsed.data : null,
  };
}

export function errorMessageFor(result: {
  status: number;
  body: ApiErrorBody | null;
}): string {
  if (result.body) return result.body.error.message;
  if (result.status === 401) return API_ERROR_MESSAGES.unauthenticated;
  if (result.status === 0) return NETWORK_ERROR_MESSAGE;
  return API_ERROR_MESSAGES.internal_error;
}
