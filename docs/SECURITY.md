# TOLOG ONE - Security Model

**Version:** 1.0  
**Date:** 2026-08-13  
**Classification:** Internal

---

## 1. Overview

Security is built into TOLOG ONE from the foundation, not added as an afterthought. This document outlines the security model, threat analysis, and mitigation strategies.

### Core Principles

1. **Defense in Depth** - Multiple layers of protection
2. **Least Privilege** - Users/services get only what they need
3. **Zero Trust** - Never trust client input, always verify
4. **Secure by Default** - Safety is the default behavior
5. **Auditability** - All security events are logged
6. **Data Minimization** - Only collect what's necessary

---

## 2. Authentication Model

### 2.1 User Registration

**Flow:**
```
User Input
  ↓
Validate email format
  ↓
Check email not registered
  ↓
Validate password strength (min 8 chars, complexity)
  ↓
Hash password with bcrypt (cost: 12)
  ↓
Create user record
  ↓
Send verification email
  ↓
Return access + refresh tokens
```

**Password Requirements:**
- Minimum 8 characters
- Must contain uppercase, lowercase, number, special character
- Not in common password blacklist

**Status:** PLANNED

---

### 2.2 Authentication (Login)

**Flow:**
```
User sends email + password
  ↓
Rate limit check (5 attempts per 15 min per IP)
  ↓
Find user by email
  ↓
Verify password with bcrypt
  ↓
Check email verified (optional enforcement)
  ↓
Check account not locked
  ↓
Generate tokens:
  - Access Token (JWT, 15 min expiry)
  - Refresh Token (JWT, 7 day expiry)
  ↓
Store refresh token hash in DB
  ↓
Log successful login
  ↓
Return tokens to client
```

**Status:** PLANNED

---

### 2.3 Token Management

#### Access Token (JWT)

```json
{
  "typ": "JWT",
  "alg": "HS256"
}

{
  "sub": "user-uuid",
  "email": "user@example.com",
  "iat": 1692009600,
  "exp": 1692010500,
  "iss": "tolog-one",
  "scope": "api"
}
```

- Signed with `JWT_SECRET`
- Short-lived (15 minutes)
- Should NOT contain sensitive data
- Stored in httpOnly cookie (not localStorage)

#### Refresh Token (JWT)

```json
{
  "sub": "user-uuid",
  "iat": 1692009600,
  "exp": 1695601600,
  "jti": "token-id-uuid"
}
```

- Signed with `JWT_REFRESH_SECRET` (different key)
- Long-lived (7 days)
- Stored in httpOnly cookie with Secure + SameSite flags
- Hash stored in database for revocation checking

#### Token Rotation

```
1. Client uses access token for API request
2. When access token expires (401 response)
3. Client sends refresh token to POST /auth/refresh
4. Backend validates refresh token:
   - Signature valid
   - Not expired
   - Token not revoked (check DB hash)
   - Same user as in token
5. Backend generates NEW refresh token
6. OLD refresh token marked as revoked
7. Return new access + refresh tokens
```

**Status:** PLANNED

---

### 2.4 Session Security

**HttpOnly Cookies:**
```
Set-Cookie: accessToken=...; HttpOnly; Secure; SameSite=Strict; Max-Age=900
Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

**Why HttpOnly:**
- Prevents XSS attacks from stealing tokens
- Browser automatically includes in requests
- Immune to `document.cookie` attacks

**CSRF Protection:**
- SameSite=Strict blocks cross-site cookie send
- Double-submit cookie pattern (optional additional layer)

**Status:** PLANNED

---

## 3. Authorization Model

### 3.1 User Context Extraction

Every endpoint:

```typescript
// Middleware
function extractUserContext(request) {
  // 1. Verify JWT signature
  const token = request.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, JWT_SECRET);
  
  // 2. Extract user_id
  const userId = decoded.sub;
  
  // 3. Attach to request context
  request.user = {
    id: userId,
    email: decoded.email,
    scope: decoded.scope
  };
  
  return request;
}
```

**Status:** PLANNED

---

### 3.2 Resource-Level Authorization

**Rule: Every query includes user_id check**

```typescript
// ❌ WRONG - Data leak vulnerability
const memory = await db.query(
  'SELECT * FROM memories WHERE id = $1',
  [memoryId]
);

// ✅ CORRECT - User isolation enforced
const memory = await db.query(
  'SELECT * FROM memories WHERE id = $1 AND user_id = $2',
  [memoryId, request.user.id]
);
```

**Database-Level Authorization:**

```sql
-- For extra safety, use PostgreSQL row-level security (RLS)
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY memories_user_isolation ON memories
  USING (user_id = current_user_id());
```

**Status:** PLANNED

---

### 3.3 Permission Types

| Permission | Scope | Check |
|-----------|-------|-------|
| read_profile | Own profile | user_id match |
| write_profile | Own profile | user_id match |
| read_conversation | Own conversation | conversation.user_id match |
| write_conversation | Own conversation | conversation.user_id match |
| delete_conversation | Own conversation | conversation.user_id match |
| read_memory | Own memory | memory.user_id match |
| write_memory | Own memory | memory.user_id match |
| delete_memory | Own memory | memory.user_id match |
| reset_memory | Own data | Requires explicit confirmation |

**Status:** PLANNED

---

## 4. Secrets Management

### 4.1 Environment Variables

**Never in git:**

```bash
# .env (NOT tracked by git)
DATABASE_URL=postgresql://user:password@localhost:5432/tolog_one
JWT_SECRET=<64-character-random-hex>
JWT_REFRESH_SECRET=<64-character-random-hex>
GEMINI_API_KEY=<actual-api-key>
CLAUDE_API_KEY=<actual-api-key>
```

**Repository safe version:**

```bash
# .env.example (tracked by git - NO secrets)
DATABASE_URL=postgresql://user:password@localhost:5432/tolog_one
JWT_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
GEMINI_API_KEY=your-gemini-key
CLAUDE_API_KEY=your-claude-key
```

**Git ignore:**

```bash
# .gitignore
.env
.env.local
.env.*.local
node_modules/
dist/
.DS_Store
```

**Status:** PLANNED

---

### 4.2 Secret Rotation

**Database Passwords:**
- Rotate every 90 days
- Use managed database service (AWS RDS, etc.) for automated rotation
- Keep connection pool small to handle re-auth

**JWT Secrets:**
- Rotate JWT_SECRET every 6 months
- Revoke all existing tokens during rotation
- Support both old and new keys during transition

**API Keys:**
- Rotate API keys for external services quarterly
- Monitor for leaked keys (GitHub scanning, external services)
- Immediately revoke if compromised

**Status:** PLANNED

---

### 4.3 Key Storage in Production

**Never:**
- Hardcode in source code
- Store in git history
- Commit to repository

**Use:**
- Environment variables (12-factor app)
- Managed secret storage (AWS Secrets Manager, HashiCorp Vault)
- Encrypted configuration management

**Status:** PLANNED

---

## 5. Data Protection

### 5.1 Password Security

**Hashing:**
```typescript
import bcrypt from 'bcrypt';

// Registration
const passwordHash = await bcrypt.hash(password, 12); // cost: 12

// Login
const isMatch = await bcrypt.compare(inputPassword, passwordHash);
```

**Never:**
- Store plaintext passwords
- Use simple hashing (MD5, SHA1)
- Use same salt for all users

**Status:** PLANNED

---

### 5.2 Encryption at Rest

**Sensitive Data in Database:**

If storing truly sensitive data:

```typescript
import crypto from 'crypto';

function encrypt(plaintext, encryptionKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  
  const authTag = cipher.getAuthTag();
  
  return {
    iv: iv.toString('hex'),
    encrypted: encrypted.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

function decrypt(cipherData, encryptionKey) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    encryptionKey,
    Buffer.from(cipherData.iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(cipherData.authTag, 'hex'));
  
  return Buffer.concat([
    decipher.update(Buffer.from(cipherData.encrypted, 'hex')),
    decipher.final()
  ]).toString('utf8');
}
```

**For TOLOG ONE:**
- Regular user memories: NOT encrypted (they're user's own data)
- API keys: NEVER stored (use env vars)
- Passwords: Hashed with bcrypt
- Database connection: Use SSL/TLS

**Status:** PLANNED

---

### 5.3 Encryption in Transit

**TLS/SSL:**
- All connections use HTTPS (TLS 1.3+)
- Certificate from trusted CA (Let's Encrypt)
- HSTS header to force HTTPS

**Configuration:**
```typescript
import https from 'https';
import fs from 'fs';

const httpsOptions = {
  key: fs.readFileSync('/path/to/key.pem'),
  cert: fs.readFileSync('/path/to/cert.pem')
};

https.createServer(httpsOptions, app).listen(443);
```

**Status:** PLANNED

---

## 6. Input Validation & Sanitization

### 6.1 Input Validation

**Every endpoint validates input:**

```typescript
import { z } from 'zod';

const createMessageSchema = z.object({
  content: z.string()
    .min(1, 'Message cannot be empty')
    .max(10000, 'Message too long')
    .trim(),
  language: z.string().optional()
});

app.post('/messages', (request, reply) => {
  const validated = createMessageSchema.parse(request.body);
  // Use validated data
});
```

**Validation layers:**
1. Type checking (Zod/Joi schema)
2. Length/size limits
3. Format validation (email, URL, etc.)
4. Business logic validation

**Status:** PLANNED

---

### 6.2 SQL Injection Prevention

**Use parameterized queries ALWAYS:**

```typescript
// ❌ VULNERABLE
const memory = await db.query(
  `SELECT * FROM memories WHERE content LIKE '%${userInput}%'`
);

// ✅ SAFE - Parameterized
const memory = await db.query(
  'SELECT * FROM memories WHERE content ILIKE $1',
  [`%${userInput}%`]
);
```

**Status:** PLANNED

---

### 6.3 XSS Prevention

**Never trust user input in HTML:**

```typescript
// ❌ VULNERABLE
res.send(`<p>${userInput}</p>`);

// ✅ SAFE - Escape or use template engine
const escapeHtml = require('escape-html');
res.send(`<p>${escapeHtml(userInput)}</p>`);

// ✅ SAFE - React handles escaping by default
return <p>{userInput}</p>;
```

**Content Security Policy:**

```typescript
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"], // Minimize unsafe
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:']
  }
}));
```

**Status:** PLANNED

---

### 6.4 CORS Configuration

```typescript
import cors from '@fastify/cors';

app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
});
```

**Production:**
```
FRONTEND_URL=https://tolog.one
API_URL=https://api.tolog.one
```

**Status:** PLANNED

---

## 7. Rate Limiting & DDoS Protection

### 7.1 Rate Limiting by User

```typescript
import rateLimit from '@fastify/rate-limit';

app.register(rateLimit, {
  max: 100, // 100 requests
  timeWindow: '15 minutes',
  cache: 10000,
  allowList: [],
  redis: redisClient, // For distributed setups
  skip: (request) => {
    // Skip rate limit for health checks
    return request.url === '/health';
  }
});
```

**Per-endpoint limits:**

```typescript
// Strict limit for authentication
app.post('/auth/login', rateLimit({ max: 5, timeWindow: '15 minutes' }), 
  (request, reply) => { ... }
);

// Moderate limit for messages
app.post('/messages', rateLimit({ max: 50, timeWindow: '1 hour' }), 
  (request, reply) => { ... }
);

// Loose limit for reads
app.get('/conversations', rateLimit({ max: 100, timeWindow: '15 minutes' }), 
  (request, reply) => { ... }
);
```

**Status:** PLANNED

---

### 7.2 Request Size Limits

```typescript
app.register(require('@fastify/multipart'), {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1, // One file at a time
    fields: 50, // Max form fields
    headerSize: 32 * 1024 // 32KB headers
  }
});

app.bodyLimit = 1024 * 1024; // 1MB request body
```

**Status:** PLANNED

---

## 8. Logging & Monitoring

### 8.1 Security Event Logging

**Log these events:**
- Login attempts (success/failure)
- Token refresh
- Logout
- Password changes
- Memory access/modifications
- API rate limit violations
- Failed authorization attempts
- Database errors
- API errors

**Never log:**
- Passwords
- Tokens (except for audit via hash)
- API keys
- Sensitive user data

**Example:**

```typescript
logger.info('user_login', {
  userId: user.id,
  email: user.email,
  ipAddress: request.ip,
  userAgent: request.headers['user-agent'],
  success: true,
  timestamp: new Date()
});

logger.warn('unauthorized_access_attempt', {
  userId: request.user?.id,
  endpoint: request.url,
  method: request.method,
  ipAddress: request.ip,
  reason: 'User not owner of resource'
});
```

**Status:** PLANNED

---

### 8.2 Metrics & Monitoring

**Track:**
- API latency
- Error rates
- Authentication failures
- Rate limit violations
- Database connection pool usage
- AI provider latency
- Memory usage

**Tools:**
- Prometheus for metrics
- Grafana for dashboards
- CloudWatch/DataDog for logs

**Status:** PLANNED

---

## 9. Vulnerability Management

### 9.1 Dependency Scanning

**Automated checks:**

```bash
# Check for known vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update
```

**CI/CD Integration:**

```yaml
# GitHub Actions
- name: Run security audit
  run: npm audit --audit-level=moderate
```

**Status:** PLANNED

---

### 9.2 Security Headers

```typescript
import helmet from '@fastify/helmet';

app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.gemini.example.com']
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'no-referrer' },
  xssFilter: true
});
```

**Headers Added:**
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security
- Referrer-Policy

**Status:** PLANNED

---

## 10. Threat Model

### 10.1 Potential Threats & Mitigations

| Threat | Impact | Mitigation |
|--------|--------|-----------|
| SQL Injection | Data breach | Parameterized queries |
| XSS Attack | Session hijacking | HTML escaping, CSP |
| CSRF Attack | Unauthorized actions | SameSite cookies, CSRF tokens |
| Brute Force Login | Account compromise | Rate limiting, account lockout |
| Token Theft | Unauthorized access | HttpOnly cookies, short expiry |
| DDoS | Service unavailability | Rate limiting, WAF |
| Man-in-Middle | Data interception | TLS/HTTPS |
| Privilege Escalation | Unauthorized access | Role-based authorization |
| Data Breach | Privacy violation | Encryption, access controls |
| Insider Threat | Data misuse | Audit logs, encryption |

**Status:** PLANNED

---

### 10.2 Data Breach Response

**If data breach is suspected:**

1. **Immediate Actions (within 1 hour)**
   - Isolate affected systems
   - Stop data exfiltration
   - Preserve evidence
   - Alert security team

2. **Investigation (within 24 hours)**
   - Determine scope of breach
   - Identify affected data
   - Identify root cause
   - Check audit logs

3. **Notification (within 72 hours - GDPR)**
   - Notify affected users
   - Provide clear guidance
   - Offer credit monitoring if applicable
   - Document incident

4. **Remediation (within 1 week)**
   - Patch vulnerabilities
   - Reset user passwords
   - Rotate API keys
   - Deploy fixes

5. **Post-Incident (ongoing)**
   - Review security processes
   - Update security policies
   - Implement additional controls
   - Regular security audits

**Status:** PLANNED

---

## 11. Compliance & Standards

### 11.1 GDPR Compliance

**User Rights:**
- Right to access personal data
- Right to rectification
- Right to erasure ("right to be forgotten")
- Right to restrict processing
- Right to data portability
- Right to object

**TOLOG ONE Implementation:**
- GET /user/profile - Access
- PATCH /memory/:id - Rectification
- DELETE /memory/:id - Erasure
- POST /memory/reset - Erasure
- Export endpoints (future) - Portability

**Status:** PLANNED

---

### 11.2 Data Protection Impact Assessment (DPIA)

Document and assess:
- Types of personal data collected
- Purpose of processing
- Legal basis
- Data retention periods
- Security measures
- Risks and mitigations

**Status:** PLANNED

---

## 12. Security Testing

### 12.1 Automated Security Tests

```typescript
describe('Security', () => {
  test('unauthorized user cannot access other user memory', async () => {
    const user1Memory = await createMemory(user1Id, 'secret');
    const response = await fetch(`/memory/${user1Memory.id}`, {
      headers: { Authorization: `Bearer ${user2Token}` }
    });
    expect(response.status).toBe(403);
  });

  test('SQL injection attempt is blocked', async () => {
    const injection = "'; DROP TABLE users; --";
    const response = await fetch('/memory?search=' + injection, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(response.status).toBe(200);
    // Verify data not corrupted
  });

  test('password must be strong', async () => {
    const response = await fetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: '123' // Too weak
      })
    });
    expect(response.status).toBe(400);
  });
});
```

**Status:** PLANNED

---

### 12.2 Penetration Testing

Quarterly security audits by external firm:
- Manual code review
- Vulnerability scanning
- Penetration testing
- Security assessment report
- Remediation plan

**Status:** PLANNED

---

## 13. Security Checklist

Before production deployment:

- [ ] All passwords hashed with bcrypt
- [ ] JWT tokens signed with strong secrets
- [ ] HTTPS/TLS enabled
- [ ] CORS properly configured
- [ ] Rate limiting active
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] CSRF protection enabled
- [ ] Security headers added
- [ ] Secrets not in git
- [ ] Database backups encrypted
- [ ] Audit logging active
- [ ] Error messages don't leak info
- [ ] Dependencies scanned for vulnerabilities
- [ ] Security policy documented

**Status:** PLANNED

---

## 14. Incident Response Plan

### 14.1 Security Incident Response Team

- Security Lead
- Backend Lead
- DevOps/Infrastructure Lead
- Legal/Compliance
- Communications

### 14.2 Response Procedures

**Available 24/7 for critical incidents**

Incident severity levels:
- **Critical:** Data breach, active attack, service down
- **High:** Vulnerability in production, authentication issues
- **Medium:** Non-critical vulnerability, partial service disruption
- **Low:** Potential vulnerability, warning signs

**Status:** PLANNED

---

## 15. Implementation Status

| Control | Status |
|---------|--------|
| User Registration | PLANNED |
| Authentication | PLANNED |
| Token Management | PLANNED |
| Authorization | PLANNED |
| Secrets Management | PLANNED |
| Password Security | PLANNED |
| Input Validation | PLANNED |
| SQL Injection Prevention | PLANNED |
| XSS Prevention | PLANNED |
| CORS | PLANNED |
| Rate Limiting | PLANNED |
| Logging | PLANNED |
| Security Headers | PLANNED |
| HTTPS/TLS | PLANNED |
| Dependency Scanning | PLANNED |

---

**End of Security Model Document**
