import { getCurrentUser } from "@/lib/auth/dal";
import { displayNameFor, initialsFor } from "@/lib/profiles/display-name";
import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import "server-only";

export type DisplayProfile = {
  displayName: string | null;
  initials: string | null;
};

export const getDisplayProfile = cache(async (): Promise<DisplayProfile> => {
  const { id } = await getCurrentUser();
  const client = await createClient();
  const { data, error } = await client
    .from("profiles")
    .select("first_name, middle_name, last_name")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Unexpected profile read error", { code: error.code });
  }
  if (!data) return { displayName: null, initials: null };

  const names = {
    firstName: data.first_name,
    middleName: data.middle_name,
    lastName: data.last_name,
  };
  return { displayName: displayNameFor(names), initials: initialsFor(names) };
});
