import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function FormSkeleton() {
  return (
    <Card className="min-h-96 max-w-180 bg-muted">
      <span className="sr-only">Loading appointment form</span>
    </Card>
  );
}

export function FormPageShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main
      id="main"
      className="mx-auto w-full max-w-300 px-4 py-8 sm:px-8 sm:py-12"
    >
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-4">
        <Link href="/appointments">
          <ArrowLeft aria-hidden />
          Back to appointments
        </Link>
      </Button>
      <h1 className="mb-8 text-heading-lg font-semibold text-primary">
        {title}
      </h1>
      <Suspense fallback={<FormSkeleton />}>{children}</Suspense>
    </main>
  );
}
