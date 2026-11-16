import Link from "next/link";
import { IntroPanel } from "@/components/brand/intro-panel";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main id="main" className="grid flex-1 lg:grid-cols-2">
      <IntroPanel className="hidden lg:flex" />
      <div className="mx-auto flex w-full max-w-130 flex-col px-4 py-10 sm:px-8 sm:py-12 lg:justify-center">
        <Link href="/" className="mb-10 self-start rounded-md">
          <Logo className="w-32 sm:w-44" />
        </Link>
        {children}
      </div>
    </main>
  );
}
