import "server-only";
import {
  API_ERROR_MESSAGES,
  ApiError,
  type ApiErrorBody,
  type ApiErrorCode,
} from "./errors";

const STATUS: Record<ApiErrorCode, number> = {
  forbidden: 403,
  unsupported_media_type: 415,
  invalid_json: 400,
  unauthenticated: 401,
  not_found: 404,
  validation_failed: 422,
  appointment_conflict: 409,
  appointment_started: 409,
  appointment_cancelled: 409,
  internal_error: 500,
};

const NO_STORE = "private, no-store";

export function json(body: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", NO_STORE);
  return Response.json(body, { ...init, headers });
}

export function noContent(): Response {
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": NO_STORE },
  });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    const body: ApiErrorBody = {
      error: { code: error.code, message: error.message },
    };
    if (error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
      body.error.fieldErrors = error.fieldErrors;
    }
    if (error.formErrors && error.formErrors.length > 0) {
      body.error.formErrors = error.formErrors;
    }
    return json(body, { status: STATUS[error.code] });
  }

  const name = error instanceof Error ? error.name : typeof error;
  console.error("Unexpected API error", { name });
  const body: ApiErrorBody = {
    error: {
      code: "internal_error",
      message: API_ERROR_MESSAGES.internal_error,
    },
  };
  return json(body, { status: STATUS.internal_error });
}

function firstValue(header: string | null): string | undefined {
  const value = header?.split(",")[0]?.trim();
  return value ? value : undefined;
}

function parseOrigin(value: string): string | undefined {
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

export function assertSameOrigin(request: Request): void {
  const forbidden = new ApiError("forbidden");
  const { headers } = request;

  let proto = firstValue(headers.get("x-forwarded-proto"));
  if (!proto) {
    try {
      proto = new URL(request.url).protocol.slice(0, -1);
    } catch {
      throw forbidden;
    }
  }
  proto = proto.toLowerCase();
  if (proto !== "http" && proto !== "https") throw forbidden;

  const host =
    firstValue(headers.get("x-forwarded-host")) ?? headers.get("host");
  if (!host) throw forbidden;

  const expected = parseOrigin(`${proto}://${host}`);
  if (!expected) throw forbidden;

  const origin = headers.get("origin");
  if (!origin || parseOrigin(origin) !== expected) throw forbidden;
}

export async function readJson(request: Request): Promise<unknown> {
  const mediaType = request.headers
    .get("content-type")
    ?.split(";")[0]
    ?.trim()
    .toLowerCase();
  if (mediaType !== "application/json") {
    throw new ApiError("unsupported_media_type");
  }
  try {
    return await request.json();
  } catch {
    throw new ApiError("invalid_json");
  }
}
