import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * Standard API response envelope.
 * All API routes use this for consistent response shapes.
 */
export interface ApiResponse<T = unknown> {
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

export function successResponse<T>(
  data: T,
  meta?: ApiResponse['meta'],
  status = 200
): NextResponse<ApiResponse<T>> {
  const correlationId = uuidv4();
  return NextResponse.json(
    { success: true, data, meta, correlationId },
    {
      status,
      headers: {
        'X-Correlation-Id': correlationId,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      },
    }
  );
}

export function errorResponse(
  error: string,
  status = 400,
  errors?: Array<{ field: string; message: string }>
): NextResponse<ApiResponse> {
  const correlationId = uuidv4();
  return NextResponse.json(
    { success: false, error, errors, correlationId },
    {
      status,
      headers: {
        'X-Correlation-Id': correlationId,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      },
    }
  );
}

/**
 * Extract client IP from request headers (respecting proxies).
 */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Generate a human-readable complaint ID.
 */
export function generateComplaintId(): string {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `GRV-${datePart}-${rand}`;
}

/**
 * Extract and validate the access token from cookies.
 */
export function getAccessTokenFromCookies(req: NextRequest): string | null {
  const cookie = req.cookies.get('access_token');
  return cookie?.value ?? null;
}

/**
 * Extract the refresh token from cookies.
 */
export function getRefreshTokenFromCookies(req: NextRequest): string | null {
  const cookie = req.cookies.get('refresh_token');
  return cookie?.value ?? null;
}

/**
 * CORS headers for API routes.
 */
export function getCorsHeaders(): Record<string, string> {
  const origins = process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000';
  return {
    'Access-Control-Allow-Origin': origins.split(',')[0].trim(),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Correlation-Id',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Simple in-memory rate limiter for API routes.
 * In production, use Redis or a dedicated rate-limiting service.
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

// Clean up stale rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 60_000);
