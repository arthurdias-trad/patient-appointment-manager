import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";

export const controlClassName =
  "min-h-12 w-full rounded-md border border-input bg-card px-4 py-2 text-body text-foreground placeholder:text-muted-foreground not-aria-invalid:hover:border-primary aria-[invalid=true]:border-destructive disabled:opacity-65";

type ControlAriaProps = {
  id: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
  required?: true;
};

type FieldProps = {
  id: string;
  label: string;
  hint?: ReactNode;
  errors?: string[];
  required?: boolean;
  children: (aria: ControlAriaProps) => ReactNode;
};

export function Field({
  id,
  label,
  hint,
  errors,
  required,
  children,
}: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = errors?.length ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": errorId ? true : undefined,
        "aria-describedby": describedBy || undefined,
        required: required ? true : undefined,
      })}
      {hintId && (
        <div id={hintId} className="text-caption text-muted-foreground">
          {hint}
        </div>
      )}
      {errorId && (
        <div id={errorId} className="flex gap-2 text-destructive">
          <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
          <div>
            {errors?.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
