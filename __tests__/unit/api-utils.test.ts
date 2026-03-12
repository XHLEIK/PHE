/**
 * Unit tests — API Utilities
 * Tests: formatZodErrors, successResponse, errorResponse, getClientIp,
 *        generateComplaintId, getCorsHeaders, checkRateLimit.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  formatZodErrors,
  successResponse,
  errorResponse,
  getClientIp,
  generateComplaintId,
  getCorsHeaders,
  checkRateLimit,
} from '@/lib/api-utils';

// ---------------------------------------------------------------------------
// formatZodErrors
// ---------------------------------------------------------------------------
describe('formatZodErrors', () => {
  it('maps path+message to field+message', () => {
    const issues = [
      { path: ['email'] as readonly PropertyKey[], message: 'Invalid email' },
      { path: ['address', 'zip'] as readonly PropertyKey[], message: 'Required' },
    ];
    const result = formatZodErrors(issues);
    expect(result).toEqual([
      { field: 'email', message: 'Invalid email' },
      { field: 'address.zip', message: 'Required' },
    ]);
  });

  it('handles empty array', () => {
    expect(formatZodErrors([])).toEqual([]);
  });

  it('handles numeric path segments', () => {
    const issues = [
      { path: ['items', 0, 'name'] as readonly PropertyKey[], message: 'Required' },
    ];
    const result = formatZodErrors(issues);
    expect(result).toEqual([{ field: 'items.0.name', message: 'Required' }]);
  });

  it('handles empty path', () => {
    const issues = [{ path: [] as readonly PropertyKey[], message: 'Root error' }];
    expect(formatZodErrors(issues)).toEqual([{ field: '', message: 'Root error' }]);
  });
});

// ---------------------------------------------------------------------------
// successResponse
// ---------------------------------------------------------------------------
describe('successResponse', () => {
  it('returns a 200 JSON response with success:true', async () => {
    const res = successResponse({ count: 5 });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.count).toBe(5);
    expect(body.correlationId).toBeDefined();
    expect(res.status).toBe(200);
  });

  it('supports custom status code', async () => {
    const res = successResponse('created', undefined, 201);
    expect(res.status).toBe(201);
  });

  it('includes meta when provided', async () => {
    const res = successResponse([], { page: 1, limit: 20, total: 100, totalPages: 5 });
    const body = await res.json();
    expect(body.meta).toEqual({ page: 1, limit: 20, total: 100, totalPages: 5 });
  });

  it('includes security headers', () => {
    const res = successResponse({});
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('X-Correlation-Id')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// errorResponse
// ---------------------------------------------------------------------------
describe('errorResponse', () => {
  it('returns a 400 response by default', async () => {
    const res = errorResponse('Bad request');
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Bad request');
    expect(res.status).toBe(400);
  });

  it('supports custom status', async () => {
    const res = errorResponse('Not found', 404);
    expect(res.status).toBe(404);
  });

  it('includes field-level errors', async () => {
    const errors = [{ field: 'email', message: 'Required' }];
    const res = errorResponse('Validation failed', 400, errors);
    const body = await res.json();
    expect(body.errors).toEqual(errors);
  });
});

// ---------------------------------------------------------------------------
// getClientIp
// ---------------------------------------------------------------------------
describe('getClientIp', () => {
  it('extracts IP from x-forwarded-for', () => {
    const req = {
      headers: { get: (key: string) => key === 'x-forwarded-for' ? '1.2.3.4, 5.6.7.8' : null },
    } as any;
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip', () => {
    const req = {
      headers: { get: (key: string) => key === 'x-real-ip' ? '10.0.0.1' : null },
    } as any;
    expect(getClientIp(req)).toBe('10.0.0.1');
  });

  it('returns unknown when no headers', () => {
    const req = {
      headers: { get: () => null },
    } as any;
    expect(getClientIp(req)).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// generateComplaintId
// ---------------------------------------------------------------------------
describe('generateComplaintId', () => {
  it('starts with GRV- prefix', () => {
    const id = generateComplaintId();
    expect(id.startsWith('GRV-')).toBe(true);
  });

  it('contains date portion', () => {
    const id = generateComplaintId();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    expect(id).toContain(date);
  });

  it('has consistent format length', () => {
    const id = generateComplaintId();
    // Format: GRV-YYYYMMDD-XXXX = 4 + 8 + 4 + 2 dashes = 18 chars
    expect(id.length).toBe(17);
  });
});

// ---------------------------------------------------------------------------
// getCorsHeaders
// ---------------------------------------------------------------------------
describe('getCorsHeaders', () => {
  it('returns standard CORS headers', () => {
    const headers = getCorsHeaders();
    expect(headers['Access-Control-Allow-Methods']).toContain('GET');
    expect(headers['Access-Control-Allow-Methods']).toContain('POST');
    expect(headers['Access-Control-Allow-Credentials']).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// checkRateLimit (in-memory)
// ---------------------------------------------------------------------------
describe('checkRateLimit', () => {
  it('allows requests within limit', () => {
    const key = `test-rate-limit-${Date.now()}`;
    const r1 = checkRateLimit(key, 3, 60_000);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit(key, 3, 60_000);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit(key, 3, 60_000);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('blocks requests over limit', () => {
    const key = `test-rate-limit-block-${Date.now()}`;
    checkRateLimit(key, 1, 60_000);
    const r2 = checkRateLimit(key, 1, 60_000);
    expect(r2.allowed).toBe(false);
    expect(r2.remaining).toBe(0);
  });

  it('resets after window expires', async () => {
    const key = `test-rate-limit-expire-${Date.now()}`;
    checkRateLimit(key, 1, 50); // 50ms window

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 100));

    const r2 = checkRateLimit(key, 1, 50);
    expect(r2.allowed).toBe(true);
  });
});
