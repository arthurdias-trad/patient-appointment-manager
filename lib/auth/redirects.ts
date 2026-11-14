export const DEFAULT_AUTHENTICATED_PATH = "/appointments";
export const LOGIN_PATH = "/login";
export const SIGNUP_PATH = "/signup";

const PLACEHOLDER_ORIGIN = "http://x";
const UNSAFE_CHARS = /[\u0000-\u001f\u007f\\]/;

function isAuthPage(pathname: string): boolean {
  return pathname === LOGIN_PATH || pathname === SIGNUP_PATH;
}

function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return DEFAULT_AUTHENTICATED_PATH;
  }
  if (UNSAFE_CHARS.test(next)) return DEFAULT_AUTHENTICATED_PATH;

  let resolved: URL;
  try {
    resolved = new URL(next, PLACEHOLDER_ORIGIN);
  } catch {
    return DEFAULT_AUTHENTICATED_PATH;
  }
  if (resolved.origin !== PLACEHOLDER_ORIGIN || isAuthPage(resolved.pathname)) {
    return DEFAULT_AUTHENTICATED_PATH;
  }
  return next;
}

export function resolveAuthRedirect(input: {
  pathname: string;
  search: string;
  isAuthenticated: boolean;
}): string | null {
  const { pathname, search, isAuthenticated } = input;

  if (isApiPath(pathname)) return null;

  if (isAuthenticated) {
    return isAuthPage(pathname) ? DEFAULT_AUTHENTICATED_PATH : null;
  }
  if (pathname === "/" || isAuthPage(pathname)) return null;

  return `${LOGIN_PATH}?next=${encodeURIComponent(pathname + search)}`;
}
