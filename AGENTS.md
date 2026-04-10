# AGENTS.md — Samadhan AI

## Commands

### Development
```bash
npm run dev        # Next.js dev + Python agent (concurrently)
npm run build      # Production build
npm run start      # Start production server
npm run lint       # ESLint (next/core-web-vitals + next/typescript)
```

### Testing (Vitest)
```bash
npm test                      # Run all tests
npm run test:watch            # Watch mode
npm run test:coverage         # Coverage report (v8 provider)
npx vitest run __tests__/unit/auth.test.ts          # Single test file
npx vitest run -t "password hashing"                # Tests matching pattern
npx vitest run __tests__/unit/auth.test.ts -t "JWT" # File + pattern
```

### Seeding & Migrations
```bash
npm run seed:departments    # Create 23 departments
npm run seed:admin          # Create head admin account
npm run seed:dept-admin     # Create department admin
npm run migrate:roles       # Migrate roles
```

## Code Style

### Imports & Paths
- Use `@/*` path alias for absolute imports (e.g., `@/lib/auth`, `@/components/Toast`)
- Group imports: external libraries → `@/` modules → relative imports
- Use named exports; default exports only for Next.js pages/layouts

### TypeScript
- **Strict mode** enabled (`strict: true` in tsconfig.json)
- Use `interface` for object shapes, `type` for unions/intersections
- Avoid `any`; use `unknown` when type is truly unknown
- All API responses must conform to `ApiResponse<T>` from `@/lib/api-utils`
- Token payloads use `TokenPayload` from `@/lib/auth`

### Naming Conventions
- Files: `kebab-case.ts` (e.g., `api-utils.ts`, `citizen-notification-service.ts`)
- Components: `PascalCase.tsx` (e.g., `EmptyState.tsx`, `Toast.tsx`)
- Variables/functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE` (e.g., `REVEAL_REASONS`, `ADMIN_ROLES`)
- Interfaces/types: `PascalCase` (e.g., `ApiResponse`, `TokenPayload`)

### Validation
- All inputs validated with **Zod 4** schemas in `@/lib/validations.ts`
- Use `.trim().toLowerCase()` on email fields
- Format Zod errors via `formatZodErrors()` from `@/lib/api-utils`

### Error Handling
- API routes: return structured error responses with `correlationId`
- JWT verification: return `null` on failure (never throw)
- Use `try/catch` in API handlers; log errors with structured JSON via `@/lib/logger`
- Environment variables validated at startup via `@/lib/env.ts` (Zod schema)

### API Response Format
```ts
{ success: true, data: T, meta?: {...}, correlationId: string }
{ success: false, error: string, correlationId: string }
```

### Security
- All routes protected by middleware (`middleware.ts`)
- Admin APIs: check `access_token` cookie
- Citizen APIs: check `citizen_access_token` cookie
- Rate limiting via Upstash Redis (5 tiers)
- CSP, HSTS, X-Frame-Options DENY on all responses

### React Components
- Use functional components with explicit prop types
- Tailwind CSS for styling; use custom theme tokens (`gov-blue`, `gov-aqua`, `gov-neutral`)
- Lucide React for icons
- Loading states use skeleton components from `@/components/skeletons/`

### Testing
- Test files: `__tests__/unit/*.test.ts`
- Use `describe/it/expect` from vitest
- Setup file: `__tests__/setup.ts` (provides mock env vars)
- Environment: `happy-dom`
- Mock external services (Resend, Upstash, Gemini) in tests

### Architecture
- **Next.js 16** App Router with Turbopack
- **React 19** with server/client components
- **MongoDB** via Mongoose 9 (14 models in `lib/models/`)
- **Redis** via Upstash (caching, rate limiting, OTP)
- **AI**: Google Gemini 2.5 Flash for classification + chat
- **Auth**: JWT access/refresh tokens with rotation
- **RBAC**: `head_admin` / `department_admin` / `staff` roles in `lib/rbac/`
