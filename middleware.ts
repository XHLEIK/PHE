/**
 * middleware.ts
 * Next.js Edge Middleware — runs before every matched request.
 *
 * Responsibilities:
 * 1. Protect /admin/* pages (except /admin/login) — redirect to login if no token
 * 2. Protect /api/admin/* routes — return 401 if no access token
 * 3. Add security headers to all responses
 * 4. Handle CORS preflight for API routes
 *
 * NOTE: Full JWT verification happens in individual API route handlers
 * using jsonwebtoken (Node.js runtime). This middleware only checks
 * cookie existence for page-level guards since Edge Runtime cannot
 * use the jsonwebtoken library.
 */

import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Security headers applied to every response
// ---------------------------------------------------------------------------

// Static CSP directives (connect-src is built dynamically per-request)
const CSP_STATIC_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",  // Next.js + Vercel Live
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://res.cloudinary.com https://vercel.live https://vercel.com",
  "media-src 'self' blob: https://res.cloudinary.com",
  "frame-src 'self' https://vercel.live",
  // connect-src is built dynamically — see buildCsp()
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
];

/**
 * Build Content-Security-Policy with dynamic connect-src.
 * Includes the request's own origin so API calls always work,
 * regardless of whether the app runs on localhost or a deployed IP/domain.
 */
function buildCsp(requestOrigin: string): string {
  const connectSrc = [
    "'self'",
    requestOrigin,
    'https://generativelanguage.googleapis.com',
    'wss://*.livekit.cloud',
    'https://*.livekit.cloud',
    'https://api.resend.com',
    'https://*.upstash.io',
    'https://vercel.live',
    'wss://vercel.live',
  ].join(' ');

  return [...CSP_STATIC_DIRECTIVES, `connect-src ${connectSrc}`].join('; ');
}

function buildSecurityHeaders(requestOrigin: string): Record<string, string> {
  return {
    'Content-Security-Policy': buildCsp(requestOrigin),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(self), geolocation=(self)',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  };
}

// ---------------------------------------------------------------------------
// CORS configuration
// ---------------------------------------------------------------------------
function getCorsOrigin(req: NextRequest): string {
  // Use configured origins if set, otherwise fall back to the request's own origin
  const configured = process.env.CORS_ALLOWED_ORIGINS?.split(',')[0]?.trim();
  if (configured && configured !== 'http://localhost:3000') return configured;
  return req.nextUrl.origin;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requestStart = Date.now();
  const requestOrigin = req.nextUrl.origin;
  const securityHeaders = buildSecurityHeaders(requestOrigin);

  // ── CORS preflight for API routes ────────────────────────────────────────
  if (pathname.startsWith('/api/') && req.method === 'OPTIONS') {
    const origin = getCorsOrigin(req);
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Correlation-Id',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
        ...securityHeaders,
      },
    });
  }

  // ── Admin page guard (cookie existence check) ───────────────────────────
  // Protects all /admin/* pages EXCEPT /admin/login
  if (
    pathname.startsWith('/admin') &&
    !pathname.startsWith('/admin/login') &&
    !pathname.startsWith('/api/')
  ) {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Admin API guard ─────────────────────────────────────────────────────
  // Return 401 early for /api/admin/* if no access token (saves server resources)
  // Exempt cron endpoints — they use CRON_SECRET bearer auth
  if (pathname.startsWith('/api/admin/') && !pathname.startsWith('/api/admin/cron/')) {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required', correlationId: 'middleware' },
        {
          status: 401,
          headers: securityHeaders,
        }
      );
    }
  }

  // ── Citizen page guard ──────────────────────────────────────────────────
  // Protect /citizen/* pages EXCEPT /citizen/login, /citizen/register, /citizen/track
  const CITIZEN_PUBLIC_PAGES = ['/citizen/login', '/citizen/register', '/citizen/track'];
  if (
    pathname.startsWith('/citizen') &&
    !CITIZEN_PUBLIC_PAGES.some(p => pathname.startsWith(p)) &&
    !pathname.startsWith('/api/')
  ) {
    const citizenToken = req.cookies.get('citizen_access_token')?.value;
    if (!citizenToken) {
      const loginUrl = new URL('/citizen/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Citizen API guard ───────────────────────────────────────────────────
  // Protect /api/citizen/* EXCEPT auth endpoints and public track endpoint
  const CITIZEN_PUBLIC_API = [
    '/api/citizen/auth/login',
    '/api/citizen/auth/register',
    '/api/citizen/auth/verify-otp',
    '/api/citizen/auth/send-otp',
    '/api/citizen/auth/refresh',
    '/api/citizen/complaints/track',
  ];
  if (
    pathname.startsWith('/api/citizen/') &&
    !CITIZEN_PUBLIC_API.some(p => pathname.startsWith(p))
  ) {
    const citizenToken = req.cookies.get('citizen_access_token')?.value;
    if (!citizenToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required', correlationId: 'middleware' },
        {
          status: 401,
          headers: securityHeaders,
        }
      );
    }
  }

  // ── Apply security headers to all other responses ───────────────────────
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  // Add CORS headers to API responses
  if (pathname.startsWith('/api/')) {
    const origin = getCorsOrigin(req);
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');

    // ── API request logging (structured JSON) ──────────────────────────
    const durationMs = Date.now() - requestStart;
    const logEntry = {
      level: 'info',
      timestamp: new Date().toISOString(),
      message: 'api_request',
      method: req.method,
      path: pathname,
      status: response.status,
      durationMs,
      ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || req.headers.get('x-real-ip')
        || 'unknown',
      userAgent: req.headers.get('user-agent')?.slice(0, 200) || '',
      correlationId: req.headers.get('x-correlation-id') || undefined,
    };
    console.log(JSON.stringify(logEntry));
  }

  return response;
}

// ---------------------------------------------------------------------------
// Matcher — only run middleware on these paths (skip static assets, _next, etc.)
// ---------------------------------------------------------------------------
export const config = {
  matcher: [
    // Admin pages (except static files)
    '/admin/:path*',
    // API routes
    '/api/:path*',
    // Citizen pages (for future auth)
    '/citizen/:path*',
  ],
};
