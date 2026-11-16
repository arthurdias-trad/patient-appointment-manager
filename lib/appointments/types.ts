export type Provider = { id: string; name: string; specialty: string };

export type AppointmentStatus = "scheduled" | "cancelled";

export type Appointment = {
  id: string;
  provider: Provider;
  startsAt: string;
  endsAt: string;
  reason: string;
  status: AppointmentStatus;
};
