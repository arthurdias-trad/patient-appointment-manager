import { expect, type Page } from "@playwright/test";

export const PROVIDER = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Dr. Avery Quill",
  specialty: "Developmental Pediatrics",
} as const;

export async function createAppointment(
  page: Page,
  startsAt: string,
  reason = "Routine follow-up",
): Promise<string> {
  const response = await page.request.post("/api/appointments", {
    headers: { origin: new URL(page.url()).origin },
    data: { providerId: PROVIDER.id, startsAt, reason },
  });
  expect(response.status()).toBe(201);
  const { id } = await response.json();
  return id;
}
