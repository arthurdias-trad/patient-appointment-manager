import { User } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { getDisplayProfile } from "@/lib/profiles/profile";

export async function UserMenu() {
  const { displayName, initials } = await getDisplayProfile();

  return (
    <div className="flex min-w-0 items-center gap-1 sm:gap-3">
      <span
        aria-hidden
        className="grid size-11 shrink-0 place-items-center rounded-full bg-accent font-semibold text-primary"
      >
        {initials ?? <User className="size-5" />}
      </span>
      <span className="sr-only sm:not-sr-only sm:min-w-0 sm:max-w-64">
        <span className="block truncate text-caption text-muted-foreground">
          {displayName ?? "Your account"}
        </span>
      </span>
      <form action={signOut} className="shrink-0">
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="px-3 sm:px-4"
        >
          Sign out
        </Button>
      </form>
    </div>
  );
}
