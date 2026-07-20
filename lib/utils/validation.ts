/**
 * [Claude.A11] Client-side input validation & sanitization
 * File: lib/validation.ts
 *
 * NOTE: Client-side validation is a UX convenience only. The backend
 * (python-service/security/validation.py) is the source of truth and
 * re-validates everything — never trust the client.
 */

import DOMPurify from "dompurify";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function ok(): ValidationResult {
  return { valid: true, errors: [] };
}

function fail(...errors: string[]): ValidationResult {
  return { valid: false, errors };
}

// ---------------------------------------------------------------------------
// Primitive validators
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Project/asset names: letters, numbers, spaces, dashes, underscores, dots.
const SAFE_NAME_RE = /^[\w\- .]{1,200}$/;

export function validateEmail(value: string): ValidationResult {
  if (!value || value.length > 320) return fail("Email is required and must be under 320 characters");
  return EMAIL_RE.test(value) ? ok() : fail("Email format is invalid");
}

export function validateUUID(value: string): ValidationResult {
  return UUID_RE.test(value) ? ok() : fail("Invalid identifier format");
}

export function validateSafeName(value: string): ValidationResult {
  if (!value) return fail("Name is required");
  return SAFE_NAME_RE.test(value) ? ok() : fail("Name contains unsupported characters");
}

export function validateStringLength(value: string, min: number, max: number, field = "Field"): ValidationResult {
  if (value.length < min) return fail(`${field} must be at least ${min} characters`);
  if (value.length > max) return fail(`${field} must be at most ${max} characters`);
  return ok();
}

export function validateEnum<T extends string>(value: string, allowed: readonly T[]): ValidationResult {
  return (allowed as readonly string[]).includes(value) ? ok() : fail(`Value must be one of: ${allowed.join(", ")}`);
}

export function validateNumberRange(value: number, min: number, max: number, field = "Value"): ValidationResult {
  if (Number.isNaN(value)) return fail(`${field} must be a number`);
  if (value < min || value > max) return fail(`${field} must be between ${min} and ${max}`);
  return ok();
}

// ---------------------------------------------------------------------------
// File upload validation (mirrors backend allow-list — see needs doc §8)
// ---------------------------------------------------------------------------

export const ALLOWED_MIME_TYPES = {
  image: ["image/png", "image/jpeg", "image/avif", "image/webp"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
  svg: ["image/svg+xml"],
  model3d: ["model/gltf+json", "model/gltf-binary", "text/plain"], // .obj often reports text/plain
  document: ["application/pdf"],
  audio: ["audio/mpeg", "audio/wav", "audio/ogg"],
} as const;

const ALL_ALLOWED_MIME = Object.values(ALLOWED_MIME_TYPES).flat();

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB, per spec constraint

export function validateFileUpload(file: File): ValidationResult {
  const errors: string[] = [];

  if (!ALL_ALLOWED_MIME.includes(file.type as (typeof ALL_ALLOWED_MIME)[number])) {
    errors.push(`File type "${file.type || "unknown"}" is not permitted`);
  }
  if (file.size <= 0) {
    errors.push("File is empty");
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    errors.push(`File exceeds maximum size of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`);
  }
  // Filename sanity check — actual storage renames to a UUID server-side,
  // this just blocks obviously malicious names client-side (path traversal etc).
  if (/[\\/]|\.\./.test(file.name)) {
    errors.push("Filename contains invalid path characters");
  }

  return errors.length ? fail(...errors) : ok();
}

/**
 * Client-side magic-byte sniff for the most common types, used only to give
 * fast UX feedback before upload. The backend re-checks magic bytes
 * authoritatively (file_scanner.py) — spoofing this check client-side has
 * zero security effect.
 */
export async function sniffMagicBytes(file: File): Promise<string | null> {
  const buf = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const hex = Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (hex.startsWith("89504e47")) return "image/png";
  if (hex.startsWith("ffd8ff")) return "image/jpeg";
  if (hex.startsWith("52494646") && hex.slice(16, 24) === "57454250") return "image/webp";
  if (hex.startsWith("25504446")) return "application/pdf";
  if (hex.startsWith("000000") && hex.slice(8, 16) === "66747970") return "video/mp4";
  if (hex.startsWith("1a45dfa3")) return "video/webm";
  if (hex.startsWith("494433") || hex.startsWith("fffb")) return "audio/mpeg";
  return null;
}

// ---------------------------------------------------------------------------
// XSS prevention — sanitize any user-generated HTML before rendering
// ---------------------------------------------------------------------------

const SANITIZE_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li", "code", "pre"],
  ALLOWED_ATTR: ["href", "target", "rel"],
  ALLOW_DATA_ATTR: false,
};

/** Sanitize rich text (e.g. comments) before dangerouslySetInnerHTML. */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, SANITIZE_CONFIG);
}

/** Strip all markup — use for anything rendered as plain text via textContent. */
export function sanitizePlainText(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

// ---------------------------------------------------------------------------
// Composite validators for common payload shapes
// ---------------------------------------------------------------------------

export interface ProjectCreatePayload {
  name: string;
  description?: string;
}

export function validateProjectCreate(payload: ProjectCreatePayload): ValidationResult {
  const errors: string[] = [];
  const name = validateSafeName(payload.name);
  if (!name.valid) errors.push(...name.errors);

  if (payload.description) {
    const desc = validateStringLength(payload.description, 0, 2000, "Description");
    if (!desc.valid) errors.push(...desc.errors);
  }

  return errors.length ? fail(...errors) : ok();
}

export interface ShareInvitePayload {
  email: string;
  role: string;
}

const SHARE_ROLES = ["owner", "editor", "commenter", "viewer"] as const;

export function validateShareInvite(payload: ShareInvitePayload): ValidationResult {
  const errors: string[] = [];
  const email = validateEmail(payload.email);
  if (!email.valid) errors.push(...email.errors);

  const role = validateEnum(payload.role, SHARE_ROLES);
  if (!role.valid) errors.push(...role.errors);

  return errors.length ? fail(...errors) : ok();
}
