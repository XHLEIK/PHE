# Operations Runbook

> Day-to-day ops procedures for the Samadhan AI Grievance Platform.

---

## Table of Contents

1. [Admin User Management](#1-admin-user-management)
2. [Department Configuration](#2-department-configuration)
3. [Cron Job Health](#3-cron-job-health)
4. [SLA Breach Investigation](#4-sla-breach-investigation)
5. [Secret Rotation](#5-secret-rotation)
6. [Database Maintenance](#6-database-maintenance)
7. [Cache Management](#7-cache-management)
8. [Incident Response](#8-incident-response)
9. [Common Troubleshooting](#9-common-troubleshooting)

---

## 1. Admin User Management

### Create a new admin

```bash
# Via the seed script (head_admin creates from dashboard)
# Or call the API directly:
curl -X POST https://your-app.vercel.app/api/admin/users \
  -H "Cookie: access_token=<HEAD_ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Officer",
    "email": "officer@dept.gov.in",
    "password": "SecureP@ss123",
    "role": "department_admin",
    "department": "Public Works"
  }'
```

### Roles

| Role              | Scope                              |
|-------------------|------------------------------------|
| `head_admin`      | Full access, all departments       |
| `department_admin`| Own department only                |
| `officer`         | Assigned complaints only           |

### Reset admin password

Use `POST /api/auth/rotate-password` with the current password, or have a head_admin delete and recreate the user.

---

## 2. Department Configuration

Departments are defined in `lib/constants.ts` → `DEPARTMENTS` array (23 departments).

### Add a new department

1. Edit `lib/constants.ts` — add to `DEPARTMENTS`.
2. Ensure MongoDB text indexes cover the new department name (they use the complaint `department` field).
3. Create a `department_admin` user scoped to the new department.
4. Restart / redeploy.

### Change SLA deadlines

SLA deadlines are set at complaint creation (default: 7 days). To change:

1. Edit the complaint POST handler in `app/api/complaints/route.ts`.
2. Look for `slaDeadline` assignment — adjust the `addDays(...)` logic.
3. Deploy.

---

## 3. Cron Job Health

| Job            | Endpoint                     | Schedule       | Purpose                      |
|----------------|------------------------------|----------------|------------------------------|
| SLA Warning    | `/api/cron/sla-warning`      | Every 6 hours  | Email warnings for near-SLA  |
| Stale Cleanup  | `/api/cron/stale-complaints` | Daily 2 AM     | Auto-escalate stale items    |
| Data Retention | `/api/cron/data-retention`   | Weekly Sunday   | Purge old audit logs         |

### Verify cron health

```bash
# Manually trigger (requires CRON_SECRET)
curl -X GET https://your-app.vercel.app/api/cron/sla-warning \
  -H "Authorization: Bearer $CRON_SECRET"

# Check Vercel cron logs
vercel logs --filter=cron
```

### Vercel cron config

Defined in `vercel.json` → `crons` array. Adjust schedule using standard cron syntax.

### If a cron is failing

1. Check Vercel function logs for the specific route.
2. Verify `CRON_SECRET` env var is set in Vercel dashboard.
3. Check MongoDB connection (health endpoint: `GET /api/health`).
4. Temporarily increase function timeout in `vercel.json` if timing out.

---

## 4. SLA Breach Investigation

### Find breached complaints

```js
// MongoDB shell
db.complaints.find({
  slaBreached: true,
  status: { $nin: ['resolved', 'closed'] }
}).sort({ slaDeadline: 1 }).limit(20)
```

### Via admin dashboard

1. Navigate to **Admin → Complaints**.
2. Use the "SLA Breached" filter toggle.
3. Sort by oldest to prioritize.

### Root cause analysis

Common reasons:
- Department understaffed → check department complaint volume in Analytics.
- Complaint stuck in `triage` → AI classification may have failed; check `analysisStatus: 'deferred'`.
- No assignee → use bulk assign from dashboard.

---

## 5. Secret Rotation

### JWT secrets

1. Generate new secrets: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
2. Update in Vercel dashboard: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CITIZEN_JWT_SECRET`, `CITIZEN_JWT_REFRESH_SECRET`.
3. **Impact:** All existing sessions invalidated. Users must re-login.
4. Deploy new version.

### API keys (Gemini, Resend, Cloudinary, etc.)

1. Rotate on the respective service dashboard.
2. Update env vars in Vercel.
3. Redeploy.
4. Test via `GET /api/health`.

### CRON_SECRET

1. Generate: `openssl rand -hex 32`
2. Update in Vercel env vars.
3. Update in `vercel.json` if hard-coded anywhere.
4. Redeploy.

---

## 6. Database Maintenance

### Connection monitoring

```bash
# Health check includes DB status
curl https://your-app.vercel.app/api/health | jq .database
# Expected: "connected"
```

### Index management

Key indexes (ensure they exist):

```js
db.complaints.getIndexes()
// Should include:
// - { complaintId: 1 } unique
// - { status: 1, department: 1 }
// - { citizenId: 1, createdAt: -1 }
// - { slaDeadline: 1, slaBreached: 1 }
// - { "$**": "text" } for full-text search
```

### Backup

MongoDB Atlas handles automated backups. For manual:

```bash
mongodump --uri="$MONGODB_URI" --out=backup-$(date +%F)
```

---

## 7. Cache Management

### Redis keys

| Pattern                    | TTL    | Purpose                |
|----------------------------|--------|------------------------|
| `stats:*`                  | 300s   | Dashboard stats cache  |
| `analytics:*`              | 300s   | Analytics cache        |
| `rate-limit:*`             | varies | Request rate limiting  |
| `otp:*`                    | 300s   | Citizen OTP codes      |
| `mutation-rate:*`          | 60s    | Write rate limiting    |

### Flush stale cache

```bash
# Via Redis CLI (Upstash)
redis-cli -u $REDIS_URL
> KEYS stats:*
> DEL stats:head_admin:all
```

Cache auto-invalidates on complaint create/update. Manual flush is rarely needed.

### If Redis is down

The app degrades gracefully:
- Rate limiting falls back to allow (no blocking).
- Cache misses hit MongoDB directly.
- OTP verification will fail — citizens can't login.

---

## 8. Incident Response

### App returning 500s

1. **Check health:** `curl /api/health` — identify if DB or Redis is down.
2. **Check logs:** `vercel logs --since=1h` or Vercel dashboard → Functions tab.
3. **Common causes:**
   - MongoDB Atlas maintenance → check Atlas status page.
   - Redis quota exceeded → check Upstash dashboard.
   - Function timeout → increase in `vercel.json`.

### Citizen can't submit complaint

1. Check rate limiter: `redis-cli KEYS "rate-limit:*"` — citizen may be rate-limited.
2. Check Cloudinary (if attachments failing).
3. Check complaint creation logs for validation errors.

### AI classification not working

1. Verify `GEMINI_API_KEY` is valid.
2. Check complaint `analysisStatus`:
   - `deferred` = AI failed, will retry.
   - `queued` = waiting for processing.
3. Manually re-trigger: update complaint `analysisStatus` to `queued`.

### Email not sending

1. Check Resend dashboard for bounces/limits.
2. Verify `RESEND_API_KEY` and `FROM_EMAIL` env vars.
3. Check function logs for Resend API errors.

---

## 9. Common Troubleshooting

| Symptom                        | Check                                        | Fix                                    |
|--------------------------------|----------------------------------------------|----------------------------------------|
| "Unauthorized" on all routes   | JWT_SECRET env var                           | Ensure it matches across environments  |
| Slow dashboard                 | Redis cache miss + large DB                  | Verify cache TTL, add indexes          |
| Cron not running               | Vercel cron config                           | Check `vercel.json`, redeploy          |
| OTP not received               | Resend logs, spam folder                     | Verify FROM_EMAIL domain is configured |
| Complaint stuck in `pending`   | AI classification queue                      | Check Gemini API, re-queue complaint   |
| CORS error on frontend         | Middleware CSP / CORS headers                | Update allowed origins in middleware   |
| Docker build fails             | `Dockerfile`, node version                   | Ensure Node 18+ and `npm ci` works    |

---

## Monitoring Checklist (Daily)

- [ ] `GET /api/health` returns `{ status: "ok" }`
- [ ] SLA breached count is not spiking (Admin Dashboard)
- [ ] Cron jobs ran successfully (Vercel logs)
- [ ] Redis memory usage < 80% (Upstash dashboard)
- [ ] MongoDB connection count normal (Atlas metrics)
- [ ] No new 5xx errors in function logs
