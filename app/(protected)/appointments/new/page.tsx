import type { Metadata } from "next";
import { listProviders } from "@/lib/appointments/service";
import { getCurrentUser } from "@/lib/auth/dal";
import { clinicToday } from "../_lib/clinic-time";
import { AppointmentForm } from "../appointment-form";
import { FormPageShell } from "../form-page-shell";

export const metadata: Metadata = { title: "Book an appointment" };

async function NewAppointment() {
  await getCurrentUser();
  const providers = await listProviders();
  return (
    <AppointmentForm providers={providers} minDate={clinicToday(new Date())} />
  );
}

export default function NewAppointmentPage() {
  return (
    <FormPageShell title="Book an appointment">
      <NewAppointment />
    </FormPageShell>
  );
}
