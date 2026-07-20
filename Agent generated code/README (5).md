# ForgeOS — Security & Authentication Module

Implements `12_SECURITY_AUTH_NEEDS.md` in full. Built per `INDEX.md`'s
instruction that new agents read their assigned needs file, integrate against
`../contracts/`, and follow the quality checklist.

**Agent tag:** `[Claude.A11]` (all files tagged per quality standard)

## What's here

```
lib/                          Frontend (TypeScript / Clerk)
├── auth.ts                   useForgeAuth, token retrieval, session controls, role helpers
├── validation.ts              Client-side validation, file-upload checks, DOMPurify sanitization
└── security.ts                CSRF-aware fetch wrapper, safe DOM helpers, safe external links

python-service/
├── auth.py                    Clerk JWT verification via JWKS (RS256)
├── main.py                    Example FastAPI app wiring every piece together
├── middleware/
│   ├── auth_middleware.py     require_auth / optional_auth / require_role dependencies
│   ├── rate_limit.py          Redis sliding-window rate limiting (user/endpoint/IP tiers)
│   ├── cors.py                Fail-closed CORS config from environment
│   ├── security_headers.py    CSP, HSTS, X-Frame-Options, etc. via ASGI middleware
│   └── error_handler.py       Safe error responses (no stack traces to clients)
├── security/
│   ├── encryption.py          Fernet field encryption + key rotation, Argon2 hashing, API keys
│   ├── validation.py          Pydantic schemas, HTML sanitization, SQL-identifier guards
│   ├── rbac.py                owner/editor/commenter/viewer, deny-overrides-allow
│   ├── file_scanner.py        Magic-byte verification, SVG/XXE defense, ClamAV, UUID renaming
│   ├── audit_logger.py        Async, queued, append-only audit trail
│   └── sandbox.py             Static analysis + resource limits for any executed user code
└── tests/                     pytest suite for every security-critical path
```

## Verified behavior

This environment has no network access, so the full `pytest` suite
(requires `fastapi`, `pydantic`, `bleach`) couldn't be executed here — but
every security-critical code path was extracted and run standalone against
real adversarial inputs to confirm the logic is correct, not just plausible:

- **Encryption**: encrypt/decrypt round-trip, API key generation/lookup hashing, and key-rotation (old ciphertext still decrypts after rotating to a new key) all confirmed.
- **RBAC**: direct membership, org-admin inheritance, and — critically — **explicit deny overriding an owner grant** (the "deny override allow" requirement from the spec) all confirmed.
- **File upload security**: rejects empty/oversized files, rejects disallowed MIME types, **catches a Windows executable disguised with a `.png` extension via magic-byte mismatch**, rejects SVGs containing `<script>` tags and XXE (`<!DOCTYPE`/`<!ENTITY`) payloads, accepts legitimate PNG/SVG files, and confirms uploaded filenames are always replaced with random UUIDs (defeats path traversal via filename).
- **Sandboxing**: static analysis correctly blocks `eval`, `exec`, `__import__`, `os`/`subprocess` imports, and rejects malformed source; CSS validator blocks `javascript:`, `expression()`, `-moz-binding`, and `behavior:` injection vectors.

Run the full suite yourself once dependencies are installed:
```bash
pip install -r python-service/requirements.txt
cd python-service && pytest tests/ -v
```

## Required environment variables

```
CLERK_ISSUER              # e.g. https://your-app.clerk.accounts.dev
CLERK_AUDIENCE             # optional
ENCRYPTION_KEY             # Fernet key — generate with encryption.generate_key()
ENCRYPTION_KEY_PREVIOUS    # comma-separated retired keys, only during rotation
REDIS_URL                  # for rate limiting
ALLOWED_ORIGINS            # comma-separated, required in production (fails closed)
ENVIRONMENT                # development | production
CLAMAV_HOST / CLAMAV_PORT  # defaults to localhost:3310
```

## Notable design decisions worth knowing about

- **RBAC is "deny override allow"**: a row in `project_access_denials` blocks
  access even if the user also has an org-admin grant. This is checked first,
  before any other resolution.
- **File type checking never trusts the declared MIME type or extension** —
  every upload is verified against its actual magic bytes; SVGs (which have
  no useful magic bytes) are instead parsed as XML and rejected if they
  contain `<script>`, `on*` event handlers, `javascript:` URIs, or
  `<!DOCTYPE`/`<!ENTITY` (XXE).
- **Audit logging is fire-and-forget** via an in-process asyncio queue so it
  never adds latency to the request path, but `stop_audit_worker()` drains
  the queue on shutdown so events aren't lost on deploy.
- **Sandboxing**: the spec notes Docker-based Python isolation is a "future"
  item. `sandbox.py` implements the interim story (AST-level static
  rejection + OS resource limits) and documents explicitly that it is
  **not sufficient for untrusted, internet-facing execution** — the
  production path is container/gVisor isolation, and JS previews must run
  client-side in a Web Worker with no `window`/`fetch`/network access.
- **Rate limiting** uses a sliding-window-log (Redis sorted sets) rather than
  fixed windows, avoiding the classic "double burst at window boundary"
  problem, at O(log N) per check.

## Integration notes for other agents

- `rbac.bind_database(db)` and `audit_logger.bind_database(db)` must be
  called once at startup (see `main.py`'s `lifespan` handler) once the
  Database Schema team's (`11_DATABASE_SCHEMA_NEEDS.md`) connection pool is
  available. Until then, `audit_logger` falls back to structured logging
  and `rbac` will raise `RuntimeError` if called.
- `require_role("editor")` expects a `project_id` path parameter — any route
  using it must be declared as `/api/projects/{project_id}/...`.
- Frontend `secureFetch()` in `lib/security.ts` expects the backend to set a
  readable `forgeos_csrf` cookie; wire that up wherever session cookies are
  first issued.
