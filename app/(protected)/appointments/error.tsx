"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function AppointmentsError({ retry }: { retry: () => void }) {
  return (
    <main
      id="main"
      className="mx-auto w-full max-w-300 px-4 py-8 sm:px-8 sm:py-12"
    >
      <h1 className="mb-6 text-heading-lg font-semibold text-primary">
        Your appointments
      </h1>
      <Alert tone="error" className="items-start">
        <p>We couldn&apos;t load your appointments.</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={retry}>
          Try again
        </Button>
      </Alert>
    </main>
  );
}
