import Link from "next/link";
import { LoginForm } from "./login-form";

export const instant = false;

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-16"
    >
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <LoginForm next={typeof next === "string" ? next : ""} />
      <p className="text-sm">
        No account?{" "}
        <Link href="/signup" className="underline">
          Create one
        </Link>
      </p>
    </main>
  );
}
