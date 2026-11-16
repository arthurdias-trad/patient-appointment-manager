import Link from "next/link";

export default function Home() {
  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-4 py-16"
    >
      <h1 className="text-3xl font-semibold">Patient Appointment Manager</h1>
      <p>Keep track of your own appointments in one place.</p>
      <div className="flex gap-4">
        <Link href="/login" className="underline">
          Sign in
        </Link>
        <Link href="/signup" className="underline">
          Create account
        </Link>
      </div>
    </main>
  );
}
