import "server-only";

export const DEFAULT_HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/";
const HIBP_RESPONSE_LINE = /^([A-Fa-f0-9]{35}):([0-9]+)$/;

const DEFAULT_TIMEOUT_MS = 3000;
const PREFIX_LENGTH = 5;

export class PwnedPasswordCheckUnavailableError extends Error {
  constructor(reason: string) {
    super(`Pwned password check unavailable: ${reason}`);
    this.name = "PwnedPasswordCheckUnavailableError";
  }
}

type Options = {
  fetch?: typeof fetch;
  timeoutMs?: number;
  rangeUrl?: string;
};

async function sha1Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  )
    .join("")
    .toUpperCase();
}

function assertAllowedRangeUrl(rangeUrl: string): void {
  let url: URL;
  try {
    url = new URL(rangeUrl);
  } catch {
    throw new PwnedPasswordCheckUnavailableError("invalid range URL");
  }
  if (
    process.env.NODE_ENV === "production" &&
    url.protocol !== "https:" &&
    url.hostname !== "127.0.0.1"
  ) {
    throw new PwnedPasswordCheckUnavailableError("range URL must use HTTPS");
  }
}

export async function isPwnedPassword(
  password: string,
  options: Options = {},
): Promise<boolean> {
  const {
    fetch: fetchImpl = fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    rangeUrl = process.env.HIBP_RANGE_URL ?? DEFAULT_HIBP_RANGE_URL,
  } = options;

  assertAllowedRangeUrl(rangeUrl);

  const hash = await sha1Hex(password);
  const prefix = hash.slice(0, PREFIX_LENGTH);
  const suffix = hash.slice(PREFIX_LENGTH);

  let body: string;
  try {
    const response = await fetchImpl(`${rangeUrl}${prefix}`, {
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status !== 200) {
      throw new PwnedPasswordCheckUnavailableError(
        `unexpected status ${response.status}`,
      );
    }
    body = await response.text();
  } catch (error) {
    if (error instanceof PwnedPasswordCheckUnavailableError) throw error;
    throw new PwnedPasswordCheckUnavailableError("request failed");
  }

  const content = body.trim();
  if (!content) {
    throw new PwnedPasswordCheckUnavailableError("empty response");
  }

  for (const line of content.split(/\r?\n/)) {
    const entry = HIBP_RESPONSE_LINE.exec(line);
    if (!entry) {
      throw new PwnedPasswordCheckUnavailableError("invalid response");
    }
    const [, lineSuffix, count] = entry;
    if (lineSuffix.toUpperCase() === suffix && /[1-9]/.test(count)) {
      return true;
    }
  }
  return false;
}
