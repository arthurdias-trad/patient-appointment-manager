import { expect, test } from "@playwright/test";
import { createAppointment } from "./support/appointments";
import { signIn } from "./support/session";
import { createTestUser } from "./support/users";

test("the list works from the keyboard", async ({ page }) => {
  const user = await createTestUser();
  await signIn(page, user);
  await createAppointment(page, "2032-01-05T14:00:00Z");
  await page.goto("/appointments");

  const main = page.getByRole("main");
  const panel = page.getByRole("tabpanel");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await expect(
    main.getByRole("link", { name: "Book appointment" }),
  ).toBeFocused();

  const upcomingTab = page.getByRole("tab", { name: /Upcoming/ });
  const pastTab = page.getByRole("tab", { name: /Past/ });
  const cancelledTab = page.getByRole("tab", { name: /Cancelled/ });
  await upcomingTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(pastTab).toBeFocused();
  await expect(pastTab).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL("/appointments?tab=past");
  await page.keyboard.press("End");
  await expect(cancelledTab).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL("/appointments?tab=cancelled");
  await page.keyboard.press("Home");
  await expect(upcomingTab).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL("/appointments");

  const cancel = panel.getByRole("button", { name: "Cancel", exact: true });
  const dialog = page.getByRole("alertdialog");
  const keep = dialog.getByRole("button", { name: "Keep appointment" });
  const confirm = dialog.getByRole("button", { name: "Cancel appointment" });
  await cancel.focus();
  await page.keyboard.press("Enter");
  await expect(keep).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(cancel).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(keep).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(confirm).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(keep).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(confirm).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText("Appointment cancelled.");
});

test("an invalid booking focuses the first field with an error", async ({
  page,
}) => {
  const user = await createTestUser();
  await signIn(page, user);
  await page.goto("/appointments/new");

  const main = page.getByRole("main");
  const provider = main.getByLabel("Provider", { exact: true });
  const date = main.getByLabel("Appointment date");
  const startTime = main.getByLabel("Start time");
  const reason = main.getByLabel("Reason for appointment");
  await main
    .getByRole("button", { name: "Book appointment", exact: true })
    .focus();
  await page.keyboard.press("Enter");

  await expect(provider).toBeFocused();
  await expect(provider).toHaveAccessibleDescription(/Choose a provider\./);
  await expect(date).toHaveAccessibleDescription(/Choose a date\./);
  await expect(startTime).toHaveAccessibleDescription(
    /Choose a start time\./,
  );
  await expect(reason).toHaveAccessibleDescription(
    /Enter a reason for the appointment\./,
  );
  for (const field of [provider, date, startTime, reason]) {
    await expect(field).toHaveAttribute("aria-invalid", "true");
  }
  await expect(page).toHaveURL("/appointments/new");
});
