import Link from "next/link";
import { IntroPanel } from "@/components/brand/intro-panel";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex min-h-20 max-w-300 items-center px-4 sm:min-h-24 sm:px-8">
          <Logo className="w-32 sm:w-55" />
        </div>
      </header>
      <main id="main" className="flex flex-1 flex-col">
        <IntroPanel
          titleAs="h1"
          className="flex-1"
          contentClassName="mx-auto w-full max-w-300 sm:px-8"
        >
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Button asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/signup">Create account</Link>
            </Button>
          </div>
        </IntroPanel>
      </main>
    </>
  );
}
