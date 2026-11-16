"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { controlClassName, Field } from "@/components/ui/field";
import {
  APPOINTMENT_MINUTES,
  REASON_MAX_CHARS,
} from "@/lib/appointments/schemas";
import type { Appointment, Provider } from "@/lib/appointments/types";
import { cn } from "@/lib/utils";
import { useNotice } from "../notice";
import { sendAppointmentMutation } from "./_lib/api-client";
import {
  BOOKING_START_TIMES,
  CLINIC_TIME_ZONE_LABEL,
  formatClockTime,
} from "./_lib/clinic-time";
import { toFormErrors } from "./_lib/form-errors";
import {
  EMPTY_VALUES,
  prepareCreate,
  preparePatch,
  valuesFromAppointment,
  type AppointmentFormErrors,
  type AppointmentFormField,
  type AppointmentFormValues,
} from "./_lib/form-model";

const FIELD_ORDER: readonly AppointmentFormField[] = [
  "providerId",
  "date",
  "time",
  "reason",
];

const COUNTER_WARNING_THRESHOLD = 50;

type AppointmentFormProps = {
  providers: Provider[];
  minDate: string;
  appointment?: Appointment;
};

function FormAside({ editing }: { editing: boolean }) {
  const headingId = useId();
  return (
    <aside aria-labelledby={headingId} className="hidden lg:block">
      <div className="rounded-lg bg-accent p-6">
        <h2 id={headingId} className="text-lead font-semibold text-primary">
          {editing ? "A change of plans?" : "Before you book"}
        </h2>
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 text-caption">
          <p>
            Each visit is {APPOINTMENT_MINUTES} minutes with the provider you
            choose.
          </p>
          <p>
            {editing
              ? "To cancel this appointment, go back to your appointments and choose Cancel."
              : "You can change the provider, time or reason before your appointment starts."}
          </p>
        </div>
      </div>
    </aside>
  );
}

export function AppointmentForm({
  providers,
  minDate,
  appointment,
}: AppointmentFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { showNotice } = useNotice();
  // Next keeps visited pages mounted but hidden, so ids must be per instance.
  const idPrefix = useId();
  const fieldId = (field: AppointmentFormField) => `${idPrefix}${field}`;
  const [sourceAppointment, setSourceAppointment] = useState(appointment);
  const [initial, setInitial] = useState(() =>
    appointment ? valuesFromAppointment(appointment) : EMPTY_VALUES,
  );
  const [values, setValues] = useState<AppointmentFormValues>(initial);
  const [errors, setErrors] = useState<AppointmentFormErrors | null>(null);
  const [pending, setPending] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const focusErrors = useRef(false);

  const pristine = FIELD_ORDER.every(
    (field) => values[field] === initial[field],
  );
  // Refresh pristine forms; keep an active draft until it is saved or discarded.
  if (sourceAppointment !== appointment && pristine && !pending) {
    const refreshed = appointment
      ? valuesFromAppointment(appointment)
      : EMPTY_VALUES;
    setSourceAppointment(appointment);
    setInitial(refreshed);
    setValues(refreshed);
    setErrors(null);
  }

  function discard() {
    const refreshed = appointment
      ? valuesFromAppointment(appointment)
      : EMPTY_VALUES;
    setSourceAppointment(appointment);
    setInitial(refreshed);
    setValues(refreshed);
    setErrors(null);
    focusErrors.current = false;
  }

  // Focus after render so the field's error is already in its description.
  useEffect(() => {
    if (!focusErrors.current || !errors) return;
    focusErrors.current = false;
    const field = FIELD_ORDER.find((name) => errors.fieldErrors[name]);
    (field
      ? document.getElementById(`${idPrefix}${field}`)
      : summaryRef.current
    )?.focus();
  }, [errors, idPrefix]);

  function showErrors(next: AppointmentFormErrors) {
    focusErrors.current = true;
    setErrors(next);
  }

  function update(field: AppointmentFormField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current?.fieldErrors[field]) return current;
      const fieldErrors = { ...current.fieldErrors };
      delete fieldErrors[field];
      return { ...current, fieldErrors };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setErrors(null);

    const prepared = appointment
      ? preparePatch(initial, values)
      : prepareCreate(values);
    if ("errors" in prepared) {
      showErrors(prepared.errors);
      return;
    }

    setPending(true);
    const result = await sendAppointmentMutation(
      appointment
        ? {
            method: "PATCH",
            path: `/api/appointments/${appointment.id}`,
            body: prepared.body,
          }
        : { method: "POST", path: "/api/appointments", body: prepared.body },
    );

    setPending(false);
    if (result.ok) {
      const savedValues = appointment
        ? { ...values, reason: values.reason.trim() }
        : EMPTY_VALUES;
      setInitial(savedValues);
      setValues(savedValues);
      setErrors(null);
      focusErrors.current = false;
      showNotice(
        appointment
          ? "Your changes have been saved."
          : "Your appointment has been booked.",
      );
      router.push("/appointments");
      return;
    }
    showErrors(toFormErrors(result.status, result.body));
  }

  const submitLabel = appointment
    ? { idle: "Save changes", pending: "Saving…" }
    : { idle: "Book appointment", pending: "Booking…" };
  const reasonLength = [...values.reason].length;
  const remaining = REASON_MAX_CHARS - reasonLength;

  return (
    <div className="grid max-w-180 items-start gap-6 lg:max-w-none lg:grid-cols-[minmax(0,45rem)_280px] lg:grid-rows-[auto_1fr] lg:gap-x-8">
      <Card className="lg:row-span-2">
        <h2 className="text-heading-sm font-semibold">Appointment details</h2>
        <p className="text-caption text-muted-foreground">
          All fields are required.
        </p>
        <form
          noValidate
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-6"
        >
          {errors && errors.formErrors.length > 0 && (
            <Alert ref={summaryRef} tone="error" tabIndex={-1}>
              {errors.formErrors.map((message) => (
                <p key={message}>{message}</p>
              ))}
              {errors.signInRequired && (
                <Link
                  href={`/login?next=${encodeURIComponent(pathname)}`}
                  className="inline-flex min-h-11 items-center rounded-sm font-semibold underline"
                >
                  Sign in
                </Link>
              )}
            </Alert>
          )}
          <Field
            id={fieldId("providerId")}
            label="Provider"
            required
            errors={errors?.fieldErrors.providerId}
          >
            {(aria) => (
              <select
                {...aria}
                name="providerId"
                value={values.providerId}
                onChange={(event) => update("providerId", event.target.value)}
                className={controlClassName}
              >
                <option value="">Select a provider</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name} · {provider.specialty}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div className="grid items-start gap-6 sm:grid-cols-2">
            <Field
              id={fieldId("date")}
              label="Appointment date"
              required
              errors={errors?.fieldErrors.date}
            >
              {(aria) => (
                <input
                  {...aria}
                  name="date"
                  type="date"
                  min={minDate}
                  value={values.date}
                  onChange={(event) => update("date", event.target.value)}
                  className={controlClassName}
                />
              )}
            </Field>
            <Field
              id={fieldId("time")}
              label="Start time"
              required
              hint={
                <span className="flex gap-2">
                  <Clock aria-hidden className="mt-0.5 size-4 shrink-0" />
                  Each appointment lasts {APPOINTMENT_MINUTES} minutes. Times
                  are in {CLINIC_TIME_ZONE_LABEL}.
                </span>
              }
              errors={errors?.fieldErrors.time}
            >
              {(aria) => (
                <select
                  {...aria}
                  name="time"
                  value={values.time}
                  onChange={(event) => update("time", event.target.value)}
                  className={controlClassName}
                >
                  <option value="">Select a start time</option>
                  {BOOKING_START_TIMES.map((time) => (
                    <option key={time} value={time}>
                      {formatClockTime(time)}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <Field
            id={fieldId("reason")}
            label="Reason for appointment"
            required
            hint={
              <span className="flex justify-between gap-4">
                A brief description is all you need.
                <span className={cn(remaining < 0 && "text-destructive")}>
                  {reasonLength}/{REASON_MAX_CHARS}
                </span>
              </span>
            }
            errors={errors?.fieldErrors.reason}
          >
            {(aria) => (
              <textarea
                {...aria}
                name="reason"
                rows={4}
                placeholder="What would you like to discuss?"
                value={values.reason}
                onChange={(event) => update("reason", event.target.value)}
                className={cn(controlClassName, "min-h-30 resize-y")}
              />
            )}
          </Field>
          <p role="status" className="sr-only">
            {remaining < 0
              ? `${-remaining} characters over the limit.`
              : remaining <= COUNTER_WARNING_THRESHOLD &&
                `${remaining} characters remaining.`}
          </p>
          <div className="flex flex-col-reverse gap-4 border-t border-border pt-6 sm:flex-row sm:justify-between">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/appointments" onClick={discard}>
                Discard changes
              </Link>
            </Button>
            <Button
              type="submit"
              disabled={pending}
              aria-busy={pending || undefined}
              className="w-full sm:w-auto"
            >
              {pending ? submitLabel.pending : submitLabel.idle}
            </Button>
          </div>
        </form>
      </Card>
      <FormAside editing={Boolean(appointment)} />
      <p className="rounded-md border border-border bg-muted px-4 py-3 text-caption text-muted-foreground">
        Providers are sample entries. Offered times don&apos;t reflect provider
        availability.
      </p>
    </div>
  );
}
