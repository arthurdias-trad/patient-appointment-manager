import Link from "next/link";
import { LoginForm } from "./login-form";

export const instant = false;

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <>
      <h1 className="mb-3 text-heading-lg font-semibold tracking-tight text-primary">
        Welcome back
      </h1>
      <p className="mb-8 text-muted-foreground">
        Sign in to manage your appointments.
      </p>
      <LoginForm next={typeof next === "string" ? next : ""} />
      <p className="mt-6 text-center text-caption">
        New to the portal?{" "}
        <Link
          href="/signup"
          className="inline-flex min-h-11 items-center rounded-sm font-semibold text-primary underline"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}
