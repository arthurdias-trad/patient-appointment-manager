import type { ComponentProps } from "react";

type InputFieldProps = Omit<ComponentProps<"input">, "id"> & {
  id: string;
  label: string;
  errors?: string[];
};

export function InputField({ label, errors, id, ...props }: InputFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={errors ? true : undefined}
        aria-describedby={errors ? errorId : undefined}
        className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700"
        {...props}
      />
      {errors && (
        <p id={errorId} className="text-sm text-red-600">
          {errors.join(" ")}
        </p>
      )}
    </div>
  );
}
