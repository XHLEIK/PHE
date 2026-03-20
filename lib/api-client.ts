/**
 * Frontend API client — handles all backend calls with proper auth cookie handling.
 *
 * Integration notes:
 * - All requests include `credentials: 'include'` to send httpOnly cookies
 * - Access token is stored in an httpOnly cookie (set by the server)
 * - Refresh token is also httpOnly, scoped to /api/auth path
 * - On 401 responses, the client attempts a silent token refresh
 * - If refresh fails, redirects to /admin/login
 */

// We don't want absolute URLs when calling from the client side because it breaks on production domains.
// Next.js fetch() automatically acts relative to the current origin on the client.
const API_BASE = '';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  correlationId: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // Attempt silent refresh on 401
  if (response.status === 401 && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
    const refreshResult = await attemptTokenRefresh();
    if (refreshResult) {
      // Retry original request
      const retryResponse = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      return retryResponse.json();
    }
    // Refresh failed — redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login';
    }
  }

  return response.json();
}

async function attemptTokenRefresh(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------
export async function loginAdmin(email: string, password: string) {
  return request<{ user: Record<string, unknown>; mustRotatePassword: boolean }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logoutAdmin() {
  return request<{ message: string }>('/api/auth/logout', {
    method: 'POST',
  });
}

export async function getMe() {
  return request<{ user: Record<string, unknown>; mustRotatePassword: boolean }>('/api/auth/me');
}

export async function rotatePassword(currentPassword: string, newPassword: string) {
  return request<{ message: string }>('/api/auth/rotate-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

// ---------------------------------------------------------------------------
// Complaints API
// ---------------------------------------------------------------------------
export interface AttachmentPayload {
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  publicId: string;
  thumbnailUrl: string;
}

export interface ComplaintPayload {
  title: string;
  description: string;
  submitterName: string;
  submitterPhone: string;
  submitterEmail: string;
  location?: string;
  state?: string;
  district?: string;
  coordinates?: { lat: number; lng: number };
  callConsent?: boolean;
  attachments?: AttachmentPayload[];
}

export async function submitComplaint(data: ComplaintPayload) {
  return request<{ complaintId: string; message: string; status: string }>('/api/complaints', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface ComplaintQuery {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  sort?: string;
  search?: string;
}

export async function getComplaints(query: ComplaintQuery = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  const qs = params.toString();
  return request<Record<string, unknown>[]>(`/api/complaints${qs ? `?${qs}` : ''}`);
}

export async function getComplaintById(id: string) {
  return request<Record<string, unknown>>(`/api/complaints/${id}`);
}

export async function updateComplaint(id: string, data: Record<string, unknown>) {
  return request<Record<string, unknown>>(`/api/complaints/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ---------------------------------------------------------------------------
// Admin Management API
// ---------------------------------------------------------------------------
export async function getAdminUsers() {
  return request<Record<string, unknown>[]>('/api/admin/users');
}

export interface CreateAdminPayload {
  email: string;
  name: string;
  temporaryPassword: string;
  role?: string;
  departments?: string[];
  phone?: string;
  locationScope?: Record<string, string>;
  [key: string]: unknown;
}

export async function createAdminUser(data: CreateAdminPayload) {
  return request<Record<string, unknown>>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getAdminUserById(id: string) {
  return request<Record<string, unknown>>(`/api/admin/users/${id}`);
}

export async function updateAdminUser(id: string, data: Record<string, unknown>) {
  return request<Record<string, unknown>>(`/api/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function resetAdminPassword(id: string, temporaryPassword: string) {
  return request<{ message: string }>(`/api/admin/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ temporaryPassword }),
  });
}

// ---------------------------------------------------------------------------
// Dashboard Stats API
// ---------------------------------------------------------------------------
export async function getDashboardStats() {
  return request<{
    overview: Record<string, unknown>;
    priorities: Record<string, number>;
    categories: Array<{ category: string; count: number }>;
    departments: Array<{ id: string; label: string; total: number; pending: number; resolved: number; deferred: number }>;
    analysis: Record<string, number>;
  }>('/api/admin/stats');
}

// ---------------------------------------------------------------------------
// Contact Reveal API
// ---------------------------------------------------------------------------
export async function revealContact(complaintId: string, reason: string) {
  return request<{ phone: string | null; email: string | null; name: string | null }>(
    `/api/complaints/${complaintId}/reveal-contact`,
    { method: 'POST', body: JSON.stringify({ reason }) }
  );
}

// ---------------------------------------------------------------------------
// Re-analyze API (trigger AI re-analysis)
// ---------------------------------------------------------------------------
export async function reanalyzeComplaint(complaintId: string) {
  return request<Record<string, unknown>>(
    `/api/complaints/${complaintId}/reanalyze`,
    { method: 'POST' }
  );
}

// ---------------------------------------------------------------------------
// Department Stats API
// ---------------------------------------------------------------------------
export async function getDepartmentStats() {
  return request<Array<{
    id: string;
    label: string;
    description: string;
    sla_days: number;
    escalation_level: number;
    active: boolean;
    totalGrievances: number;
    resolvedGrievances: number;
    pendingGrievances: number;
    assignedAdmins: number;
  }>>('/api/admin/departments/stats');
}

// ---------------------------------------------------------------------------
// Chat API (citizen-facing, token-based auth)
// ---------------------------------------------------------------------------

export async function createChatSession(complaintId: string, email: string) {
  return request<{ sessionId: string; complaintId: string; accessToken: string }>('/api/chat/sessions', {
    method: 'POST',
    body: JSON.stringify({ complaintId, email }),
  });
}

export async function getChatSessions(token: string) {
  return request<Array<{ complaintId: string; title: string; createdAt: string; accessToken: string }>>(
    `/api/chat/sessions?token=${encodeURIComponent(token)}`
  );
}

export async function getChatMessages(complaintId: string, token: string) {
  return request<Array<{ _id: string; senderType: 'user' | 'ai'; content: string; createdAt: string }>>(
    `/api/chat/${encodeURIComponent(complaintId)}/messages?token=${encodeURIComponent(token)}`
  );
}

export async function sendChatMessage(complaintId: string, message: string, token: string) {
  return request<{
    userMessage: { _id: string; senderType: 'user'; content: string; createdAt: string };
    aiMessage: { _id: string; senderType: 'ai'; content: string; createdAt: string };
  }>(`/api/chat/${encodeURIComponent(complaintId)}/messages?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function deleteChatSession(complaintId: string, token: string) {
  return request<{ message: string }>(
    `/api/chat/${encodeURIComponent(complaintId)}/messages?token=${encodeURIComponent(token)}`,
    { method: 'DELETE' }
  );
}

// ---------------------------------------------------------------------------
// Audit API
// ---------------------------------------------------------------------------
export async function getAuditLogs(query: { page?: number; limit?: number; action?: string; actor?: string } = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  const qs = params.toString();
  return request<Record<string, unknown>[]>(`/api/admin/audit${qs ? `?${qs}` : ''}`);
}

// ── Call management ──────────────────────────────────────────────────

export async function initiateCall(complaintId: string) {
  return request<{ success: boolean; roomName: string; callLogId: string }>(
    '/api/calls/initiate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ complaintId }),
    }
  );
}

export async function getCallLogs(complaintId: string) {
  return request<Record<string, unknown>[]>(`/api/calls/${complaintId}`);
}

// ---------------------------------------------------------------------------
// Notifications API (Phase 2)
// ---------------------------------------------------------------------------
export interface NotificationQuery {
  page?: number;
  limit?: number;
  isRead?: string;
  type?: string;
}

export async function getNotifications(query: NotificationQuery = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  const qs = params.toString();
  return request<Record<string, unknown>[]>(`/api/admin/notifications${qs ? `?${qs}` : ''}`);
}

export async function getUnreadNotificationCount() {
  return request<{ unreadCount: number }>('/api/admin/notifications/count');
}

export async function markNotificationRead(notificationId: string) {
  return request<Record<string, unknown>>('/api/admin/notifications', {
    method: 'PATCH',
    body: JSON.stringify({ notificationId }),
  });
}

export async function markAllNotificationsRead() {
  return request<{ modifiedCount: number }>('/api/admin/notifications', {
    method: 'PATCH',
    body: JSON.stringify({ markAllRead: true }),
  });
}

// ---------------------------------------------------------------------------
// Complaint Workflow API (Phase 2)
// ---------------------------------------------------------------------------

// Internal Notes
export async function getComplaintNotes(complaintId: string) {
  return request<Record<string, unknown>[]>(`/api/complaints/${complaintId}/notes`);
}

export async function addComplaintNote(complaintId: string, content: string) {
  return request<Record<string, unknown>>(`/api/complaints/${complaintId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

// Assign Complaint
export async function assignComplaint(complaintId: string, data: { assignToEmail?: string; assignToSelf?: boolean }) {
  return request<Record<string, unknown>>(`/api/complaints/${complaintId}/assign`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Escalate Complaint
export async function escalateComplaint(complaintId: string, toDepartment: string, reason: string) {
  return request<Record<string, unknown>>(`/api/complaints/${complaintId}/escalate`, {
    method: 'POST',
    body: JSON.stringify({ toDepartment, reason }),
  });
}

// Bulk Update
export interface BulkUpdatePayload {
  complaintIds: string[];
  updates: {
    status?: string;
    priority?: string;
    department?: string;
    assignedTo?: string;
  };
  reason: string;
}

export async function bulkUpdateComplaints(data: BulkUpdatePayload) {
  return request<{ message: string; total: number; found: number; modified: number }>('/api/complaints/bulk', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// Enhanced Complaint Query
export interface EnhancedComplaintQuery extends ComplaintQuery {
  department?: string;
  assignedTo?: string;
  slaBreached?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function getComplaintsEnhanced(query: EnhancedComplaintQuery = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  const qs = params.toString();
  return request<Record<string, unknown>[]>(`/api/complaints${qs ? `?${qs}` : ''}`);
}

// ---------------------------------------------------------------------------
// Analytics API (Phase 2)
// ---------------------------------------------------------------------------
export interface AnalyticsQuery {
  period?: '7d' | '30d' | '90d' | 'custom';
  department?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function getAnalytics(query: AnalyticsQuery = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  const qs = params.toString();
  return request<{
    period: { from: string; to: string; label: string };
    overview: { total: number; statusDistribution: Record<string, number>; priorityDistribution: Record<string, number> };
    trend: Array<{ date: string; count: number }>;
    departments: Array<Record<string, unknown>>;
    sla: { totalWithSla: number; breached: number; onTrack: number; complianceRate: string };
    resolutionTime: { avgHours: number; minHours: number; maxHours: number; resolvedCount: number };
  }>(`/api/admin/analytics${qs ? `?${qs}` : ''}`);
}

// ---------------------------------------------------------------------------
// Activity Feed API (Phase 2)
// ---------------------------------------------------------------------------
export interface ActivityQuery {
  page?: number;
  limit?: number;
  action?: string;
  actor?: string;
}

export async function getActivityFeed(query: ActivityQuery = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  const qs = params.toString();
  return request<Record<string, unknown>[]>(`/api/admin/activity${qs ? `?${qs}` : ''}`);
}

// ---------------------------------------------------------------------------
// Department Admin Management API (Phase 2)
// ---------------------------------------------------------------------------
export async function getDepartmentAdmins(departmentId: string) {
  return request<{ department: { id: string; label: string }; admins: Record<string, unknown>[]; total: number }>(
    `/api/admin/departments/${departmentId}/admins`
  );
}

export async function assignDepartmentAdmin(departmentId: string, adminEmail: string) {
  return request<Record<string, unknown>>(`/api/admin/departments/${departmentId}/admins`, {
    method: 'POST',
    body: JSON.stringify({ adminEmail }),
  });
}

export async function removeDepartmentAdmin(departmentId: string, adminEmail: string) {
  return request<Record<string, unknown>>(
    `/api/admin/departments/${departmentId}/admins?adminEmail=${encodeURIComponent(adminEmail)}`,
    { method: 'DELETE' }
  );
}
