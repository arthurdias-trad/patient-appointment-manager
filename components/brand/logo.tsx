import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/visitharbor-logo.svg"
      alt="VisitHarbor"
      width={550}
      height={144}
      loading="eager"
      className={cn("h-auto w-42 sm:w-55", className)}
    />
  );
}
