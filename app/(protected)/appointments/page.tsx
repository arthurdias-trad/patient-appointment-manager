import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listAppointments } from "@/lib/appointments/service";
import { getCurrentUser } from "@/lib/auth/dal";
import { NoticeBanner } from "../notice";
import { groupAppointments, type AppointmentTab } from "./_lib/phase";
import { AppointmentCard } from "./appointment-card";
import { AppointmentTabs } from "./appointment-tabs";

const emptyStates: Record<AppointmentTab, { title: string; text: string }> = {
  upcoming: {
    title: "No upcoming appointments",
    text: "Appointments you book will appear here.",
  },
  past: {
    title: "No past appointments",
    text: "Appointments that have ended will appear here.",
  },
  cancelled: {
    title: "No cancelled appointments",
    text: "Appointments you cancel will appear here.",
  },
};

function BookLink({ className }: { className?: string }) {
  return (
    <Button asChild className={className}>
      <Link href="/appointments/new">
        <Plus aria-hidden />
        Book appointment
      </Link>
    </Button>
  );
}

function EmptyState({ tab }: { tab: AppointmentTab }) {
  const { title, text } = emptyStates[tab];
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card px-4 py-12 text-center sm:px-6 sm:py-16">
      <CalendarDays aria-hidden className="mb-2 size-10 text-primary" />
      <h2 className="text-heading-sm font-semibold">{title}</h2>
      <p className="text-muted-foreground">{text}</p>
      {tab === "upcoming" && <BookLink className="mt-4" />}
    </div>
  );
}

function ListSkeleton() {
  return (
    <Card className="min-h-64 bg-muted">
      <span className="sr-only">Loading appointments</span>
    </Card>
  );
}

async function Appointments() {
  await getCurrentUser();
  const appointments = await listAppointments();
  const now = new Date();
  const groups = groupAppointments(appointments, now);

  const panel = (tab: AppointmentTab) =>
    groups[tab].length ? (
      <ul className="flex flex-col gap-4">
        {groups[tab].map(({ appointment, phase }) => (
          <li key={appointment.id}>
            <AppointmentCard appointment={appointment} phase={phase} />
          </li>
        ))}
      </ul>
    ) : (
      <EmptyState tab={tab} />
    );

  return (
    <Suspense fallback={<ListSkeleton />}>
      <AppointmentTabs
        counts={{
          upcoming: groups.upcoming.length,
          past: groups.past.length,
          cancelled: groups.cancelled.length,
        }}
        panels={{
          upcoming: panel("upcoming"),
          past: panel("past"),
          cancelled: panel("cancelled"),
        }}
      />
    </Suspense>
  );
}

const bookingSteps = [
  "Choose a provider.",
  "Pick a date and a 30-minute time.",
  "Tell us the reason for your visit.",
];

function BookingAside() {
  return (
    <aside aria-labelledby="booking-heading" className="hidden lg:block">
      <div className="rounded-lg bg-accent p-6">
        <h2
          id="booking-heading"
          className="text-lead font-semibold text-primary"
        >
          Booking an appointment
        </h2>
        <ol className="mt-4 flex flex-col gap-4 border-t border-border pt-4 text-caption">
          {bookingSteps.map((step, index) => (
            <li key={step} className="flex items-center gap-3">
              <span
                aria-hidden
                className="grid size-6 shrink-0 place-items-center rounded-full border border-primary text-caption font-semibold text-primary"
              >
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-6 flex flex-col gap-3 text-caption text-muted-foreground">
        <p>
          You can edit or cancel an upcoming appointment before it starts.
        </p>
        <p>
          Cancelled appointments stay in your history until you delete them.
        </p>
      </div>
    </aside>
  );
}

export default function AppointmentsPage() {
  return (
    <main
      id="main"
      className="mx-auto w-full max-w-300 px-4 py-8 sm:px-8 sm:py-12"
    >
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-heading-lg font-semibold text-primary">
          Your appointments
        </h1>
        <BookLink className="w-full sm:w-auto" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex min-w-0 flex-col gap-6">
          <NoticeBanner />
          <Suspense fallback={<ListSkeleton />}>
            <Appointments />
          </Suspense>
        </div>
        <BookingAside />
      </div>
    </main>
  );
}
