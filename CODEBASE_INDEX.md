# CODEBASE INDEX — APPSC Grievance Redressal System

> **Generated:** 2026-02-28  
> **Project:** Next-Gen Multilingual Grievance Redressal (SAMADHAN)  
> **Framework:** Next.js 16 (App Router) / React 19 / TypeScript 5 / Tailwind CSS 4

---

## 1. File & Component Manifest

### Configuration Files

| Path | Purpose | Owner | Status |
|---|---|---|---|
| `package.json` | Project manifest, scripts, dependencies | DevOps | ✅ Functional |
| `next.config.mjs` | Next.js configuration (empty — no custom settings) | DevOps | ⚠️ Minimal |
| `tsconfig.json` | TypeScript config with `@/*` path alias, ES2017 target | DevOps | ✅ Functional |
| `tailwind.config.ts` | Tailwind CSS v4 config with CSS-variable colors | DevOps | ⚠️ Color vars mismatched with `globals.css` |
| `postcss.config.mjs` | PostCSS config using `@tailwindcss/postcss` | DevOps | ✅ Functional |
| `.eslintrc.json` | ESLint extending `next/core-web-vitals` + `next/typescript` | DevOps | ⚠️ Config version mismatch (Next 14 config on Next 16) |
| `.gitignore` | Standard Next.js gitignore | DevOps | 🔴 Does NOT ignore `backend/.env` or root `.env` |
| `next-env.d.ts` | Auto-generated Next.js type declarations | Auto | ✅ |
| `README.md` | Default create-next-app readme, not customized | — | ⚠️ Boilerplate |

### Global Styles

| Path | Purpose | Status |
|---|---|---|
| `styles/globals.css` | Tailwind v4 import, CSS variables, `.glass-card` + `.dark-input` utilities | ✅ Functional |

### Lib / Shared

| Path | Purpose | Exports | Status |
|---|---|---|---|
| `lib/constants.ts` | Static reference data | `COMPLAINT_CATEGORIES` (5 items), `COMPLAINT_PRIORITIES` (3 items) | ✅ Legitimate reference data |

### App Pages

| Path | Purpose | Rendering | Status |
|---|---|---|---|
| `app/layout.tsx` | Root layout, Inter font, global metadata | Server | ✅ Clean |
| `app/page.tsx` | Landing page with CTA to `/complaint` | Server | ✅ Minimal but functional |
| `app/complaint/page.tsx` | Complaint submission page, renders `ComplaintForm` | Server (shell) | ⚠️ Dead FAQ/Contact links (`#`) |
| `app/admin/login/page.tsx` | Admin login, split-panel design, renders `AdminLoginForm` | Server (shell) | ⚠️ "Request Access Support" button non-functional |
| `app/admin/dashboard/page.tsx` | Main admin dashboard — stats + live feed + infra monitor | Client (`'use client'`) | 🔴 All data hardcoded; unused imports (DashboardHeader, StatsCard, SystemLoadPanel) |
| `app/admin/complaints/page.tsx` | Active grievances list | Client | 🔴 All data hardcoded; buttons non-functional |
| `app/admin/analytics/page.tsx` | Charts, analytics, AI advisory | Client | 🔴 All data hardcoded; custom SVG charts |
| `app/admin/departments/page.tsx` | Department/node monitoring | Client | 🔴 All data hardcoded; dynamic Tailwind classes broken |
| `app/admin/settings/page.tsx` | Admin management & system config | Client | 🔴 All data hardcoded; form submits nowhere |

### Shared Components

| Path | Purpose | Client? | Status |
|---|---|---|---|
| `components/Button.tsx` | Reusable button (primary/secondary/gradient + loading) | No | ✅ Well-built |
| `components/InputField.tsx` | Text input with label, error, icon, a11y | No | ✅ Good |
| `components/SelectField.tsx` | Select dropdown with custom chevron | No | ✅ Good |
| `components/TextAreaField.tsx` | Textarea with label, error, icon | No | ⚠️ Icon `pointer-events-none` conflicts with MicIcon `cursor-pointer` |
| `components/ComplaintForm.tsx` | Complaint submission form | Yes | 🔴 Fake submit (console.log + alert); fake AI analysis (setTimeout) |
| `components/admin/AdminButton.tsx` | Dark admin button with loading | No | ✅ |
| `components/admin/AdminInput.tsx` | Admin input with password toggle | Yes | ✅ Good a11y |
| `components/admin/AdminLoginForm.tsx` | Login form with email/password validation | Yes | 🔴 Fake auth — any valid email + 8-char password routes to dashboard |
| `components/admin/dashboard/ComplaintCard.tsx` | Single complaint card with priority/status styling | No | ⚠️ AI_DEBUG and Terminal buttons non-functional |
| `components/admin/dashboard/DashboardHeader.tsx` | Centered header with "System Online" badge | No | 🔴 **UNUSED** — imported but visually replaced by inline dashboard header |
| `components/admin/dashboard/RealTimeComplaints.tsx` | Complaint list with 4 hardcoded items | No | 🔴 Not real-time; all mock data |
| `components/admin/dashboard/Sidebar.tsx` | Fixed left sidebar nav (5 items + system status) | Yes | 🔴 System status all hardcoded (42ms, 98%, SECURED) |
| `components/admin/dashboard/StatsCard.tsx` | Reusable stat card | No | 🔴 **UNUSED** — dashboard inlines its own stats |
| `components/admin/dashboard/SystemLoadPanel.tsx` | System load monitor (CPU, Memory, etc.) | No | 🔴 **UNUSED** — dashboard inlines its own load monitor |
| `components/admin/dashboard/Topbar.tsx` | Admin top nav bar (search, bell, profile) | Yes | 🔴 All buttons non-functional; hardcoded user "Arunachal_Support" |

### Backend & Assets

| Path | Purpose | Status |
|---|---|---|
| `backend/.env` | Environment variables | 🔴 **CRITICAL: Contains real MongoDB URI + Gemini API key. NOT in .gitignore.** |
| `app/fonts/GeistVF.woff` | Geist variable font | 🔴 **UNUSED** — layout uses Inter from Google Fonts |
| `app/fonts/GeistMonoVF.woff` | Geist Mono variable font | 🔴 **UNUSED** |

---

## 2. Dependency Inventory

### Production Dependencies

| Package | Version | Purpose | Issue? |
|---|---|---|---|
| `next` | `^16.1.6` | React framework (App Router) | — |
| `react` | `^19.2.4` | UI library | — |
| `react-dom` | `^19.2.4` | React DOM renderer | — |
| `lucide-react` | `^0.575.0` | Icon library | — |
| `@tailwindcss/postcss` | `^4.2.1` | Tailwind PostCSS plugin | — |

### Dev Dependencies

| Package | Version | Purpose | Issue? |
|---|---|---|---|
| `@types/node` | `^20` | Node.js types | — |
| `@types/react` | `^18` | React types | 🔴 **Mismatch: React 19 installed, types for 18** |
| `@types/react-dom` | `^18` | React DOM types | 🔴 **Same mismatch** |
| `eslint` | `^8` | Linter | — |
| `eslint-config-next` | `14.2.23` | Next.js ESLint config | 🔴 **Mismatch: config for Next 14, project uses Next 16** |
| `postcss` | `^8.5.6` | CSS processor | — |
| `tailwindcss` | `^4.2.1` | CSS framework | — |
| `typescript` | `^5` | TypeScript compiler | — |

---

## 3. Mock / Dummy Data Inventory

| # | File | Lines | Description | Action Taken |
|---|---|---|---|---|
| 1 | `components/ComplaintForm.tsx` | L28-36 | Fake AI analysis (setTimeout → console.log) | Replaced with API call |
| 2 | `components/ComplaintForm.tsx` | L38-42 | Fake form submission (console.log + alert) | Replaced with API call |
| 3 | `components/admin/AdminLoginForm.tsx` | L70-76 | Fake auth (setTimeout → router.push, no credential check) | Replaced with API call |
| 4 | `components/admin/dashboard/RealTimeComplaints.tsx` | L6-44 | 4 hardcoded complaint objects | Replaced with API fetch / dev fixtures |
| 5 | `components/admin/dashboard/DashboardHeader.tsx` | L16 | Hardcoded "Last Updated: Today, 14:32" | Component unused, kept for reference |
| 6 | `components/admin/dashboard/Sidebar.tsx` | L73-85 | Hardcoded system status (Database SECURED, Latency 42ms, Health 98%) | Replaced with API health check / dev fixtures |
| 7 | `components/admin/dashboard/SystemLoadPanel.tsx` | L5-10 | Hardcoded stats (Active Users 14,204, Queue 182, etc.) | Component unused, kept for reference |
| 8 | `components/admin/dashboard/SystemLoadPanel.tsx` | L35-50 | Hardcoded progress bars (CPU 24%, Memory 68%) | Component unused, kept for reference |
| 9 | `components/admin/dashboard/Topbar.tsx` | L26-27 | Hardcoded user "Arunachal_Support", "Security Level 4" | Replaced with auth context |
| 10 | `app/admin/dashboard/page.tsx` | L34-39 | 4 inline hardcoded stat objects (Grievances 1,284, Alerts 14, etc.) | Replaced with API fetch / dev fixtures |
| 11 | `app/admin/dashboard/page.tsx` | L67-76 | 3 hardcoded infrastructure metrics (Bandwidth 84%, Memory 62%, CPU 24%) | Replaced with dev fixtures |
| 12 | `app/admin/complaints/page.tsx` | L9-33 | 3 hardcoded complaint objects (partially duplicate) | Replaced with API fetch |
| 13 | `app/admin/analytics/page.tsx` | L48-53 | 4 hardcoded analytics stats | Replaced with API fetch / dev fixtures |
| 14 | `app/admin/analytics/page.tsx` | L75-87 | 12 hardcoded bar chart values | Replaced with dev fixtures |
| 15 | `app/admin/analytics/page.tsx` | L130-135 | 3 department load percentages | Replaced with dev fixtures |
| 16 | `app/admin/analytics/page.tsx` | L207-212 | 4 resolution timeline entries | Replaced with dev fixtures |
| 17 | `app/admin/departments/page.tsx` | L9-42 | 4 hardcoded department objects | Replaced with dev fixtures |
| 18 | `app/admin/settings/page.tsx` | L80-84 | 3 hardcoded admin users | Replaced with API fetch |
| 19 | `app/admin/settings/page.tsx` | L114-118 | 3 system config items | Replaced with dev fixtures |

---

## 4. TODOs & Technical Debt

| # | Severity | Issue | Location |
|---|---|---|---|
| 1 | 🔴 CRITICAL | **Exposed secrets** — MongoDB URI and Gemini API key committed in `backend/.env`. `.gitignore` does not exclude it. | `backend/.env`, `.gitignore` |
| 2 | 🔴 CRITICAL | **No authentication** — Admin login accepts any email + 8-char password, simply redirects. | `AdminLoginForm.tsx` |
| 3 | 🔴 CRITICAL | **No route protection** — All `/admin/*` pages accessible directly via URL without auth. | All admin pages |
| 4 | 🔴 HIGH | **No API routes** — `app/api/` does not exist. Zero server-side functionality. | Project-wide |
| 5 | 🔴 HIGH | **No backend code** — `backend/` folder contains only `.env`. No server, models, controllers. | `backend/` |
| 6 | 🔴 HIGH | **No database integration** — MongoDB URI exists but is never used. | Project-wide |
| 7 | 🟠 MEDIUM | **React 19 ↔ React 18 types** — `@types/react` and `@types/react-dom` are `^18`. | `package.json` |
| 8 | 🟠 MEDIUM | **ESLint config mismatch** — `eslint-config-next@14.2.23` on Next.js 16. | `package.json` |
| 9 | 🟠 MEDIUM | **Dynamic Tailwind classes** — Template literals like `` `text-${color}-500` `` fail at build. | `dashboard/page.tsx`, `departments/page.tsx`, `analytics/page.tsx` |
| 10 | 🟠 MEDIUM | **Dead links** — FAQ and Contact Support point to `#`. | `complaint/page.tsx` |
| 11 | 🟠 MEDIUM | **All admin buttons non-functional** — AI_DEBUG, Terminal, System_Reboot, etc. | All admin pages |
| 12 | 🟡 LOW | **3 unused components** — `DashboardHeader`, `StatsCard`, `SystemLoadPanel` imported but not used meaningfully. | `components/admin/dashboard/` |
| 13 | 🟡 LOW | **2 unused font files** — Geist fonts in `app/fonts/` never imported. | `app/fonts/` |
| 14 | 🟡 LOW | **Tailwind CSS variable mismatch** — `tailwind.config.ts` defines `background`/`foreground` via CSS vars, but `globals.css` uses different var names. | Config + CSS |
| 15 | 🟡 LOW | **Duplicated mock data** — Complaints in `RealTimeComplaints.tsx` and `complaints/page.tsx` overlap. | Multiple files |

---

## 5. Accessibility Issues

| # | Issue | WCAG | Location |
|---|---|---|---|
| 1 | No skip-to-content link | 2.4.1 | All pages |
| 2 | Very small text (9-11px) throughout admin UI | 1.4.4 | All admin components |
| 3 | Low color contrast — Slate-500 on dark backgrounds (~3.2:1, needs 4.5:1) | 1.4.3 | All admin components |
| 4 | Sidebar nav lacks `aria-current="page"` | 4.1.2 | `Sidebar.tsx` |
| 5 | Notification bell lacks accessible count (`aria-label`) | 4.1.2 | `Topbar.tsx` |
| 6 | User dropdown is a plain `<div>` — not keyboard accessible, no ARIA roles | 2.1.1 | `Topbar.tsx` |
| 7 | Progress bars have no semantic role (`role="progressbar"`, `aria-valuenow`) | 4.1.2 | Multiple files |
| 8 | SVG charts not accessible — no labels, descriptions, or alt text | 1.1.1 | `analytics/page.tsx` |
| 9 | Form inputs in settings page have no `<label>` association | 1.3.1 | `settings/page.tsx` |
| 10 | Inline SVGs missing `aria-hidden="true"` or accessible labels | 1.1.1 | Multiple files |
| 11 | MicIcon has `cursor-pointer` + `role="button"` but parent has `pointer-events-none` | 2.1.1 | `ComplaintForm.tsx` / `TextAreaField.tsx` |
| 12 | Admin pages lack `<main>` landmark or have ambiguous structure | 1.3.1 | Some admin pages |

---

## 6. Performance Hotspots

| # | Issue | Impact | Location |
|---|---|---|---|
| 1 | Excessive `'use client'` — entire admin pages are client-rendered despite mostly static content | Larger JS bundle, slower FCP | All admin pages |
| 2 | No code splitting / lazy loading — Sidebar & Topbar imported synchronously everywhere | Redundant parsing per route | All admin pages |
| 3 | Multiple simultaneous `animate-pulse` / `animate-ping` animations | Unnecessary GPU compositing | Sidebar, Topbar, Dashboard |
| 4 | No `next/image` usage — pattern not established for future images | Missed optimization | Project-wide |
| 5 | Large inline SVGs instead of using already-installed `lucide-react` | Increased component size | `complaint/page.tsx`, `ComplaintForm.tsx` |
| 6 | No memoization (`useMemo`, `useCallback`, `React.memo`) | Arrays/objects re-created every render | All client components |
| 7 | Unused font files (`GeistVF.woff`, `GeistMonoVF.woff`) bundled | Unnecessary weight | `app/fonts/` |
| 8 | Heavy `backdrop-filter: blur()` on all `.glass-card` elements | Expensive on low-end devices | Admin UI |

---

## 7. Component Dependency Tree

```
app/layout.tsx (RootLayout — Server)
├── app/page.tsx (Home — Server)
│   └── <Link> → /complaint
├── app/complaint/page.tsx (Server)
│   └── components/ComplaintForm.tsx (Client)
│       ├── components/InputField.tsx
│       ├── components/TextAreaField.tsx
│       ├── components/SelectField.tsx
│       ├── components/Button.tsx
│       └── lib/constants.ts
├── app/admin/login/page.tsx (Server)
│   └── components/admin/AdminLoginForm.tsx (Client)
│       ├── components/admin/AdminInput.tsx (Client)
│       └── components/admin/AdminButton.tsx
├── app/admin/dashboard/page.tsx (Client)
│   ├── Sidebar.tsx (Client)
│   ├── Topbar.tsx (Client)
│   └── RealTimeComplaints.tsx → ComplaintCard.tsx
├── app/admin/complaints/page.tsx (Client)
│   ├── Sidebar.tsx, Topbar.tsx
│   └── Inline complaint data
├── app/admin/analytics/page.tsx (Client)
│   ├── Sidebar.tsx, Topbar.tsx
│   └── Inline chart/stats data
├── app/admin/departments/page.tsx (Client)
│   ├── Sidebar.tsx, Topbar.tsx
│   └── Inline department data
└── app/admin/settings/page.tsx (Client)
    ├── Sidebar.tsx, Topbar.tsx
    └── Inline admin/config data

UNUSED (orphaned):
  - components/admin/dashboard/DashboardHeader.tsx
  - components/admin/dashboard/StatsCard.tsx
  - components/admin/dashboard/SystemLoadPanel.tsx
```

---

*End of Codebase Index*
