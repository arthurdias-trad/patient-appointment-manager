import { Suspense } from "react";
import { UserMenu } from "./user-menu";

export default function ProtectedLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <span className="font-semibold">Patient Appointment Manager</span>
        <Suspense>
          <UserMenu />
        </Suspense>
      </header>
      {children}
    </>
  );
}
