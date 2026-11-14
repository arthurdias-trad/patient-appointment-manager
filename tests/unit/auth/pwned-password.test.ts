// @vitest-environment node
import {
  PwnedPasswordCheckUnavailableError,
  isPwnedPassword,
} from "@/lib/auth/pwned-password";
import { afterEach, describe, expect, test, vi } from "vitest";

const OTHER_SUFFIX = "0".repeat(35);
const VALID_RESPONSE = `${OTHER_SUFFIX}:0\r\n`;

const SUFFIX = "1E4C9B93F3F0682250B6CF8331B7EE68FD8";

const respond = (body: string, status = 200) =>
  vi.fn<typeof fetch>(async () => new Response(body, { status }));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isPwnedPassword", () => {
  test("sends only the 5-char hash prefix, with padding", async () => {
    const fetchMock = respond(VALID_RESPONSE);
    await isPwnedPassword("password", { fetch: fetchMock });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.pwnedpasswords.com/range/5BAA6");
    expect(String(url)).not.toContain(SUFFIX);
    expect(new Headers(init?.headers).get("Add-Padding")).toBe("true");
  });

  test.each([SUFFIX, SUFFIX.toLowerCase()])(
    "returns true when suffix %s is listed with a positive count",
    async (suffix) => {
      const fetchMock = respond(`${OTHER_SUFFIX}:1\r\n${suffix}:42\r\n`);
      expect(await isPwnedPassword("password", { fetch: fetchMock })).toBe(true);
    },
  );

  test("returns false for padding entries (count 0) and absent suffixes", async () => {
    expect(
      await isPwnedPassword("password", {
        fetch: respond(`${SUFFIX.toLowerCase()}:0\r\n`),
      }),
    ).toBe(false);
    expect(
      await isPwnedPassword("password", {
        fetch: respond(`${OTHER_SUFFIX}:5\r\n`),
      }),
    ).toBe(false);
  });

  test("returns true immediately after a positive match despite later malformed rows", async () => {
    expect(
      await isPwnedPassword("password", {
        fetch: respond(`${SUFFIX}:42\r\nbroken`),
      }),
    ).toBe(true);
  });

  test.each([
    ["empty body", ""],
    ["whitespace only", " \r\n"],
    ["HTML", "<html>Service unavailable</html>"],
    ["short suffix", "ABC:1"],
    ["non-hex suffix", `${"Z".repeat(35)}:1`],
    ["missing count", `${SUFFIX}:`],
    ["negative count", `${SUFFIX}:-1`],
    ["fractional count", `${SUFFIX}:1.5`],
    ["nonnumeric count", `${SUFFIX}:unknown`],
    ["extra field", `${SUFFIX}:1:2`],
    ["malformed row after a nonmatch", `${OTHER_SUFFIX}:1\r\nbroken`],
  ])("rejects HTTP 200 with %s", async (_label, body) => {
    await expect(
      isPwnedPassword("password", { fetch: respond(body) }),
    ).rejects.toThrow(PwnedPasswordCheckUnavailableError);
  });

  test("throws PwnedPasswordCheckUnavailableError on non-200", async () => {
    await expect(
      isPwnedPassword("password", { fetch: respond("", 503) }),
    ).rejects.toBeInstanceOf(PwnedPasswordCheckUnavailableError);
  });

  test("throws PwnedPasswordCheckUnavailableError on network error", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError("boom"));
    await expect(
      isPwnedPassword("password", { fetch: fetchMock }),
    ).rejects.toBeInstanceOf(PwnedPasswordCheckUnavailableError);
  });

  test("throws PwnedPasswordCheckUnavailableError on timeout", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason),
          );
        }),
    );
    await expect(
      isPwnedPassword("password", { fetch: fetchMock, timeoutMs: 10 }),
    ).rejects.toBeInstanceOf(PwnedPasswordCheckUnavailableError);
  });

  test("error messages never contain the password or hash", async () => {
    const error = await isPwnedPassword("password", {
      fetch: respond("", 500),
    }).catch((e: Error) => e);
    expect((error as Error).message).not.toMatch(/5BAA6|1E4C9B/i);
  });

  test("uses the configured range URL", async () => {
    const fetchMock = respond(VALID_RESPONSE);
    await isPwnedPassword("password", {
      fetch: fetchMock,
      rangeUrl: "http://127.0.0.1:3101/range/",
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://127.0.0.1:3101/range/5BAA6",
    );
  });

  test("reads the range URL from HIBP_RANGE_URL", async () => {
    vi.stubEnv("HIBP_RANGE_URL", "http://127.0.0.1:3101/range/");
    const fetchMock = respond(VALID_RESPONSE);
    await isPwnedPassword("password", { fetch: fetchMock });
    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://127.0.0.1:3101/range/5BAA6",
    );
  });

  describe("in production", () => {
    test("refuses a non-HTTPS range URL unless the host is 127.0.0.1", async () => {
      vi.stubEnv("NODE_ENV", "production");
      const fetchMock = respond(VALID_RESPONSE);
      await expect(
        isPwnedPassword("password", {
          fetch: fetchMock,
          rangeUrl: "http://hibp.example.com/range/",
        }),
      ).rejects.toBeInstanceOf(PwnedPasswordCheckUnavailableError);
      expect(fetchMock).not.toHaveBeenCalled();

      await expect(
        isPwnedPassword("password", {
          fetch: fetchMock,
          rangeUrl: "http://127.0.0.1:3101/range/",
        }),
      ).resolves.toBe(false);
    });

    test("refuses an invalid range URL", async () => {
      vi.stubEnv("NODE_ENV", "production");
      const fetchMock = respond(VALID_RESPONSE);
      await expect(
        isPwnedPassword("password", {
          fetch: fetchMock,
          rangeUrl: "not a url",
        }),
      ).rejects.toBeInstanceOf(PwnedPasswordCheckUnavailableError);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
