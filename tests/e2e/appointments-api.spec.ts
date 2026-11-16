import { expect, test } from "@playwright/test";
import { PROVIDER } from "./support/appointments";
import { signIn } from "./support/session";
import { createTestUser } from "./support/users";

const NO_STORE = "private, no-store";

function appointmentBody(startsAt: string) {
  return { providerId: PROVIDER.id, startsAt, reason: "Routine follow-up" };
}

test("anonymous API mutation gets an uncached 401", async ({
  request,
  baseURL,
}) => {
  const response = await request.post("/api/appointments", {
    headers: { origin: baseURL! },
    data: appointmentBody("2032-01-05T09:00:00Z"),
    maxRedirects: 0,
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toBe(NO_STORE);
});

test("signed-in browser manages an appointment through the API", async ({
  page,
}) => {
  const user = await createTestUser();
  await signIn(page, user);

  const results = await page.evaluate(async (body) => {
    const pairs: [number, string | null][] = [];
    const record = (response: Response) =>
      pairs.push([response.status, response.headers.get("cache-control")]);

    const created = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    record(created);
    const { id } = (await created.json()) as { id: string };

    record(
      await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      }),
    );
    record(await fetch(`/api/appointments/${id}`, { method: "DELETE" }));
    record(await fetch(`/api/appointments/${id}`, { method: "DELETE" }));
    return pairs;
  }, appointmentBody("2032-01-05T10:15:00Z"));

  expect(results).toEqual([
    [201, NO_STORE],
    [200, NO_STORE],
    [204, NO_STORE],
    [404, NO_STORE],
  ]);
});

test("cross-site mutation is refused", async ({ page }) => {
  const user = await createTestUser();
  await signIn(page, user);
  const body = appointmentBody("2032-01-05T11:30:00Z");

  for (const origin of ["https://attacker.example", "https://127.0.0.1:3100"]) {
    const response = await page.request.post("/api/appointments", {
      headers: { origin },
      data: body,
    });
    expect(response.status(), origin).toBe(403);
  }

  const status = await page.evaluate(async (data) => {
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response.status;
  }, body);
  expect(status).toBe(201);
});
