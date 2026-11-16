import { expect, test } from "@playwright/test";
import { signIn } from "./support/session";
import { createTestUser } from "./support/users";

const PROVIDER_ID = "00000000-0000-4000-8000-000000000001";

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
