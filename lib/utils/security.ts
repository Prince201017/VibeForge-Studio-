/**
 * [Claude.A11] Client-side security utilities
 * File: lib/security.ts
 *
 * CSRF token handling, a hardened fetch wrapper, and small helpers to
 * keep user-generated content out of dangerous sinks (eval, innerHTML).
 */

import { sanitizeHtml } from "./validation";

// ---------------------------------------------------------------------------
// CSRF token handling (double-submit cookie pattern)
// ---------------------------------------------------------------------------

const CSRF_COOKIE_NAME = "forgeos_csrf";
const CSRF_HEADER_NAME = "X-CSRF-Token";

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Reads the CSRF token set by the backend as a readable (non-HttpOnly) cookie. */
export function getCsrfToken(): string | null {
  return readCookie(CSRF_COOKIE_NAME);
}

/**
 * Hardened fetch wrapper for state-changing requests. Automatically:
 *  - Attaches the CSRF header for POST/PUT/PATCH/DELETE
 *  - Forces credentials: 'same-origin' (never send cookies cross-origin)
 *  - Rejects http:// targets in production
 */
export async function secureFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const isStateChanging = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (typeof window !== "undefined" && window.location.protocol === "https:" && input.startsWith("http://")) {
    throw new Error("Refusing to fetch insecure (http://) URL from a secure context");
  }

  const headers = new Headers(init.headers);
  if (isStateChanging) {
    const token = getCsrfToken();
    if (token) {
      headers.set(CSRF_HEADER_NAME, token);
    }
  }
  headers.set("X-Requested-With", "XMLHttpRequest");

  return fetch(input, {
    ...init,
    method,
    headers,
    credentials: "same-origin",
  });
}

// ---------------------------------------------------------------------------
// Safe DOM helpers — never let raw user content reach innerHTML/eval
// ---------------------------------------------------------------------------

/**
 * The ONLY sanctioned way to inject user-generated HTML into the DOM.
 * Runs content through DOMPurify first. Prefer plain textContent wherever
 * rich formatting isn't required.
 */
export function setSanitizedHtml(el: HTMLElement, dirtyHtml: string): void {
  el.innerHTML = sanitizeHtml(dirtyHtml);
}

/** Explicitly disallowed — kept here only to document the policy and fail loudly. */
export function evalIsBanned(): never {
  throw new Error(
    "eval() and the Function() constructor are banned in this codebase (see 12_SECURITY_AUTH_NEEDS.md §12)."
  );
}

// ---------------------------------------------------------------------------
// Client-side rate-limit awareness (cosmetic — real enforcement is server-side)
// ---------------------------------------------------------------------------

export interface RateLimitInfo {
  limited: boolean;
  retryAfterSeconds: number | null;
}

/** Parses standard rate-limit response headers so the UI can show a cooldown. */
export function parseRateLimitHeaders(res: Response): RateLimitInfo {
  if (res.status !== 429) {
    return { limited: false, retryAfterSeconds: null };
  }
  const retryAfter = res.headers.get("Retry-After");
  return {
    limited: true,
    retryAfterSeconds: retryAfter ? Number.parseInt(retryAfter, 10) : null,
  };
}

// ---------------------------------------------------------------------------
// Safe external link handling (prevents reverse tabnabbing)
// ---------------------------------------------------------------------------

export function safeExternalLinkProps(url: string): { href: string; target: string; rel: string } {
  let safeUrl = "#";
  try {
    const parsed = new URL(url, window.location.origin);
    if (["http:", "https:"].includes(parsed.protocol)) {
      safeUrl = parsed.toString();
    }
  } catch {
    // leave safeUrl as "#" for malformed input
  }
  return { href: safeUrl, target: "_blank", rel: "noopener noreferrer" };
}

// ---------------------------------------------------------------------------
// Content-type sniffing guard for downloaded blobs (export pipeline output)
// ---------------------------------------------------------------------------

const DOWNLOAD_ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/mp4",
  "video/webm",
  "application/zip",
  "application/pdf",
  "text/plain",
  "application/json",
]);

export function isDownloadTypeAllowed(mimeType: string): boolean {
  return DOWNLOAD_ALLOWED_TYPES.has(mimeType);
}
