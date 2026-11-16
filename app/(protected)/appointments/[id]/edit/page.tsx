import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/errors";
import { getAppointment, listProviders } from "@/lib/appointments/service";
import { getCurrentUser } from "@/lib/auth/dal";
import { clinicToday } from "../../_lib/clinic-time";
import { appointmentPhase } from "../../_lib/phase";
import { AppointmentForm } from "../../appointment-form";
import { FormPageShell } from "../../form-page-shell";

export const metadata: Metadata = { title: "Edit appointment" };

async function EditAppointment({
  params,
}: {
  params: PageProps<"/appointments/[id]/edit">["params"];
}) {
  const { id } = await params;
  await getCurrentUser();

  const [appointment, providers] = await Promise.all([
    getAppointment(id),
    listProviders(),
  ]).catch((error: unknown) => {
    if (error instanceof ApiError && error.code === "not_found") notFound();
    throw error;
  });

  const now = new Date();
  if (appointmentPhase(appointment, now) !== "upcoming") {
    return (
      <div className="flex max-w-180 flex-col items-start gap-6">
        <Alert tone="info" className="w-full">
          This appointment has started or was cancelled, so it can&apos;t be
          changed.
        </Alert>
        <Button asChild variant="outline">
          <Link href="/appointments">Back to appointments</Link>
        </Button>
      </div>
    );
  }

  return (
    <AppointmentForm
      providers={providers}
      minDate={clinicToday(now)}
      appointment={appointment}
    />
  );
}

export default function EditAppointmentPage(
  props: PageProps<"/appointments/[id]/edit">,
) {
  return (
    <FormPageShell title="Edit appointment">
      <EditAppointment params={props.params} />
    </FormPageShell>
  );
}
