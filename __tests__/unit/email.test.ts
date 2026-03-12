/**
 * Unit tests — Email Service
 * Tests all email functions with mocked Brevo REST API (fetch).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Set env before module load
process.env.BREVO_API_KEY = 'test-brevo-key';
process.env.BREVO_FROM_EMAIL = 'test@samadhan.gov.in';
process.env.BREVO_FROM_NAME = 'Samadhan AI';

import {
  sendOtpEmail,
  sendStatusUpdateEmail,
  sendResolutionEmail,
  sendWelcomeEmail,
  sendGenericEmail,
} from '@/lib/email';

const mockFetch = vi.fn();
let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ messageId: 'msg-ok' }),
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ---------------------------------------------------------------------------
// sendOtpEmail
// ---------------------------------------------------------------------------
describe('sendOtpEmail', () => {
  it('sends OTP email with correct subject', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ messageId: 'msg-1' }),
    });

    const result = await sendOtpEmail('user@test.com', '123456', 'registration');
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledOnce();

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.to).toEqual([{ email: 'user@test.com' }]);
    expect(body.subject).toContain('123456');
    expect(body.htmlContent).toContain('123456');
  });

  it('includes purpose-specific text for login', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ messageId: 'msg-2' }),
    });

    await sendOtpEmail('user@test.com', '654321', 'login');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.htmlContent).toContain('log in to your account');
  });

  it('handles Brevo API errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ message: 'Rate limit exceeded' }),
    });

    const result = await sendOtpEmail('user@test.com', '111111');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Rate limit exceeded');
  });

  it('handles thrown exceptions', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await sendOtpEmail('user@test.com', '111111');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });
});

// ---------------------------------------------------------------------------
// sendStatusUpdateEmail
// ---------------------------------------------------------------------------
describe('sendStatusUpdateEmail', () => {
  it('sends status update with colored badge', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ messageId: 'msg-3' }),
    });

    const result = await sendStatusUpdateEmail(
      'citizen@test.com',
      'GRV-AP-VIS-20260101-0001',
      'in_progress',
      'Your complaint is being reviewed.'
    );
    expect(result.success).toBe(true);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.to).toEqual([{ email: 'citizen@test.com' }]);
    expect(body.subject).toContain('In Progress');
    expect(body.htmlContent).toContain('GRV-AP-VIS-20260101-0001');
    expect(body.htmlContent).toContain('Your complaint is being reviewed.');
  });

  it('formats status label correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ messageId: 'msg-4' }),
    });

    await sendStatusUpdateEmail('a@b.com', 'ID-1', 'resolved', 'Done');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.subject).toContain('Resolved');
  });
});

// ---------------------------------------------------------------------------
// sendResolutionEmail
// ---------------------------------------------------------------------------
describe('sendResolutionEmail', () => {
  it('sends resolution email with summary', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ messageId: 'msg-5' }),
    });

    const result = await sendResolutionEmail(
      'citizen@test.com',
      'GRV-KA-BLR-20260101-0005',
      'The road has been repaired by the PWD department.'
    );
    expect(result.success).toBe(true);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.subject).toContain('Resolved');
    expect(body.htmlContent).toContain('road has been repaired');
    expect(body.htmlContent).toContain('reopen the grievance');
  });
});

// ---------------------------------------------------------------------------
// sendWelcomeEmail
// ---------------------------------------------------------------------------
describe('sendWelcomeEmail', () => {
  it('sends welcome email with user name', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ messageId: 'msg-6' }),
    });

    const result = await sendWelcomeEmail('new@user.com', 'Ramesh Kumar');
    expect(result.success).toBe(true);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.htmlContent).toContain('Ramesh Kumar');
    expect(body.htmlContent).toContain('Submit grievances');
    expect(body.subject).toContain('Welcome');
  });
});

// ---------------------------------------------------------------------------
// sendGenericEmail
// ---------------------------------------------------------------------------
describe('sendGenericEmail', () => {
  it('wraps body in base template', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ messageId: 'msg-7' }),
    });

    const result = await sendGenericEmail(
      'admin@gov.in',
      'Test Notification',
      '<p>Custom HTML content</p>'
    );
    expect(result.success).toBe(true);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.htmlContent).toContain('Custom HTML content');
    expect(body.htmlContent).toContain('National Grievance');
    expect(body.subject).toContain('Test Notification');
  });
});
