import { createHash } from "node:crypto";
import { createServer } from "node:http";

export const BREACHED_PASSWORD = "e2e-breached-password-1";
export const HIBP_OUTAGE_PASSWORD = "e2e-hibp-outage-password-1";

export const HIBP_STUB_PORT = 3101;
export const HIBP_STUB_HOST = "127.0.0.1";

function sha1(value: string): string {
  return createHash("sha1").update(value).digest("hex").toUpperCase();
}

const breachedHash = sha1(BREACHED_PASSWORD);
const outageHash = sha1(HIBP_OUTAGE_PASSWORD);
const breachedPrefix = breachedHash.slice(0, 5);
const outagePrefix = outageHash.slice(0, 5);

if (breachedPrefix === outagePrefix) {
  throw new Error("Stub passwords must have distinct SHA-1 prefixes");
}

const paddingLines = Array.from(
  { length: 5 },
  (_, i) => `${i.toString(16).padStart(35, "0")}:0`,
);

export function createHibpStub() {
  return createServer((req, res) => {
    const { pathname } = new URL(req.url ?? "/", `http://${HIBP_STUB_HOST}`);

    if (req.method === "GET" && pathname === "/health") {
      res.writeHead(200).end("ok");
      return;
    }

    const match =
      req.method === "GET" && pathname.match(/^\/range\/([0-9A-Fa-f]{5})$/);
    if (!match) {
      res.writeHead(404).end();
      return;
    }

    const prefix = match[1].toUpperCase();
    if (prefix === outagePrefix) {
      res.writeHead(503).end();
      return;
    }

    const lines =
      prefix === breachedPrefix
        ? [`${breachedHash.slice(5)}:1`, ...paddingLines]
        : paddingLines;
    res
      .writeHead(200, { "Content-Type": "text/plain" })
      .end(lines.join("\r\n"));
  });
}
