import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const tones = {
  info: "bg-info-bg text-info",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  neutral: "bg-muted text-muted-foreground",
};

type BadgeProps = ComponentProps<"span"> & { tone: keyof typeof tones };

export function Badge({ tone, className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
