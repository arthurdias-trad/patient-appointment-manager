import type { ComponentProps } from "react";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  info: { className: "border-info bg-info-bg text-info", Icon: Info },
  success: {
    className: "border-success bg-success-bg text-success",
    Icon: CircleCheck,
  },
  error: {
    className: "border-destructive bg-destructive-bg text-destructive",
    Icon: CircleAlert,
  },
};

type AlertProps = ComponentProps<"div"> & { tone: keyof typeof tones };

export function Alert({ tone, className, children, ...props }: AlertProps) {
  const { className: toneClassName, Icon } = tones[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-md border p-4 text-body",
        toneClassName,
        className,
      )}
      {...props}
    >
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
