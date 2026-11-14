import { isPwnedPassword } from "@/lib/auth/pwned-password";
import { expect, test } from "vitest";

test.skipIf(!process.env.HIBP_LIVE)(
  "live HIBP lists SHA-1('password')",
  async () => {
    expect(await isPwnedPassword("password")).toBe(true);
  },
);
