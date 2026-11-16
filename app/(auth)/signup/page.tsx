import Link from "next/link";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <>
      <h1 className="mb-8 text-heading-lg font-semibold tracking-tight text-primary">
        Create your account
      </h1>
      <SignupForm />
      <p className="mt-6 text-center text-caption">
        Already have an account?{" "}
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center rounded-sm font-semibold text-primary underline"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
