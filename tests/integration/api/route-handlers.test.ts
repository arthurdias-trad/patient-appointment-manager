import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { beforeAll, expect, test, vi } from "vitest";
import { POST } from "@/app/api/appointments/route";
import { DELETE, PATCH } from "@/app/api/appointments/[id]/route";
import { listAppointments } from "@/lib/appointments/service";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_IDS, anonClient, signUpUser, slot } from "../support/db";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

type TestUser = Awaited<ReturnType<typeof signUpUser>>;
type ServerClient = Awaited<ReturnType<typeof createClient>>;

let carol: TestUser;

beforeAll(async () => {
  carol = await signUpUser();
});

function as(user: { client: unknown }) {
  vi.mocked(createClient).mockResolvedValue(user.client as ServerClient);
}

function input(slotIndex: number) {
  return {
    providerId: PROVIDER_IDS[0],
    startsAt: slot(slotIndex).starts_at,
    reason: "Routine follow-up",
  };
}

type ApiRequestOptions = {
  method: string;
  body?: unknown;
  origin?: string;
  contentType?: string;
  forwarded?: { proto?: string; host?: string };
  headers?: Record<string, string>;
  baseUrl?: string;
};

function apiRequest(path: string, options: ApiRequestOptions) {
  const {
    method,
    body,
    origin = "http://127.0.0.1:3000",
    contentType = "application/json",
    forwarded = { proto: "http", host: "127.0.0.1:3000" },
    headers: extra = {},
    baseUrl = "http://127.0.0.1:3000",
  } = options;
  const headers = new Headers(extra);
  const omitOrigin = "origin" in options && options.origin === undefined;
  if (!omitOrigin) headers.set("origin", origin);
  if (body !== undefined) headers.set("content-type", contentType);
  if (forwarded.proto !== undefined)
    headers.set("x-forwarded-proto", forwarded.proto);
  if (forwarded.host !== undefined)
    headers.set("x-forwarded-host", forwarded.host);

  return new NextRequest(new URL(path, baseUrl), {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : typeof body === "string"
          ? body
          : JSON.stringify(body),
  });
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function carolIds() {
  as(carol);
  return (await listAppointments()).map((a) => a.id).sort();
}

test("anonymous requests get an uncached 401", async () => {
  as({ client: anonClient() });
  const id = randomUUID();
  const responses = [
    await POST(apiRequest("/api/appointments", { method: "POST", body: input(40) })),
    await PATCH(
      apiRequest(`/api/appointments/${id}`, {
        method: "PATCH",
        body: { reason: "Routine follow-up" },
      }),
      ctx(id),
    ),
    await DELETE(
      apiRequest(`/api/appointments/${id}`, { method: "DELETE" }),
      ctx(id),
    ),
  ];

  for (const response of responses) {
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("unauthenticated");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  }
});

test("mutations require a valid same-origin Origin", async () => {
  const before = await carolIds();
  const id = randomUUID();
  const origins = [undefined, "", "null", "not a url", "https://attacker.example"];

  for (const origin of origins) {
    const responses = [
      await POST(
        apiRequest("/api/appointments", { method: "POST", body: input(41), origin }),
      ),
      await PATCH(
        apiRequest(`/api/appointments/${id}`, {
          method: "PATCH",
          body: { status: "cancelled" },
          origin,
        }),
        ctx(id),
      ),
      await DELETE(
        apiRequest(`/api/appointments/${id}`, { method: "DELETE", origin }),
        ctx(id),
      ),
    ];
    for (const response of responses) {
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("forbidden");
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    }
  }

  expect(await carolIds()).toEqual(before);
});

test("Origin must match the external scheme, host, and port", async () => {
  const before = await carolIds();
  const vercel = {
    baseUrl: "http://localhost:3000",
    forwarded: { proto: "https", host: "app.example" },
  };
  const post = (options: Partial<ApiRequestOptions>) =>
    POST(
      apiRequest("/api/appointments", {
        method: "POST",
        body: input(42),
        ...options,
      }),
    );

  expect((await post({ ...vercel, origin: "http://app.example" })).status).toBe(
    403,
  );
  expect(
    (await post({ ...vercel, origin: "https://app.example:8443" })).status,
  ).toBe(403);
  expect((await post({ origin: "https://127.0.0.1:3000" })).status).toBe(403);
  expect(
    (await post({ forwarded: { proto: "ftp", host: "127.0.0.1:3000" } }))
      .status,
  ).toBe(403);

  const created = await post({ ...vercel, origin: "https://app.example" });
  expect(created.status).toBe(201);
  const { id } = await created.json();

  expect(await carolIds()).toEqual([...before, id].sort());

  const fallback = apiRequest("/api/appointments", {
    method: "POST",
    body: input(43),
    forwarded: {},
    headers: { host: "127.0.0.1:3000" },
  });
  expect(fallback.headers.get("host")).toBe("127.0.0.1:3000");
  expect((await POST(fallback)).status).toBe(201);
});

test("POST requires a JSON body", async () => {
  as(carol);
  const unsupported = await POST(
    apiRequest("/api/appointments", {
      method: "POST",
      body: JSON.stringify(input(44)),
      contentType: "text/plain",
    }),
  );
  expect(unsupported.status).toBe(415);
  expect((await unsupported.json()).error.code).toBe("unsupported_media_type");

  const malformed = await POST(
    apiRequest("/api/appointments", { method: "POST", body: "{" }),
  );
  expect(malformed.status).toBe(400);
  expect((await malformed.json()).error.code).toBe("invalid_json");
});

test("POST creates an appointment", async () => {
  as(carol);
  const response = await POST(
    apiRequest("/api/appointments", { method: "POST", body: input(45) }),
  );

  expect(response.status).toBe(201);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("location")).toBeNull();
  expect(await response.json()).not.toHaveProperty("patientId");
});

test("validation errors keep field and form messages", async () => {
  as(carol);
  const offGrid = await POST(
    apiRequest("/api/appointments", {
      method: "POST",
      body: { ...input(46), startsAt: "2031-01-06T15:07:00Z" },
    }),
  );
  expect(offGrid.status).toBe(422);
  const offGridBody = await offGrid.json();
  expect(offGridBody.error.fieldErrors.startsAt).toBeDefined();
  expect(offGridBody.error).not.toHaveProperty("formErrors");

  const unknownKey = await POST(
    apiRequest("/api/appointments", {
      method: "POST",
      body: { ...input(46), patientId: randomUUID() },
    }),
  );
  expect(unknownKey.status).toBe(422);
  const unknownKeyBody = await unknownKey.json();
  expect(unknownKeyBody.error.formErrors).toEqual([
    "This request includes fields that can't be set.",
  ]);
  expect(unknownKeyBody.error).not.toHaveProperty("fieldErrors");

  const id = randomUUID();
  const patch = async (body: unknown) => {
    const response = await PATCH(
      apiRequest(`/api/appointments/${id}`, { method: "PATCH", body }),
      ctx(id),
    );
    expect(response.status).toBe(422);
    return (await response.json()).error.formErrors;
  };
  expect(await patch({})).toEqual(["No changes to save."]);
  expect(await patch({ status: "cancelled", reason: "x" })).toEqual([
    "Changes and cancellation must be submitted separately.",
  ]);
});

test("cancels and deletes by id", async () => {
  as(carol);
  const created = await POST(
    apiRequest("/api/appointments", { method: "POST", body: input(47) }),
  );
  const { id } = await created.json();
  const notFound = {
    error: { code: "not_found", message: "Appointment not found." },
  };

  const cancelled = await PATCH(
    apiRequest(`/api/appointments/${id}`, {
      method: "PATCH",
      body: { status: "cancelled" },
    }),
    ctx(id),
  );
  expect(cancelled.status).toBe(200);
  expect((await cancelled.json()).status).toBe("cancelled");

  const deleted = await DELETE(
    apiRequest(`/api/appointments/${id}`, { method: "DELETE" }),
    ctx(id),
  );
  expect(deleted.status).toBe(204);
  expect(await deleted.text()).toBe("");
  expect(deleted.headers.get("cache-control")).toBe("private, no-store");

  const again = await DELETE(
    apiRequest(`/api/appointments/${id}`, { method: "DELETE" }),
    ctx(id),
  );
  expect(again.status).toBe(404);
  expect(await again.json()).toEqual(notFound);

  const malformedPatch = await PATCH(
    apiRequest("/api/appointments/not-a-uuid", {
      method: "PATCH",
      body: { status: "cancelled" },
    }),
    ctx("not-a-uuid"),
  );
  expect(malformedPatch.status).toBe(404);
  expect(await malformedPatch.json()).toEqual(notFound);

  const malformedDelete = await DELETE(
    apiRequest("/api/appointments/not-a-uuid", { method: "DELETE" }),
    ctx("not-a-uuid"),
  );
  expect(malformedDelete.status).toBe(404);
  expect(await malformedDelete.json()).toEqual(notFound);
});

test("unexpected failures return a generic 500 without logging details", async () => {
  as(carol);
  const fromSpy = vi.spyOn(carol.client, "from").mockImplementation(() => {
    throw new Error("Routine follow-up");
  });
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  try {
    const response = await POST(
      apiRequest("/api/appointments", { method: "POST", body: input(48) }),
    );
    expect(response.status).toBe(500);
    expect((await response.json()).error.code).toBe("internal_error");
    expect(errorSpy).toHaveBeenCalled();
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(
      "Routine follow-up",
    );
  } finally {
    fromSpy.mockRestore();
    errorSpy.mockRestore();
  }
});
