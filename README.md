# Samadhan AI — State Grievance Redressal Platform

> AI-powered citizen grievance management system for the Arunachal Pradesh Public Service Commission. Built with Next.js 16, MongoDB, and Gemini 2.5 Flash.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Citizen Portal          Admin Dashboard          Public API│
│  (React 19 / Tailwind)   (React 19 / Tailwind)             │
└────────────┬─────────────────────┬──────────────────┬───────┘
             │                     │                  │
┌────────────▼─────────────────────▼──────────────────▼───────┐
│                  Next.js 16 App Router                      │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌──────────┐  │
│  │Middleware │  │ API Routes │  │ Cron Jobs│  │ Webhooks │  │
│  │(CSP/Auth)│  │  (54 total)│  │ (5 jobs) │  │(Calls)   │  │
│  └──────────┘  └─────┬──────┘  └────┬─────┘  └────┬─────┘  │
└──────────────────────┼──────────────┼──────────────┼────────┘
                       │              │              │
  ┌────────────────────▼──────────────▼──────────────▼────────┐
  │                    Service Layer                           │
  │  Auth · Gemini AI · Email · Notifications · Rate Limiting │
  └───┬──────┬──────────┬──────────┬──────────┬───────────────┘
      │      │          │          │          │
  ┌───▼──┐ ┌▼────┐ ┌───▼───┐ ┌───▼────┐ ┌───▼──────┐
  │Mongo │ │Redis│ │Resend │ │Gemini  │ │Cloudinary│
  │ DB   │ │(KV) │ │(Email)│ │2.5Flash│ │ (Media)  │
  └──────┘ └─────┘ └───────┘ └────────┘ └──────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16.1.6 (App Router, Turbopack) |
| **Language** | TypeScript 5.9 (strict mode) |
| **UI** | React 19, Tailwind CSS 3, Lucide icons |
| **Database** | MongoDB Atlas (Mongoose 9) — 14 models |
| **Cache / Rate Limiting** | Upstash Redis |
| **AI Analysis** | Google Gemini 2.5 Flash |
| **AI Calling** | LiveKit SIP + Twilio |
| **Email** | Resend (OTP, status updates, resolution) |
| **File Storage** | Cloudinary |
| **Auth** | JWT (access + refresh tokens), bcrypt, OTP |
| **Validation** | Zod 4 |
| **Testing** | Vitest, Testing Library, happy-dom |
| **Deployment** | Vercel (serverless) / Docker |

## Features

### Citizen Portal
- 📝 Submit grievances with geolocation + file attachments
- 🤖 AI-powered chat support per complaint
- 📊 Real-time complaint tracking with timeline
- 🔔 In-app + email notifications on status changes
- 📱 Mobile-responsive with bottom navigation
- 🔐 OTP-based authentication (phone/email)
- 💾 Form draft auto-save (localStorage)

### Admin Dashboard
- 📈 Real-time dashboard with stat cards + activity feed
- 🧠 AI auto-classification (category, priority, department, SLA)
- 🏢 Multi-department routing with RBAC (head_admin / department_admin / staff)
- 📞 AI voice calling via LiveKit + Twilio
- 📋 Bulk actions (assign, escalate, close)
- 🔍 Full-text search + advanced filters (date, status, priority, SLA, department)
- 📊 Analytics with charts (trend, SLA compliance, resolution time)
- 📝 Internal notes + audit trail with hash-chain integrity
- 👤 Contact reveal with reason logging
- 📤 CSV export

### Platform
- 🔒 CSP, HSTS, rate limiting (5 tiers), body size limits
- ⏰ 5 automated cron jobs (SLA check, SLA warning, stale detection, data retention, call scheduler)
- 📡 Health check endpoint (`/api/health`)
- 🗄️ Redis caching for dashboard stats (5-min TTL + invalidation on writes)
- 📜 Structured JSON logging
- ✅ 100 unit tests (auth, validation, API utils, email, notifications)

## Getting Started

### Prerequisites
- Node.js 20+
- MongoDB (Atlas or local)
- Redis (Upstash or local)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

### 3. Seed the database
```bash
npm run seed:departments    # Create 23 departments
npm run seed:admin          # Create head admin account
npm run seed:dept-admin     # Create department admin (optional)
```

### 4. Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — citizen portal  
Open [http://localhost:3000/admin/login](http://localhost:3000/admin/login) — admin dashboard

### Docker (alternative)
```bash
docker compose up
```
Starts the app + MongoDB 7 + Redis 7. Access at `http://localhost:3000`.

## Environment Variables

See [.env.example](.env.example) for the full list of 49 variables. Key required vars:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | JWT signing secret (≥16 chars) |
| `JWT_REFRESH_SECRET` | JWT refresh secret (≥16 chars) |
| `RESEND_API_KEY` | Resend email API key |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `GEMINI_API_KEY` | Google Gemini API key |

## API Overview

**54 API routes** organized into 10 groups:

| Group | Key Endpoints |
|-------|--------------|
| **Auth** | `POST /api/auth/login`, `/logout`, `/refresh`, `/rotate-password` |
| **Citizen Auth** | `POST /api/citizen/auth/register`, `/send-otp`, `/verify-otp`, `/login` |
| **Complaints** | `GET/POST /api/complaints`, `PATCH /api/complaints/[id]` |
| **Complaint Actions** | `POST .../assign`, `.../escalate`, `.../notes`, `.../reveal-contact` |
| **Citizen** | `GET /api/citizen/complaints`, `/profile`, `/notifications` |
| **Admin** | `GET /api/admin/stats`, `/analytics`, `/audit`, `/users` |
| **Departments** | `GET/POST /api/admin/departments`, `PATCH .../[id]` |
| **Chat** | `POST /api/chat/[complaintId]/messages`, `GET /api/chat/sessions` |
| **Calls** | `POST /api/calls/initiate`, `POST /api/calls/webhook` |
| **Public** | `GET /api/health`, `GET /api/stats` |

## Cron Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| SLA Check | Every 6h | Detect SLA breaches, notify admins |
| SLA Warning | Every 6h | Pre-breach alerts (24h before deadline) |
| Stale Complaints | Every 12h | Flag stuck pending (48h) / in-progress (7d) |
| Data Retention | Weekly (Sun 3am) | Clean old call logs + expired notifications |
| Call Scheduler | Every minute | Process queued AI voice calls |

## Testing

```bash
npm test                # Run all 100 tests
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage report
```

## Project Structure

```
app/
├── api/                # 54 API route handlers
│   ├── admin/          # Admin management + cron jobs
│   ├── auth/           # Admin JWT authentication
│   ├── calls/          # AI voice calling
│   ├── chat/           # AI chat per complaint
│   ├── citizen/        # Citizen portal API
│   ├── complaints/     # Core CRUD + actions
│   ├── health/         # Health check
│   └── upload/         # File uploads
├── admin/              # Admin dashboard pages
├── citizen/            # Citizen portal pages
└── complaint/          # Public complaint form
components/
├── admin/              # Admin UI components (18)
├── skeletons/          # Loading skeleton components
├── EmptyState.tsx      # Zero-data state component
└── Toast.tsx           # Global toast notification system
lib/
├── models/             # 14 Mongoose models
├── hooks/              # Custom React hooks (useFormAutosave)
├── api-utils.ts        # Response helpers, rate limiting
├── auth.ts             # JWT + bcrypt utilities
├── redis.ts            # Cache, rate limiters, OTP store
├── gemini.ts           # AI analysis pipeline
├── email.ts            # Resend email templates
├── notifications.ts    # Admin notification service
├── citizen-notification-service.ts  # Citizen notifications + email
├── validations.ts      # 20+ Zod schemas
├── logger.ts           # Structured JSON logger
└── env.ts              # Zod environment validation
__tests__/unit/         # 100 unit tests (5 suites)
scripts/                # DB seed + migration scripts
```

## Security

- **Authentication**: JWT access/refresh tokens with rotation + stolen-token detection
- **Rate Limiting**: 5 tiers (API, complaint, login, OTP, mutation) via Upstash sliding window
- **Headers**: CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy
- **Validation**: Zod schemas on every input, body size limits (10 MB uploads, 100 KB JSON)
- **Audit**: Hash-chain audit log (tamper-evident), contact reveal logging
- **Data**: PII masking in API responses, bcrypt password hashing

## Deployment

### Vercel (recommended)
1. Push to GitHub
2. Connect repo to Vercel
3. Set environment variables
4. Deploy — cron jobs auto-configure from `vercel.json`

### Docker
```bash
docker build --target production -t samadhan-ai .
docker run -p 3000:3000 --env-file .env.local samadhan-ai
```

## License

Private — Arunachal Pradesh Public Service Commission

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
