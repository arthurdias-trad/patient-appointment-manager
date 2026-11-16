export type ProfileNames = {
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
};

const clean = (part: string | null) => part?.trim() || null;

export function displayNameFor(names: ProfileNames): string | null {
  const parts = [names.firstName, names.middleName, names.lastName]
    .map(clean)
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

export function initialsFor(names: ProfileNames): string | null {
  const initials = [clean(names.firstName), clean(names.lastName)]
    .map((part) => Array.from(part ?? "")[0] ?? "")
    .join("")
    .toUpperCase();
  return initials || null;
}
