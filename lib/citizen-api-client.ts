/**
 * Frontend API client for citizen portal.
 * Mirrors the admin api-client pattern but uses citizen auth cookies.
 *
 * - All requests include `credentials: 'include'` for httpOnly cookies
 * - On 401, attempts silent refresh via /api/citizen/auth/refresh
 * - Falls back to /citizen/login on refresh failure
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

async function citizenRequest<T>(
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
  if (
    response.status === 401 &&
    !endpoint.includes('/auth/refresh') &&
    !endpoint.includes('/auth/login')
  ) {
    const refreshed = await attemptCitizenTokenRefresh();
    if (refreshed) {
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
    // Refresh failed — redirect to citizen login
    if (typeof window !== 'undefined') {
      window.location.href = '/citizen/login';
    }
  }

  return response.json();
}

async function attemptCitizenTokenRefresh(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/citizen/auth/refresh`, {
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

export interface CitizenRegisterPayload {
  name: string;
  phone: string;
  email: string;
  password: string;
  state?: string;
  district?: string;
}

export async function registerCitizen(data: CitizenRegisterPayload) {
  return citizenRequest<{ message: string; email: string }>('/api/citizen/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function verifyCitizenOtp(email: string, code: string) {
  return citizenRequest<{ message: string; citizen: Record<string, unknown> }>(
    '/api/citizen/auth/verify-otp',
    {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }
  );
}

export async function resendCitizenOtp(email: string) {
  return citizenRequest<{ message: string }>('/api/citizen/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function loginCitizen(email: string, password: string) {
  return citizenRequest<{ citizen: Record<string, unknown> }>('/api/citizen/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logoutCitizen() {
  return citizenRequest<{ message: string }>('/api/citizen/auth/logout', {
    method: 'POST',
  });
}

export async function getCitizenMe() {
  return citizenRequest<{ citizen: Record<string, unknown> }>('/api/citizen/auth/me');
}

// ---------------------------------------------------------------------------
// Complaints API
// ---------------------------------------------------------------------------

export interface CitizenComplaintPayload {
  title: string;
  description: string;
  submitterName?: string;
  submitterPhone?: string;
  submitterEmail?: string;
  location?: string;
  state?: string;
  district?: string;
  coordinates?: { lat: number; lng: number };
  callConsent?: boolean;
  attachments?: Array<{
    fileName: string;
    fileType: string;
    fileSize: number;
    url: string;
    publicId: string;
    thumbnailUrl: string;
  }>;
}

export interface CitizenComplaintQuery {
  page?: number;
  limit?: number;
  status?: string;
  sort?: string;
}

export async function submitCitizenComplaint(data: CitizenComplaintPayload) {
  return citizenRequest<{ complaintId: string; message: string; status: string }>(
    '/api/citizen/complaints',
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}

export async function getCitizenComplaints(query: CitizenComplaintQuery = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  const qs = params.toString();
  return citizenRequest<Record<string, unknown>[]>(
    `/api/citizen/complaints${qs ? `?${qs}` : ''}`
  );
}

export async function getCitizenComplaintById(id: string) {
  return citizenRequest<Record<string, unknown>>(`/api/citizen/complaints/${id}`);
}

export interface TimelineEvent {
  id: string;
  action: string;
  label: string;
  description: string;
  type: 'created' | 'updated' | 'resolved' | 'escalated' | 'ai';
  timestamp: string;
  reason?: string;
  comment?: string;
}

export async function getCitizenComplaintTimeline(id: string) {
  return citizenRequest<TimelineEvent[]>(`/api/citizen/complaints/${id}/timeline`);
}

export async function trackComplaint(complaintId: string) {
  return citizenRequest<Record<string, unknown>>(
    `/api/citizen/complaints/track?complaintId=${encodeURIComponent(complaintId)}`
  );
}

// ---------------------------------------------------------------------------
// Profile API
// ---------------------------------------------------------------------------

export interface CitizenProfileUpdate {
  name?: string;
  state?: string;
  district?: string;
}

export async function updateCitizenProfile(data: CitizenProfileUpdate) {
  return citizenRequest<{ message: string; citizen: Record<string, unknown> }>(
    '/api/citizen/profile',
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  );
}

// ---------------------------------------------------------------------------
// Notifications API
// ---------------------------------------------------------------------------

export interface CitizenNotification {
  _id: string;
  citizenId: string;
  citizenEmail: string;
  type: string;
  title: string;
  message: string;
  relatedComplaintId: string | null;
  relatedComplaintTrackingId: string | null;
  isRead: boolean;
  readAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export async function getCitizenNotifications(query: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
} = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.unreadOnly) params.set('unreadOnly', 'true');
  const qs = params.toString();
  return citizenRequest<CitizenNotification[]>(
    `/api/citizen/notifications${qs ? `?${qs}` : ''}`
  );
}

export async function getCitizenUnreadCount() {
  return citizenRequest<{ unreadCount: number }>(
    '/api/citizen/notifications/count'
  );
}

export async function markCitizenNotificationsRead(ids: string[]) {
  return citizenRequest<{ marked: number }>(
    '/api/citizen/notifications',
    {
      method: 'PATCH',
      body: JSON.stringify({ ids }),
    }
  );
}

export async function markAllCitizenNotificationsRead() {
  return citizenRequest<{ marked: number }>(
    '/api/citizen/notifications',
    {
      method: 'PATCH',
      body: JSON.stringify({ all: true }),
    }
  );
}

// ---------------------------------------------------------------------------
// Chat API (citizen JWT auth)
// ---------------------------------------------------------------------------

export interface ChatSessionInfo {
  _id: string;
  complaintId: string;
  title: string;
  email: string;
  accessToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageInfo {
  _id: string;
  senderType: 'user' | 'ai';
  content: string;
  createdAt: string;
}

export async function getCitizenChatSessions() {
  return citizenRequest<ChatSessionInfo[]>('/api/citizen/chats');
}

export async function getCitizenChatMessages(complaintId: string) {
  return citizenRequest<ChatMessageInfo[]>(
    `/api/citizen/chats/${encodeURIComponent(complaintId)}/messages`
  );
}

export async function sendCitizenChatMessage(complaintId: string, message: string) {
  return citizenRequest<{
    userMessage: ChatMessageInfo;
    aiMessage: ChatMessageInfo;
  }>(`/api/citizen/chats/${encodeURIComponent(complaintId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}
