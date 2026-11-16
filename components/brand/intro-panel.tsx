import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type IntroPanelProps = {
  titleAs?: "h1" | "p";
  className?: string;
  contentClassName?: string;
  children?: ReactNode;
};

export function IntroPanel({
  titleAs: Title = "p",
  className,
  contentClassName,
  children,
}: IntroPanelProps) {
  return (
    <section
      className={cn(
        "flex flex-col justify-center bg-secondary py-12 sm:py-20",
        className,
      )}
    >
      <div className={cn("px-4 sm:px-16", contentClassName)}>
        <div aria-hidden className="mb-8 h-2 w-16 rounded-md bg-brand-cyan" />
        <Title className="mb-4 max-w-120 text-heading-lg font-semibold tracking-tight text-primary">
          A little less to manage.
          <br />
          More time for care.
        </Title>
        <p className="max-w-100 text-lead text-muted-foreground">
          Your appointments, together in one place. Plan your next visit and
          keep track of what’s ahead.
        </p>
        {children}
      </div>
    </section>
  );
}
