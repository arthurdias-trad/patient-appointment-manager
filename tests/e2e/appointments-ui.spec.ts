import { expect, test } from "@playwright/test";
import { signIn } from "./support/session";
import { createTestUser } from "./support/users";

const PROVIDER_ID = "00000000-0000-4000-8000-000000000001";

test("starts a fresh form after a successful booking", async ({ page }) => {
  const user = await createTestUser();
  await signIn(page, user);

  for (const [time, reason] of [
    ["09:00", "First booking"],
    ["10:00", "Second booking"],
  ]) {
    await page.getByRole("link", { name: "Book appointment" }).first().click();
    await expect(page).toHaveURL("/appointments/new");

    const main = page.getByRole("main");
    const submit = main.getByRole("button", {
      name: "Book appointment",
      exact: true,
    });
    await expect(main.getByLabel("Provider", { exact: true })).toHaveValue("");
    await expect(main.getByLabel("Appointment date")).toHaveValue("");
    await expect(main.getByLabel("Start time")).toHaveValue("");
    await expect(main.getByLabel("Reason for appointment")).toHaveValue("");
    await expect(submit).toBeEnabled();
    await expect(submit).not.toHaveAttribute("aria-busy", "true");

    await main
      .getByLabel("Provider", { exact: true })
      .selectOption(PROVIDER_ID);
    await main.getByLabel("Appointment date").fill("2032-01-05");
    await main.getByLabel("Start time").selectOption(time);
    await main.getByLabel("Reason for appointment").fill(reason);
    await submit.click();

    await expect(page).toHaveURL("/appointments");
    await expect(
      page.getByRole("tabpanel").getByText(reason, { exact: true }),
    ).toBeVisible();
  }

  await expect(
    page
      .getByRole("tabpanel")
      .getByRole("heading", { name: "Dr. Avery Quill" }),
  ).toHaveCount(2);
});

test("cancels and deletes from the list", async ({ page, baseURL }) => {
  const user = await createTestUser();
  await signIn(page, user);
  const created = await page.request.post("/api/appointments", {
    headers: { origin: baseURL! },
    data: {
      providerId: PROVIDER_ID,
      startsAt: "2032-01-05T14:00:00Z",
      reason: "Routine follow-up",
    },
  });
  expect(created.status()).toBe(201);
  await page.goto("/appointments");

  const upcomingTab = page.getByRole("tab", { name: /Upcoming/ });
  const panel = page.getByRole("tabpanel");
  await expect(upcomingTab).toHaveAttribute("aria-selected", "true");
  await expect(
    panel.getByRole("heading", { name: "Dr. Avery Quill" }),
  ).toBeVisible();
  await expect(panel.getByText(/Monday, Jan 5, 2032/)).toBeVisible();

  await panel.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Cancel appointment" })
    .click();
  await expect(page.getByRole("status")).toHaveText("Appointment cancelled.");
  await expect(panel.getByText("No upcoming appointments")).toBeVisible();
  await expect(upcomingTab).toBeFocused();

  await page.getByRole("tab", { name: /Cancelled/ }).click();
  await expect(page).toHaveURL("/appointments?tab=cancelled");
  await expect(panel.getByText("Cancelled", { exact: true })).toBeVisible();

  await page.goBack();
  await expect(upcomingTab).toHaveAttribute("aria-selected", "true");
  await page.goForward();

  await panel.getByRole("button", { name: "Delete", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete appointment" })
    .click();
  await expect(panel.getByText("No cancelled appointments")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("tabpanel").getByText("No cancelled appointments"),
  ).toBeVisible();
});
