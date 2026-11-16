"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { Appointment } from "@/lib/appointments/types";
import { useNotice } from "../notice";
import { errorMessageFor, sendAppointmentMutation } from "./_lib/api-client";
import { allowedActions, type AppointmentPhase } from "./_lib/phase";

const confirmations = {
  cancel: {
    trigger: "Cancel",
    title: "Cancel this appointment?",
    text: "It will move to your cancelled appointments.",
    confirm: "Cancel appointment",
    pending: "Cancelling…",
    success: "Appointment cancelled.",
  },
  delete: {
    trigger: "Delete",
    title: "Delete this appointment?",
    text: "This removes it from your appointments. This can't be undone.",
    confirm: "Delete appointment",
    pending: "Deleting…",
    success: "Appointment deleted.",
  },
};

export type AppointmentSummary = {
  provider: string;
  date: string;
  time: string;
};

type Kind = keyof typeof confirmations;
type FocusTarget = "[role=tab][aria-selected=true]" | "#list-notice";

function ConfirmAction({
  kind,
  appointmentId,
  summary,
}: {
  kind: Kind;
  appointmentId: string;
  summary: AppointmentSummary;
}) {
  const copy = confirmations[kind];
  const router = useRouter();
  const { showNotice } = useNotice();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; signIn: boolean }>();
  const focusAfterClose = useRef<FocusTarget | null>(null);

  function close(target: FocusTarget, message: string, tone?: "error") {
    focusAfterClose.current = target;
    setOpen(false);
    showNotice(message, tone);
    router.refresh();
  }

  async function confirm() {
    setPending(true);
    setError(undefined);
    const path = `/api/appointments/${appointmentId}`;
    const result = await sendAppointmentMutation(
      kind === "cancel"
        ? { method: "PATCH", path, body: { status: "cancelled" } }
        : { method: "DELETE", path },
    );
    setPending(false);

    if (result.ok) {
      close("[role=tab][aria-selected=true]", copy.success);
    } else if (result.status === 404 || result.status === 409) {
      close("#list-notice", errorMessageFor(result), "error");
    } else {
      setError({
        message: errorMessageFor(result),
        signIn: result.status === 401,
      });
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (next) setError(undefined);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="ghostDestructive" size="sm">
          {copy.trigger}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          const target = focusAfterClose.current;
          if (!target) return;
          focusAfterClose.current = null;
          event.preventDefault();
          document.querySelector<HTMLElement>(target)?.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.text}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="rounded-md border border-border bg-muted p-4">
          <p className="font-semibold wrap-anywhere">{summary.provider}</p>
          <p>{summary.date}</p>
          <p>{summary.time}</p>
        </div>
        {error && (
          <Alert tone="error">
            {error.message}
            {error.signIn && (
              <>
                {" "}
                <Link
                  href="/login?next=/appointments"
                  className="font-semibold underline"
                >
                  Sign in
                </Link>
              </>
            )}
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            Keep appointment
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={confirm}
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? copy.pending : copy.confirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type AppointmentActionsProps = {
  appointment: Appointment;
  phase: AppointmentPhase;
  summary: AppointmentSummary;
};

export function AppointmentActions({
  appointment,
  phase,
  summary,
}: AppointmentActionsProps) {
  const allowed = allowedActions(phase);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      {allowed.edit ? (
        <Button asChild variant="ghost" size="sm">
          <Link href={`/appointments/${appointment.id}/edit`}>
            <Pencil aria-hidden />
            Edit appointment
          </Link>
        </Button>
      ) : (
        <p className="text-caption text-muted-foreground">
          {phase === "cancelled"
            ? "Kept in your appointment history"
            : phase === "in_progress"
              ? "This appointment is in progress."
              : "This appointment has already ended."}
        </p>
      )}
      {allowed.cancel && (
        <ConfirmAction
          kind="cancel"
          appointmentId={appointment.id}
          summary={summary}
        />
      )}
      {allowed.delete && (
        <ConfirmAction
          kind="delete"
          appointmentId={appointment.id}
          summary={summary}
        />
      )}
    </div>
  );
}
