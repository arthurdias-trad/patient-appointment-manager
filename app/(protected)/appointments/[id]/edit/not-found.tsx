import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppointmentNotFound() {
  return (
    <main
      id="main"
      className="mx-auto w-full max-w-300 px-4 py-8 sm:px-8 sm:py-12"
    >
      <h1 className="mb-3 text-heading-lg font-semibold text-primary">
        Appointment not found
      </h1>
      <p className="mb-8 text-muted-foreground">
        We couldn&apos;t find that appointment. It may have been deleted.
      </p>
      <Button asChild>
        <Link href="/appointments">Back to appointments</Link>
      </Button>
    </main>
  );
}
