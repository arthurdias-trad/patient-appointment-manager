export function assertLocalSupabase(url: string | undefined): void {
  const message =
    "Tests require local Supabase. Set NEXT_PUBLIC_SUPABASE_URL to an HTTP(S) loopback URL.";
  let parsed: URL;
  try {
    parsed = new URL(url ?? "");
  } catch {
    throw new Error(message);
  }

  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)
  ) {
    throw new Error(message);
  }
}
