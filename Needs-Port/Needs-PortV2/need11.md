# NEED 11: SECURITY & AUTHENTICATION - Clerk Auth & Protection

## System Overview
Complete authentication with Clerk, authorization, encryption, CSP headers, rate limiting, and comprehensive security hardening.

## What Goes In This System
- Clerk authentication integration
- Role-based access control (RBAC)
- Data encryption at rest
- HTTPS and secure headers
- Content Security Policy (CSP)
- Rate limiting and DDoS protection
- Input validation and sanitization
- SQL injection prevention
- CSRF protection
- XSS prevention
- File upload validation
- API key management

## Files to Create
- `lib/auth/clerk-provider.tsx` - Clerk setup
- `lib/auth/permissions.ts` - Permission checking
- `lib/auth/middleware.ts` - Auth middleware
- `lib/security/encryption.ts` - Encryption utilities
- `lib/security/validation.ts` - Input validation
- `python-service/middleware/auth.py` - Backend auth
- `python-service/middleware/rate_limit.py` - Rate limiting
- `middleware.ts` - Next.js middleware
- `components/auth/LoginForm.tsx` - Login UI
- `components/auth/SignupForm.tsx` - Signup UI
- `tests/auth.test.ts` - Tests (70%+ coverage)

## LOC Target: 2000-2500 lines

## Quality Standards
- 100% TypeScript strict mode
- 70% test coverage minimum
- JSDoc on all exports
- [AgentName] tags on functions
- Security audit passed

## Authentication Features
1. Email + Password via Clerk
2. Social login (Google, GitHub, optional)
3. Multi-factor authentication (2FA)
4. Session management
5. Password reset
6. Email verification
7. Account recovery

## Authorization (RBAC)
- Admin (full access)
- Owner (project owner, full project access)
- Editor (can edit project)
- Viewer (read-only)
- Commenter (comments only)
- Custom roles with granular permissions

## Encryption
- User passwords hashed (bcrypt via Clerk)
- Sensitive data encrypted (at-rest)
- API keys encrypted
- Blob storage uses signed URLs
- Database connections encrypted (SSL)
- Environment secrets managed via Vercel

## Security Headers
```
Content-Security-Policy: strict policy
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: appropriate restrictions
```

## Rate Limiting
- API rate limits: 100 req/min per user
- Upload rate limit: 10 uploads/min
- Export rate limit: 5 exports/min
- Search rate limit: 30 req/min
- WebSocket connections: 5 per user

## Input Validation
- All user inputs validated server-side
- File uploads validated (MIME type, size, virus scan)
- JSON schema validation
- XSS protection (HTML escape, sanitization)
- SQL injection prevention (parameterized queries)
- CSRF tokens on forms

## API Endpoints (Protected)
- All endpoints require authentication
- All endpoints check authorization
- All sensitive operations logged
- All file operations validated

## Audit Logging
- Track user actions
- Track data access
- Track permission changes
- Track API usage
- Store in database with retention policy

## Compliance
- GDPR compliance (data export, deletion)
- CCPA compliance (privacy controls)
- SOC 2 readiness
- Data residency options (US/EU)

## Database Security
```python
# Connection
- SSL required
- Connection pooling
- Secrets in environment
- No credentials in code

# Queries
- All parameterized
- No string concatenation
- Prepared statements
- Input validation before query
```

## File Security
- Validate file extensions
- Check MIME types
- Virus scanning (ClamAV)
- File size limits (100MB per file, 1GB project)
- Scan on upload
- Quarantine suspicious files

## API Key Security
- Generate with cryptographic randomness
- Rotate regularly
- Scope to specific operations
- Rate limit by key
- Log all uses
- Encrypt in database
- Expire unused keys

## Frontend Security
```typescript
// nextauth.js config
- Session secrets rotated
- CSRF protection
- SameSite cookies
- Secure cookies (HTTPS only)
- HttpOnly flags
- Environment-based config
```

## Deliverables Checklist
- Clerk authentication working
- Login/signup forms working
- RBAC working
- Permissions enforced
- Session management working
- Password reset working
- 2FA working
- All security headers present
- CSP policy working
- Rate limiting working
- Input validation working
- File upload validation working
- Encryption working
- API key system working
- Audit logging working
- CORS properly configured
- All tests passing
- Security audit passed
- JSDoc complete
