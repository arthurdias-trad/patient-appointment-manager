"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

type NavLinkProps = { href: string; children: React.ReactNode };

// Unknown dynamic params can suspend usePathname during prerendering.
// Keep the navigation visible while the pathname resolves.
export function NavLink(props: NavLinkProps) {
  return (
    <Suspense fallback={<NavLinkView {...props} pathname={null} />}>
      <CurrentNavLink {...props} />
    </Suspense>
  );
}

function CurrentNavLink(props: NavLinkProps) {
  return <NavLinkView {...props} pathname={usePathname()} />;
}

function NavLinkView({
  href,
  children,
  pathname,
}: NavLinkProps & { pathname: string | null }) {
  const selected = pathname === href || !!pathname?.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={pathname === href ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center border-b-3 border-transparent font-medium text-foreground hover:text-primary",
        selected && "border-primary font-semibold text-primary",
      )}
    >
      {children}
    </Link>
  );
}
