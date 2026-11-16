import { CalendarDays, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Appointment } from "@/lib/appointments/types";
import {
  CLINIC_TIME_ZONE_LABEL,
  formatAppointmentDate,
  formatAppointmentTimeRange,
} from "./_lib/clinic-time";
import type { AppointmentPhase } from "./_lib/phase";
import { AppointmentActions } from "./appointment-actions";

const badges = {
  upcoming: { tone: "info", label: "Scheduled" },
  in_progress: { tone: "warning", label: "In progress" },
  past: { tone: "success", label: "Past" },
  cancelled: { tone: "neutral", label: "Cancelled" },
} as const;

function providerInitials(name: string): string {
  return name
    .replace(/^dr\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

type AppointmentCardProps = {
  appointment: Appointment;
  phase: AppointmentPhase;
};

export function AppointmentCard({
  appointment,
  phase,
}: AppointmentCardProps) {
  const { provider } = appointment;
  const badge = badges[phase];
  const date = formatAppointmentDate(appointment.startsAt);
  const timeRange = formatAppointmentTimeRange(
    appointment.startsAt,
    appointment.endsAt,
  );

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-4">
          <span
            aria-hidden
            className="grid size-12 shrink-0 place-items-center rounded-lg bg-accent font-semibold text-accent-foreground"
          >
            {providerInitials(provider.name)}
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold wrap-anywhere sm:text-lead">
              {provider.name}
            </h2>
            <p className="text-caption text-muted-foreground">
              {provider.specialty}
            </p>
          </div>
        </div>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </div>
      <div className="grid gap-3 border-b border-border pb-5 sm:grid-cols-2 sm:gap-4">
        <div className="flex items-center gap-3">
          <CalendarDays aria-hidden className="size-5 shrink-0 text-primary" />
          <p className="font-semibold">{date}</p>
        </div>
        <div className="flex items-center gap-3">
          <Clock aria-hidden className="size-5 shrink-0 text-primary" />
          <div>
            <p className="font-semibold">{timeRange}</p>
            <p className="text-caption text-muted-foreground">
              30 minutes · {CLINIC_TIME_ZONE_LABEL}
            </p>
          </div>
        </div>
      </div>
      <div>
        <p className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">
          Reason for appointment
        </p>
        <p className="mt-1 wrap-anywhere">{appointment.reason}</p>
      </div>
      <AppointmentActions
        appointment={appointment}
        phase={phase}
        summary={{ provider: provider.name, date, time: timeRange }}
      />
    </Card>
  );
}
