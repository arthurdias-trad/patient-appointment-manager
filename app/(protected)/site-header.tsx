import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { NavLink } from "./nav-link";
import { UserMenu } from "./user-menu";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex min-h-20 max-w-300 items-center justify-between gap-2 px-4 sm:min-h-24 sm:gap-6 sm:px-8">
        <Link href="/appointments" className="shrink-0 rounded-md">
          <Logo className="w-32 sm:w-55" />
        </Link>
        <div className="flex min-w-0 items-center gap-2 sm:gap-8">
          <nav aria-label="Main" className="hidden sm:block">
            <NavLink href="/appointments">Appointments</NavLink>
          </nav>
          <Suspense
            fallback={
              <span aria-hidden className="size-11 rounded-full bg-accent" />
            }
          >
            <UserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
