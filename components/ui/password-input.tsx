"use client";

import { useState, useSyncExternalStore, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { controlClassName } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<ComponentProps<"input">, "type"> & {
  id: string;
};

const subscribe = () => () => {};

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  // The toggle needs JavaScript, so it appears only after hydration.
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={cn(controlClassName, hydrated && "pr-14", className)}
      />
      {hydrated && (
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-controls={props.id}
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-md text-muted-foreground hover:text-primary"
        >
          {visible ? (
            <EyeOff aria-hidden className="size-5" />
          ) : (
            <Eye aria-hidden className="size-5" />
          )}
        </button>
      )}
    </div>
  );
}
