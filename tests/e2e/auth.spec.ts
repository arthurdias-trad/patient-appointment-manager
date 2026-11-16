import { expect, test } from "@playwright/test";
import { BREACHED_PASSWORD, HIBP_OUTAGE_PASSWORD } from "./support/hibp-stub";
import { createTestUser } from "./support/users";

test("unauthenticated visitor is sent to login and returned after signing in", async ({
  page,
}) => {
  const user = await createTestUser();

  await page.goto("/appointments?tab=upcoming");
  await expect(page).toHaveURL("/login?next=%2Fappointments%3Ftab%3Dupcoming");

  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL("/appointments?tab=upcoming");
  await expect(
    page.getByRole("heading", { name: "Your appointments" }),
  ).toBeVisible();
});

test("sign-up validates on the server, then creates a persistent session", async ({
  page,
}) => {
  const email = `e2e+${crypto.randomUUID()}@example.com`;
  const submit = async (password: string, confirm = password) => {
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(confirm);
    await page.getByRole("button", { name: "Create account" }).click();
  };

  await page.goto("/signup");
  await page.getByLabel("First name").fill("E2E");
  await page.getByLabel("Last name").fill("Patient");
  await page.getByLabel("Email").fill(email);

  await submit(BREACHED_PASSWORD);
  await expect(
    page.getByText("This password has appeared in a data breach", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("First name")).toHaveValue("E2E");
  await expect(page.getByLabel("Middle name")).toHaveValue("");
  await expect(page.getByLabel("Last name")).toHaveValue("Patient");
  await expect(page.getByLabel("Email")).toHaveValue(email);

  await submit(HIBP_OUTAGE_PASSWORD);
  await expect(
    page.getByText(
      "We couldn't verify your password right now. Try again in a moment.",
    ),
  ).toBeVisible();

  await submit("a-valid-password-123", "a-different-password-123");
  await expect(page.getByText("Passwords don't match.")).toBeVisible();

  await submit("a-valid-password-123");
  await expect(page).toHaveURL("/appointments");
  await expect(
    page.getByRole("banner").getByText("E2E Patient"),
  ).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL("/appointments");
});

test("auth failures never reveal whether an account exists", async ({
  page,
}) => {
  const user = await createTestUser();

  await page.goto("/signup");
  await page.getByLabel("First name").fill("E2E");
  await page.getByLabel("Last name").fill("Patient");
  await page.getByLabel("Email").fill(user.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("a-valid-password-123");
  await page.getByLabel("Confirm password").fill("a-valid-password-123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByText(
      "We couldn't create your account. Try again, or sign in if you already have an account.",
    ),
  ).toBeVisible();

  await page.goto("/login");
  const invalid = page.getByText("Invalid email or password.");
  for (const email of [user.email, `e2e+${crypto.randomUUID()}@example.com`]) {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("a-wrong-password-123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(invalid).toBeVisible();
    await page.reload();
  }
});

test("signed-in users are bounced from auth pages and sign out cleanly", async ({
  page,
}) => {
  const user = await createTestUser();

  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/appointments");

  await page.goto("/login");
  await expect(page).toHaveURL("/appointments");
  await page.goto("/signup");
  await expect(page).toHaveURL("/appointments");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/login");

  await page.goto("/appointments");
  await expect(page).toHaveURL("/login?next=%2Fappointments");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("login form signs in and returns to the requested page", async ({
    page,
  }) => {
    const user = await createTestUser();

    await page.goto("/login?next=%2Fappointments%3Ftab%3Dupcoming");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/appointments?tab=upcoming");
  });
});
