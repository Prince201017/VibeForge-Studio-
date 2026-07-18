# Security & Authentication Needs

## Scope
Enterprise-grade security with Clerk authentication, CSP headers, CORS, rate limiting, input validation, file scanning, encrypted storage, audit logging, role-based permissions, and sandboxed code execution.

## Target
- 2000-2500 LOC (frontend 600 + backend 1400)
- Zero security vulnerabilities
- Full audit trail
- Encrypted sensitive data
- Rate limiting on all endpoints

## Authentication System

### 1. Clerk Integration (500 LOC)
- Email/password authentication
- Social login (Google, GitHub) optional
- Multi-factor authentication (MFA)
- Session management
- Token refresh
- Sign out all sessions
- User profile management
- Magic link authentication (optional)

File: `lib/auth.ts`, `python-service/auth.py`

```typescript
// Frontend
import { useAuth } from "@clerk/clerk-react";
const { userId, sessionId, getToken } = useAuth();

// Backend
from clerk_sdk import verify_token
token = request.headers.get("Authorization")
claims = verify_token(token)
```

### 2. Session Management (300 LOC Backend)
- Session creation on login
- Session expiration (24 hours)
- Session refresh (sliding window)
- Multiple sessions per user
- Session revocation
- Device tracking
- Browser/OS detection

Database: `sessions` table with user_id, token_hash, expires_at, device_info

### 3. Role-Based Access Control (400 LOC Backend)
- Project owner (full control)
- Editor (can modify)
- Viewer (read-only)
- Commenter (view + comment)
- Custom roles (future)
- Permission inheritance
- Deny override allow

Implementation: Check permissions before every operation

### 4. Input Validation (400 LOC Backend)
- Sanitize all user input
- Validate JSON payloads
- File type validation (MIME checking)
- File size limits
- SQL injection prevention (parameterized queries)
- XSS prevention (DOMPurify)
- CSRF tokens

### 5. Data Encryption (300 LOC)
- Encrypt sensitive fields (passwords)
- Encrypt API keys/tokens in storage
- TLS/SSL for all communications
- End-to-end encryption option (future)
- Key rotation policy

Implementation:
```python
from cryptography.fernet import Fernet
encrypted = cipher.encrypt(sensitive_data)
```

### 6. CORS & Headers (200 LOC)
- Strict CORS policy
- CSP (Content Security Policy) headers
- X-Frame-Options (prevent clickjacking)
- X-Content-Type-Options (prevent MIME sniffing)
- Strict-Transport-Security (HTTPS only)
- Permissions-Policy

Headers:
```
Content-Security-Policy: default-src 'self'; script-src 'self' cdn.example.com
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### 7. Rate Limiting (300 LOC Backend)
- Per-user rate limiting (1000 req/min)
- Per-endpoint rate limiting (100 req/min for exports)
- Per-IP rate limiting (5000 req/min)
- Sliding window algorithm
- Redis for distributed rate limiting
- Graceful degradation when rate limited

Implementation: Upstash Redis

### 8. File Upload Security (300 LOC Backend)
- File type whitelisting (not blacklisting)
- MIME type validation (magic bytes)
- File size limits (100MB max per file)
- Virus scanning (ClamAV)
- Uploaded files quarantine before processing
- Rename files to random UUIDs
- Store outside web root

Allowed types:
- Images: PNG, JPG, AVIF, WebP
- Videos: MP4, WebM, MOV
- SVG: validated via XML parser
- 3D: GLTF, GLB, OBJ (size limited)
- Documents: PDF
- Audio: MP3, WAV, OGG

### 9. Audit Logging (300 LOC Backend)
- Log all user actions (create, update, delete, share, permission change)
- Include timestamp, user, IP, user-agent
- Store in database (audit_logs table)
- Non-repudiation (user cannot deny action)
- Immutable logs (cannot be edited)
- Retention: 1 year minimum
- Export audit logs

### 10. Environment Variables (200 LOC)
- Use environment variables for secrets
- Never commit secrets to Git
- Rotate secrets regularly
- Different secrets per environment (dev, staging, prod)
- Use Vercel Secrets for sensitive keys

Required variables:
```
CLERK_SECRET_KEY
DATABASE_URL
JWT_SECRET
ENCRYPTION_KEY
AI_GATEWAY_API_KEY
BLOB_READ_WRITE_TOKEN
AWS_S3_KEY (if using S3)
REDIS_URL
```

### 11. API Security (400 LOC Backend)
- API key generation for programmatic access
- API key rotation
- Scope-based API key permissions
- API rate limiting by key
- Request signing (HMAC)
- JWT token validation
- Token expiration (1 hour for short-lived)

### 12. XSS Prevention (200 LOC Frontend)
- DOMPurify for sanitizing HTML
- Content Security Policy (CSP)
- Escape all user-generated content
- No innerHTML from user input
- Use textContent for plain text
- Avoid eval() and related

### 13. CSRF Protection (200 LOC Backend)
- CSRF tokens on all state-changing requests
- Token regeneration per request (optional)
- SameSite cookie attribute
- Double-submit cookie pattern (if needed)

### 14. SQL Injection Prevention (200 LOC Backend)
- Parameterized queries only
- No string concatenation in SQL
- Use ORM (SQLAlchemy) with proper escaping
- Regular expression patterns validated

### 15. Sandboxed Code Execution (500 LOC Backend)
- User-generated code runs in sandbox
- Web Workers for JavaScript
- Docker containers for Python (future)
- Resource limits (CPU, memory, time)
- No access to file system
- No network access from sandbox

### 16. SSL/TLS (100 LOC)
- HTTPS only (redirect HTTP to HTTPS)
- SSL certificate renewal (automated)
- TLS 1.2+ only
- Strong cipher suites
- HSTS headers

### 17. Security Headers (150 LOC)
```
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), payment=()
```

### 18. Error Handling Security (200 LOC)
- Don't expose stack traces to users
- Generic error messages ("Something went wrong")
- Detailed logging for debugging
- Different error codes for attacks (429, 403)
- No SQL error details exposed

### 19. Testing & Documentation (250 LOC)
- Security audit checklist
- Penetration test plan
- OWASP Top 10 compliance
- Security testing for each endpoint
- Documentation of security features

## File Structure
```
lib/
├── auth.ts (Clerk integration)
├── validation.ts (input validation)
└── security.ts (utilities)

python-service/
├── middleware/
│   ├── auth_middleware.py (JWT validation)
│   ├── rate_limit.py (rate limiting)
│   ├── cors.py (CORS headers)
│   ├── security_headers.py (CSP, etc.)
│   └── error_handler.py (safe error responses)
├── security/
│   ├── encryption.py (Fernet)
│   ├── validation.py (input validation)
│   ├── file_scanner.py (ClamAV)
│   ├── audit_logger.py (audit trail)
│   └── sandbox.py (code execution limits)
└── auth.py (Clerk integration)
```

## API Security Checklist

### Before Every Deploy
- [ ] No hardcoded secrets
- [ ] All inputs validated
- [ ] All outputs escaped
- [ ] SQL queries parameterized
- [ ] Rate limiting enabled
- [ ] CORS configured
- [ ] CSP headers set
- [ ] HTTPS only
- [ ] Error messages safe
- [ ] Audit logging working
- [ ] File uploads scanned
- [ ] Authentication required on private endpoints
- [ ] Permissions checked before access
- [ ] Database backups working
- [ ] Security headers all set

### Compliance
- GDPR (data privacy)
- CCPA (California privacy)
- SOC 2 (security audit)
- ISO 27001 (information security)

## Endpoint Security Examples

### Protected Endpoint
```python
@app.post("/api/projects")
@require_auth  # Decorator checks JWT
@validate_input(ProjectCreateSchema)  # Validates input
@rate_limit(max_requests=100, window=60)  # Rate limiting
async def create_project(request, current_user):
  # current_user is from decoded JWT
  project = await db.projects.create(owner_id=current_user.id, ...)
  return project
```

### Permission Check
```python
@app.get("/api/projects/{project_id}")
async def get_project(project_id, current_user):
  project = await db.projects.get(project_id)
  
  # Check permission
  can_view = await check_permission(
    user_id=current_user.id,
    project_id=project_id,
    permission='view'
  )
  
  if not can_view:
    raise PermissionError("Not authorized")
  
  return project
```

## Performance Targets (Hard SLAs)
- Authentication: < 200ms
- Rate limiting check: < 10ms
- Input validation: < 50ms
- Audit logging: async, non-blocking

## Quality Standards
- Zero security vulnerabilities
- 100% endpoint permission checks
- All inputs validated
- All sensitive data encrypted
- [AgentName] tags mandatory
- Security test coverage
- Penetration test results

## Constraints
- Rate limit: 1000 req/min per user
- File upload: 100MB max
- Token lifetime: 24 hours (sessions)
- API key lifetime: 1 year
- Audit log retention: 1 year minimum
- Data encryption: AES-256 minimum
