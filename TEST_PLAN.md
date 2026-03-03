# TEST PLAN

## APPSC Grievance Redressal — Test Strategy & Cases

---

## 1. Test Strategy

### Approach
- **Unit Tests**: Validate individual utility functions (auth, validation, API utils)
- **Integration Tests**: Validate API routes end-to-end (via HTTP calls)
- **Smoke Tests**: Verify critical flows work after deployment

### Tools
- **tsx**: TypeScript execution for test scripts
- **Native assert**: Node.js built-in `assert` module (zero dependency)
- **fetch**: Native fetch for API integration tests

### Running Tests
```bash
npm test
# or
npx tsx scripts/run-tests.ts
```

---

## 2. Unit Test Cases

### 2.1 `lib/auth.ts`

| ID | Test Case | Input | Expected |
|---|---|---|---|
| U-01 | Hash password produces string | `'TestPassword123!'` | Non-empty string, not equal to input |
| U-02 | Verify correct password | hash + `'TestPassword123!'` | `true` |
| U-03 | Verify wrong password | hash + `'WrongPassword'` | `false` |
| U-04 | Generate access token | `{ userId: 'x', email: 'a@b.c', role: 'admin' }` | Non-empty JWT string |
| U-05 | Verify valid access token | token from U-04 | Decoded payload with userId |
| U-06 | Verify expired token | expired JWT | `null` |
| U-07 | Hash token produces hex string | `'some-token'` | 64-char hex string (SHA-256) |

### 2.2 `lib/validations.ts`

| ID | Test Case | Input | Expected |
|---|---|---|---|
| V-01 | Valid login schema | `{ email: 'a@b.com', password: '12345678' }` | Success |
| V-02 | Invalid email in login | `{ email: 'notanemail', password: '12345678' }` | Validation error |
| V-03 | Short password in login | `{ email: 'a@b.com', password: '123' }` | Validation error |
| V-04 | Valid complaint creation | Full valid complaint object | Success |
| V-05 | Title too long (>200) | 201 char title | Validation error |
| V-06 | Invalid category | `{ category: 'invalid' }` | Validation error |
| V-07 | XSS in title stripped | `'<script>alert(1)</script>Test'` | `'Test'` (tags removed) |
| V-08 | Valid password rotation | 12+ chars with complexity | Success |
| V-09 | Weak new password | `'short'` | Validation error |
| V-10 | Missing uppercase in password | `'alllowercase123!'` | Validation error |

### 2.3 `lib/api-utils.ts`

| ID | Test Case | Input | Expected |
|---|---|---|---|
| A-01 | Success response format | `successResponse({ foo: 1 })` | `{ success: true, data: { foo: 1 }, correlationId: string }` |
| A-02 | Error response format | `errorResponse('fail', 400)` | Status 400, `{ success: false, error: 'fail' }` |
| A-03 | Generate complaint ID format | `generateComplaintId()` | Matches `GRV-YYYYMMDD-NNNN` pattern |
| A-04 | Rate limiter allows first request | New key | `{ allowed: true }` |
| A-05 | Rate limiter blocks after max | Same key × (max+1) | `{ allowed: false }` |

---

## 3. Integration Test Cases

### 3.1 Auth Flow

| ID | Test Case | Method | Endpoint | Expected |
|---|---|---|---|---|
| I-01 | Login with valid credentials | POST | `/api/auth/login` | 200, Set-Cookie headers, `{ success: true }` |
| I-02 | Login with wrong password | POST | `/api/auth/login` | 401, `{ success: false, error: 'Invalid credentials' }` |
| I-03 | Login with non-existent email | POST | `/api/auth/login` | 401, `{ success: false }` |
| I-04 | Get current user (authenticated) | GET | `/api/auth/me` | 200, user profile |
| I-05 | Get current user (no token) | GET | `/api/auth/me` | 401 |
| I-06 | Refresh token rotation | POST | `/api/auth/refresh` | 200, new cookie pair |
| I-07 | Logout clears cookies | POST | `/api/auth/logout` | 200, cleared cookies |
| I-08 | Rate limit on login (6th attempt) | POST ×6 | `/api/auth/login` | 429 on 6th attempt |

### 3.2 Complaint CRUD

| ID | Test Case | Method | Endpoint | Expected |
|---|---|---|---|---|
| I-10 | Create complaint (public) | POST | `/api/complaints` | 201, complaintId in `GRV-*` format |
| I-11 | Create with missing title | POST | `/api/complaints` | 400, validation errors |
| I-12 | List complaints (admin) | GET | `/api/complaints` | 200, paginated array |
| I-13 | Filter by status | GET | `/api/complaints?status=pending` | 200, only pending items |
| I-14 | Search complaints | GET | `/api/complaints?search=payment` | 200, matching results |
| I-15 | Get single complaint | GET | `/api/complaints/GRV-*` | 200, complaint object |
| I-16 | Update complaint status | PATCH | `/api/complaints/GRV-*` | 200, updated complaint |
| I-17 | Rate limit on complaint submit | POST ×4 | `/api/complaints` | 429 on 4th attempt |

### 3.3 Admin Management

| ID | Test Case | Method | Endpoint | Expected |
|---|---|---|---|---|
| I-20 | List admin users | GET | `/api/admin/users` | 200, array of users |
| I-21 | Create new admin | POST | `/api/admin/users` | 201, new user (no passwordHash) |
| I-22 | Create admin with weak password | POST | `/api/admin/users` | 400, validation error |
| I-23 | Dashboard stats | GET | `/api/admin/stats` | 200, overview/priorities/categories |
| I-24 | Audit logs | GET | `/api/admin/audit` | 200, paginated log entries |

### 3.4 Password Rotation

| ID | Test Case | Method | Endpoint | Expected |
|---|---|---|---|---|
| I-30 | Rotate with valid passwords | POST | `/api/auth/rotate-password` | 200, success message |
| I-31 | Rotate with wrong current | POST | `/api/auth/rotate-password` | 401, error |
| I-32 | Rotate with weak new password | POST | `/api/auth/rotate-password` | 400, validation error |

---

## 4. Smoke Tests (Post-Deploy)

| ID | Test Case | Steps | Expected |
|---|---|---|---|
| S-01 | Public complaint submission | Visit /, fill form, submit | Success message with complaint ID |
| S-02 | Admin login | Visit /admin/login, enter credentials | Redirect to /admin/dashboard |
| S-03 | Dashboard loads live data | Login → Dashboard | Stats reflect DB state |
| S-04 | Complaint list loads | Login → Complaints | Real complaints listed |
| S-05 | Logout works | Click user dropdown → Logout | Redirect to /admin/login |
| S-06 | Protected route redirect | Visit /admin/dashboard without cookie | Redirect to /admin/login |

---

## 5. Security Tests

| ID | Test Case | Expected |
|---|---|---|
| SEC-01 | Access admin API without token | 401 response |
| SEC-02 | CORS blocks unauthorized origin | No `Access-Control-Allow-Origin` header |
| SEC-03 | XSS payload in complaint title | Tags stripped from stored data |
| SEC-04 | SQL/NoSQL injection in search | No error, safe query execution |
| SEC-05 | Account lockout after 5 failures | 423 Locked response |
| SEC-06 | Expired access token rejected | 401, triggers refresh flow |
| SEC-07 | Reused refresh token revokes all | All user sessions invalidated |

---

## 6. Coverage Targets

| Area | Target |
|---|---|
| Auth utilities | 100% |
| Validation schemas | 100% |
| API utils | 90% |
| API routes | 80% |
| Frontend components | Smoke only |
