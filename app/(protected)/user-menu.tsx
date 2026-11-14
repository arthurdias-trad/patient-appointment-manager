import { signOut } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/lib/auth/dal";

export async function UserMenu() {
  const { firstName, middleName, lastName } = await getCurrentUser();
  const displayName = [firstName, middleName, lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex items-center gap-4 text-sm">
      <span>Signed in as {displayName}</span>
      <form action={signOut}>
        <button type="submit" className="underline">
          Sign out
        </button>
      </form>
    </div>
  );
}
