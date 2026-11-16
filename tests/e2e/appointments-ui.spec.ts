import { expect, test, type Page } from "@playwright/test";
import { createAppointment, PROVIDER } from "./support/appointments";
import { signIn } from "./support/session";
import { createTestUser } from "./support/users";

async function confirmAction(page: Page, trigger: string, confirm: string) {
  await page
    .getByRole("tabpanel")
    .getByRole("button", { name: trigger, exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: confirm })
    .click();
}

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
      .selectOption(PROVIDER.id);
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
      .getByRole("heading", { name: PROVIDER.name }),
  ).toHaveCount(2);
});

test("cancels and deletes from the list", async ({ page }) => {
  const user = await createTestUser();
  await signIn(page, user);
  await createAppointment(page, "2032-01-05T14:00:00Z");
  await page.goto("/appointments");

  const upcomingTab = page.getByRole("tab", { name: /Upcoming/ });
  const panel = page.getByRole("tabpanel");
  await expect(upcomingTab).toHaveAttribute("aria-selected", "true");
  await expect(
    panel.getByRole("heading", { name: PROVIDER.name }),
  ).toBeVisible();
  await expect(panel.getByText(/Monday, Jan 5, 2032/)).toBeVisible();

  await confirmAction(page, "Cancel", "Cancel appointment");
  await expect(page.getByRole("status")).toHaveText("Appointment cancelled.");
  await expect(panel.getByText("No upcoming appointments")).toBeVisible();
  await expect(upcomingTab).toBeFocused();

  await page.getByRole("tab", { name: /Cancelled/ }).click();
  await expect(page).toHaveURL("/appointments?tab=cancelled");
  await expect(panel.getByText("Cancelled", { exact: true })).toBeVisible();

  await page.goBack();
  await expect(upcomingTab).toHaveAttribute("aria-selected", "true");
  await page.goForward();

  await confirmAction(page, "Delete", "Delete appointment");
  await expect(panel.getByText("No cancelled appointments")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("tabpanel").getByText("No cancelled appointments"),
  ).toBeVisible();
});

test(
  "books, edits, cancels, and deletes through the UI",
  {
    tag: "@mobile",
  },
  async ({ page }) => {
    const user = await createTestUser();
    await signIn(page, user);
    await page.getByRole("link", { name: "Book appointment" }).first().click();

    const main = page.getByRole("main");
    const provider = main.getByLabel("Provider", { exact: true });
    const date = main.getByLabel("Appointment date");
    const startTime = main.getByLabel("Start time");
    const reason = main.getByLabel("Reason for appointment");
    await provider.selectOption({
      label: `${PROVIDER.name} · ${PROVIDER.specialty}`,
    });
    await date.fill("2032-01-05");
    await startTime.selectOption("09:00");
    await reason.fill("Routine follow-up");
    await main
      .getByRole("button", { name: "Book appointment", exact: true })
      .click();

    const panel = page.getByRole("tabpanel");
    await expect(page).toHaveURL("/appointments");
    await expect(
      page.getByText("Your appointment has been booked."),
    ).toBeVisible();
    await expect(panel.getByText(/9:00\s–\s9:30\sAM/)).toBeVisible();

    await panel.getByRole("link", { name: "Edit appointment" }).click();
    await expect(provider).toHaveValue(PROVIDER.id);
    await expect(date).toHaveValue("2032-01-05");
    await expect(startTime).toHaveValue("09:00");
    await expect(reason).toHaveValue("Routine follow-up");
    await startTime.selectOption("10:00");
    await main.getByRole("button", { name: "Save changes" }).click();

    await expect(page).toHaveURL("/appointments");
    await expect(page.getByText("Your changes have been saved.")).toBeVisible();
    await expect(panel.getByText(/10:00\s–\s10:30\sAM/)).toBeVisible();

    await confirmAction(page, "Cancel", "Cancel appointment");
    await expect(panel.getByText("No upcoming appointments")).toBeVisible();
    await page.getByRole("tab", { name: /Cancelled/ }).click();
    await confirmAction(page, "Delete", "Delete appointment");
    await expect(panel.getByText("No cancelled appointments")).toBeVisible();
  },
);

test("shows a past start next to the time field", async ({ page }) => {
  const yesterday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
  }).format(Date.now() - 86_400_000);
  const user = await createTestUser();
  await signIn(page, user);
  await page.goto("/appointments/new");

  const main = page.getByRole("main");
  const startTime = main.getByLabel("Start time");
  await main.getByLabel("Provider", { exact: true }).selectOption(PROVIDER.id);
  await main.getByLabel("Appointment date").fill(yesterday);
  await startTime.selectOption("09:00");
  await main.getByLabel("Reason for appointment").fill("Routine follow-up");
  await main
    .getByRole("button", { name: "Book appointment", exact: true })
    .click();

  await expect(startTime).toHaveAccessibleDescription(
    /Choose a time in the future\./,
  );
  await expect(startTime).toHaveAttribute("aria-invalid", "true");
  await expect(page).toHaveURL("/appointments/new");
});
