// @vitest-environment node
import { resolveAuthRedirect, safeNextPath } from "@/lib/auth/redirects";
import { describe, expect, test } from "vitest";

describe("safeNextPath", () => {
  test.each([
    ["/appointments?x=1", "/appointments?x=1"],
    ["/appointments?x=1#top", "/appointments?x=1#top"],
    [null, "/appointments"],
    [undefined, "/appointments"],
    ["", "/appointments"],
    ["appointments", "/appointments"],
    ["https://evil.com", "/appointments"],
    ["//evil.com", "/appointments"],
    ["/\\evil.com", "/appointments"],
    ["/\\/evil.com", "/appointments"],
    ["/\t/evil.com", "/appointments"],
    ["/\n/evil.com", "/appointments"],
    ["javascript:alert(1)", "/appointments"],
    ["/login", "/appointments"],
    ["/login?next=/login", "/appointments"],
    ["/./login", "/appointments"],
    ["/a/../signup?x=1", "/appointments"],
    ["/signup?x=1", "/appointments"],
  ])("safeNextPath(%j) -> %s", (next, expected) => {
    expect(safeNextPath(next)).toBe(expected);
  });
});

describe("resolveAuthRedirect", () => {
  test.each([
    ["/appointments", "?x=1", false, "/login?next=%2Fappointments%3Fx%3D1"],
    ["/settings", "", false, "/login?next=%2Fsettings"],
    ["/apix", "", false, "/login?next=%2Fapix"],
    ["/", "", false, null],
    ["/login", "", false, null],
    ["/signup", "", false, null],
    ["/api", "", false, null],
    ["/api/appointments", "", false, null],
    ["/api/appointments", "", true, null],
    ["/login", "", true, "/appointments"],
    ["/signup", "", true, "/appointments"],
    ["/", "", true, null],
    ["/appointments", "", true, null],
  ])("%s%s authed=%s -> %s", (pathname, search, isAuthenticated, expected) => {
    expect(resolveAuthRedirect({ pathname, search, isAuthenticated })).toBe(
      expected,
    );
  });
});
