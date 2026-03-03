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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

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
export interface ComplaintPayload {
  title: string;
  description: string;
  category: string;
  priority: string;
  location?: string;
  submitterName?: string;
  submitterContact?: string;
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
  securityLevel: number;
  temporaryPassword: string;
}

export async function createAdminUser(data: CreateAdminPayload) {
  return request<Record<string, unknown>>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
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
    departments: Array<{ department: string; count: number }>;
  }>('/api/admin/stats');
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
