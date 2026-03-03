# FEATURE DESIGN DOCUMENT

## APPSC Grievance Redressal — Backend & Secure Integration

---

## 1. Authentication Flow

### 1.1 Login Flow
```
Client                    Server (/api/auth/login)           MongoDB
  |  POST {email,pwd}  →  |                                   |
  |                        | → validate(loginSchema)            |
  |                        | → checkRateLimit(ip, 5/15min)     |
  |                        | → User.findOne({email})        →  |
  |                        | ← user doc                     ←  |
  |                        | → verifyPassword(pwd, hash)       |
  |                        | → checkAccountLock(user)           |
  |                        | → generateAccessToken(15min)       |
  |                        | → generateRefreshToken(7d)         |
  |                        | → hashToken(refreshToken)          |
  |                        | → RefreshToken.create(hash)     →  |
  |                        | → createAuditEntry('login')     →  |
  |  ← Set-Cookie(access)  |                                   |
  |  ← Set-Cookie(refresh) |                                   |
  |  ← { user, mustRotate }|                                   |
```

### 1.2 Token Strategy
- **Access Token**: JWT, 15-min TTL, `HttpOnly; SameSite=Strict; Secure(prod); Path=/`
- **Refresh Token**: JWT, 7-day TTL, `HttpOnly; SameSite=Strict; Secure(prod); Path=/api/auth`
- **Rotation**: Every refresh issues a new token pair. Reuse of an old refresh token triggers immediate revocation of ALL user tokens (stolen-token protection).

### 1.3 Account Lockout
- 5 consecutive failed attempts → account locked
- Lock duration: exponential backoff: `min(2^(attempts-5) * 60s, 1 hour)`
- Successful login resets failed attempt counter

### 1.4 Password Policy
- Minimum 12 characters
- Must contain: uppercase, lowercase, digit, special character
- `mustRotatePassword` flag forces password change on first login
- Enforced server-side via Zod schema (`rotatePasswordSchema`)

---

## 2. Admin Management

### 2.1 User Model
```typescript
{
  email: string (unique, indexed)
  passwordHash: string (bcrypt, 12 rounds)
  name: string
  role: 'admin' | 'superadmin'
  securityLevel: 1-4
  mustRotatePassword: boolean
  isLocked: boolean
  failedLoginAttempts: number
  lockUntil: Date | null
  lastLoginAt: Date | null
  createdBy: ObjectId (ref: User)
  isSeeded: boolean
}
```

### 2.2 Admin Creation
- `POST /api/admin/users` — requires authenticated admin
- Sets `mustRotatePassword: true` for all new admins
- Temporary password must meet full password policy
- Audit log entry created with `admin.create` action

### 2.3 Seeding
- `npm run seed:admin` — idempotent CLI script
- Reads `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from env
- Creates superadmin (Level 4) with `isSeeded: true, mustRotatePassword: true`

---

## 3. Complaint Lifecycle

### 3.1 Status Machine
```
PENDING → TRIAGE → IN_PROGRESS → RESOLVED → CLOSED
                 ↘               ↗
                  (can skip stages)
```

### 3.2 Complaint Model
```typescript
{
  complaintId: string  // GRV-YYYYMMDD-NNNN (human-readable)
  title: string (max 200, sanitized)
  description: string (max 5000, sanitized)
  category: 'exam' | 'payment' | 'technical' | 'document' | 'result' | 'other'
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'triage' | 'in_progress' | 'resolved' | 'closed'
  location: string (optional)
  department: string (optional)
  assignedTo: ObjectId (ref: User, optional)
  submitterName: string (optional)
  submitterContact: string (optional)
  attachments: [{ filename, originalName, mimeType, size }]
  aiAnalyzed: boolean
  aiAnalysisResult: mixed (future AI output)
}
```

### 3.3 Public Submission
- `POST /api/complaints` — no auth required
- Rate limited: 3 complaints per IP per 15 minutes
- Generates human-readable ID (e.g., `GRV-20250112-0042`)
- Auto-creates `AnalysisTask` for future AI pipeline
- Input sanitized and validated via Zod

### 3.4 Admin Operations
- `GET /api/complaints` — paginated, filterable, sortable, searchable (text index on title+description)
- `GET /api/complaints/[id]` — single complaint by complaintId
- `PATCH /api/complaints/[id]` — update status/priority/department/assignedTo with change tracking

---

## 4. Audit Trail

### 4.1 Hash-Chain Integrity
Each audit entry computes a SHA-256 hash incorporating:
- The entry's own data (action, actor, target, changes, timestamp)
- The previous entry's `integrityHash`

This creates a tamper-evident chain — any modification to historical entries breaks the chain.

### 4.2 Immutability Guards
- `findOneAndUpdate` and `findOneAndDelete` hooks throw errors
- Only `create()` and `insertMany()` are allowed
- `createAuditEntry()` helper enforces chain computation

### 4.3 Tracked Actions
| Action | Trigger |
|---|---|
| `admin.login` | Successful login |
| `admin.login.failed` | Failed login attempt |
| `admin.logout` | Explicit logout |
| `admin.create` | New admin user created |
| `password.rotate` | Password changed |
| `complaint.create` | New complaint submitted |
| `complaint.update` | Complaint status/priority changed |

---

## 5. AI Analysis Pipeline (Future)

### 5.1 AnalysisTask Model
```typescript
{
  complaintId: ObjectId (ref: Complaint)
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result: mixed
  attempts: number (max 3)
}
```

### 5.2 Design Intent
- Tasks created automatically on complaint submission
- Future worker process picks up `pending` tasks
- Integrates with Gemini API or equivalent LLM
- Results written back to both AnalysisTask and Complaint documents
- Placeholder: `GEMINI_API_KEY` in `.env.example`

---

## 6. API Architecture

### 6.1 Response Envelope
All API responses follow a consistent format:
```json
{
  "success": true|false,
  "data": { ... },
  "error": "string (on failure)",
  "errors": [{ "field": "...", "message": "..." }],
  "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 },
  "correlationId": "uuid-v4"
}
```

### 6.2 Rate Limiting
In-memory rate limiter with configurable windows:
- Login: 5 attempts per 15 minutes per IP
- Complaint creation: 3 per 15 minutes per IP
- General API: configurable via env vars

### 6.3 Frontend Client
`lib/api-client.ts` provides typed functions for all endpoints:
- Automatic `credentials: 'include'` for cookie auth
- Silent token refresh on 401 responses
- Redirect to `/admin/login` on refresh failure
- Graceful fallback to dev fixtures when backend is offline

---

## 7. Middleware Stack

```
Request → middleware.ts
  ├── /admin/* (except /admin/login)
  │     → Check access_token cookie → redirect to /admin/login if missing
  ├── /api/*
  │     → CORS enforcement (origin whitelist from CORS_ALLOWED_ORIGINS)
  │     → Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
  └── Pass through
```
