# LIST OF REMOVED MOCKS

All hardcoded mock data has been extracted to `lib/dev-fixtures.ts` (gated behind `NEXT_PUBLIC_DEV_MODE=true`) and replaced with live API calls that gracefully fall back to dev fixtures when the backend is unavailable.

---

## 1. `components/admin/dashboard/RealTimeComplaints.tsx`

| Mock Location | What it was | Replaced With |
|---|---|---|
| Lines 5-45 (original) | 4 hardcoded `Complaint[]` objects (SEC-8821, SEC-8818, SEC-8815, SEC-8811) | `getComplaints({ limit: 10, sort: '-createdAt' })` API call → `getDevComplaints()` fallback |
| Line 72 (original) | `12_ACTIVE_NODES` static count | Dynamic `{totalCount}_ACTIVE_NODES` from API `meta.total` |

## 2. `app/admin/dashboard/page.tsx`

| Mock Location | What it was | Replaced With |
|---|---|---|
| Lines 42-47 (original) | 4 hardcoded stat objects (`System_Grievances: 1,284`, etc.) | `getDashboardStats()` API → `getDevDashboardStats()` fallback |
| Lines 77-86 (original) | 3 hardcoded infra metrics (`Bandwidth: 84%`, `Memory: 62%`, `CPU_Cycles: 24%`) | `getDevInfraMetrics()` dev fixtures (no live API yet — future infra monitoring) |

## 3. `app/admin/complaints/page.tsx`

| Mock Location | What it was | Replaced With |
|---|---|---|
| Lines 8-37 (original) | 3 hardcoded complaint objects (SEC-8821, SEC-8818, SEC-8815) | `getComplaints({ page, limit, status, search })` API → `getDevComplaints()` fallback |
| Line 45 (original) | `12 IT-related packets found` static count | Dynamic `{totalCount}` from API `meta.total` |

## 4. `app/admin/analytics/page.tsx`

| Mock Location | What it was | Replaced With |
|---|---|---|
| Lines 54-59 (original) | 4 hardcoded analytics stats | `getDashboardStats()` API → `getDevAnalyticsStats()` fallback |
| Lines 97 (original) | 12 hardcoded bar chart values `[40, 70, 45, 90, ...]` | `getDevBarChartValues()` dev fixtures (bar chart is UI-only visualization) |
| Lines 139-143 (original) | 3 hardcoded department loads (`Examination: 45%`, etc.) | API `data.departments` breakdown → `getDevDepartmentLoads()` fallback |
| Lines 205-210 (original) | 4 hardcoded timeline entries (SEC-992 through SEC-989) | `getDevTimeline()` dev fixtures |

## 5. `app/admin/settings/page.tsx`

| Mock Location | What it was | Replaced With |
|---|---|---|
| Lines 73-77 (original) | 3 hardcoded admin user objects (`Arunachal_Support`, `Karmu_Admin`, `Pema_Dev`) | `getAdminUsers()` API → `getDevAdmins()` fallback |
| Lines 55-63 (original) | Static "Generate Credentials" form (non-functional) | Real `createAdminUser()` API call with validation, error/success display |
| Lines 93-97 (original) | 3 hardcoded system config items | `getDevSystemConfigs()` dev fixtures + live "Rotate Password" action |

## 6. `components/admin/dashboard/Topbar.tsx`

| Mock Location | What it was | Replaced With |
|---|---|---|
| Line 47 (original) | Hardcoded `Arunachal_Support` username | `getMe()` API → dynamic `userName` state |
| Line 48 (original) | Hardcoded `Security Level 4` | Dynamic `securityLevel` from authenticated user profile |
| Line 50 (original) | Hardcoded `AS` initials | Dynamic `userInitials` computed from user name |
| N/A | No logout functionality | `logoutAdmin()` API call in dropdown menu |

## 7. `components/ComplaintForm.tsx`

| Mock Location | What it was | Replaced With |
|---|---|---|
| `handleSubmit` (original) | `console.log(formData)` + `alert('Complaint submitted successfully!')` | `submitComplaint(data)` API call → success/error result display |

## 8. `components/admin/AdminLoginForm.tsx`

| Mock Location | What it was | Replaced With |
|---|---|---|
| `handleSubmit` (original) | `setTimeout(() => router.push('/admin/dashboard'), 1500)` simulated auth | `loginAdmin(email, password)` API call with error handling + `mustRotatePassword` redirect |

---

## Summary

| Metric | Count |
|---|---|
| **Files modified** | 8 |
| **Mock data locations removed** | 19 |
| **API endpoints now called** | 9 (`login`, `logout`, `me`, `rotate-password`, `getComplaints`, `getDashboardStats`, `getAdminUsers`, `createAdminUser`, `submitComplaint`) |
| **Dev fixture functions used** | 11 (all gated behind `NEXT_PUBLIC_DEV_MODE`) |

All mock data is now in a single centralized file (`lib/dev-fixtures.ts`) and will return empty/default values when `NEXT_PUBLIC_DEV_MODE` is not set to `'true'`.
