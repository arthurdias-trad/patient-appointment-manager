import { getCurrentUser } from "@/lib/auth/dal";
import { Suspense } from "react";

async function Appointments() {
  await getCurrentUser();
  return <p>You have no appointments yet.</p>;
}

export default function AppointmentsPage() {
  return (
    <main
      id="main"
      className="mx-auto w-full max-w-3xl px-4 py-8"
    >
      <h1 className="mb-4 text-2xl font-semibold">Your appointments</h1>
      <Suspense>
        <Appointments />
      </Suspense>
    </main>
  );
}
