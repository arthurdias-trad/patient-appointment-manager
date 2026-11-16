import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { expectAccessible } from "./support/accessibility";
import { createAppointment, PROVIDER } from "./support/appointments";
import { signIn } from "./support/session";
import { createTestUser } from "./support/users";

async function expectSignedIn(page: Page) {
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

test("signed-out pages", { tag: "@mobile" }, async ({ page }) => {
  for (const path of ["/", "/login", "/signup"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectAccessible(page);
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(`e2e+${randomUUID()}@example.com`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("a-wrong-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
  await expectAccessible(page);

  await page.goto("/signup");
  await page.getByLabel("First name").fill("E2E");
  await page.getByLabel("Last name").fill("Patient");
  await page.getByLabel("Email").fill(`e2e+${randomUUID()}@example.com`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("a-valid-password-123");
  await page.getByLabel("Confirm password").fill("a-different-password-123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Passwords don't match.")).toBeVisible();
  await expectAccessible(page);
});

test("appointment list and dialog", { tag: "@mobile" }, async ({ page }) => {
  const user = await createTestUser();
  await signIn(page, user);
  await createAppointment(page, "2032-01-05T14:00:00Z", "X".repeat(150));
  const cancelledId = await createAppointment(page, "2032-01-06T15:00:00Z");
  const cancelled = await page.request.patch(
    `/api/appointments/${cancelledId}`,
    {
      headers: { origin: new URL(page.url()).origin },
      data: { status: "cancelled" },
    },
  );
  expect(cancelled.status()).toBe(200);

  await page.goto("/appointments");
  const panel = page.getByRole("tabpanel");
  await expect(
    panel.getByRole("heading", { name: PROVIDER.name }),
  ).toBeVisible();
  await expectSignedIn(page);
  await expectAccessible(page);

  await panel.getByRole("button", { name: "Cancel", exact: true }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expectAccessible(page);
  expect(
    await dialog.evaluate((el) => el.scrollWidth - el.clientWidth),
    "dialog scrolls horizontally",
  ).toBeLessThanOrEqual(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await page.getByRole("tab", { name: /Cancelled/ }).click();
  await expect(panel.getByText("Cancelled", { exact: true })).toBeVisible();
  await expectAccessible(page);
});

test(
  "appointment forms and not-found",
  { tag: "@mobile" },
  async ({ page }) => {
    const user = await createTestUser();
    await signIn(page, user);
    const id = await createAppointment(page, "2032-01-05T14:00:00Z");

    await page.goto("/appointments/new");
    const main = page.getByRole("main");
    await main
      .getByRole("button", { name: "Book appointment", exact: true })
      .click();
    await expect(main.getByLabel("Provider", { exact: true })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expectSignedIn(page);
    await expectAccessible(page);

    await page.goto(`/appointments/${id}/edit`);
    await expect(main.getByLabel("Start time")).toHaveValue("09:00");
    await expectSignedIn(page);
    await expectAccessible(page);

    await page.goto(
      "/appointments/00000000-0000-4000-8000-000000000000/edit",
    );
    await expect(
      page.getByRole("heading", { name: "Appointment not found" }),
    ).toBeVisible();
    await expectSignedIn(page);
    await expectAccessible(page);
  },
);
