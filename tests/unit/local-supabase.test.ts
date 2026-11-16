import { describe, expect, it } from "vitest";
import { assertLocalSupabase } from "../support/local-supabase";

describe("local Supabase test guard", () => {
  it.each([
    "http://localhost:54321",
    "http://127.0.0.1:54321",
    "http://[::1]:54321",
  ])("allows loopback URL %s", (url) => {
    expect(() => assertLocalSupabase(url)).not.toThrow();
  });

  it.each([
    undefined,
    "",
    "not a URL",
    "https://example.supabase.co",
    "https://localhost.example.com",
    "https://localhost@remote.example.com",
    "ftp://localhost:54321",
  ])("rejects unsafe or missing URL %s", (url) => {
    expect(() => assertLocalSupabase(url)).toThrow(/local Supabase/);
  });
});
