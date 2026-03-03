import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Middleware — runs on every request matching the config below.
 *
 * Responsibilities:
 * 1. Protect /admin/* routes (except /admin/login) — redirect to login if no valid access_token
 * 2. Add security headers to all responses
 * 3. CORS enforcement for API routes
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- CORS for API routes ---
  if (pathname.startsWith('/api/')) {
    // Handle preflight
    if (req.method === 'OPTIONS') {
      return handleCors(req, new NextResponse(null, { status: 204 }));
    }

    // For actual requests, add CORS headers downstream
    const response = NextResponse.next();
    return handleCors(req, addSecurityHeaders(response));
  }

  // --- Admin route protection ---
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const accessToken = req.cookies.get('access_token')?.value;

    if (!accessToken) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Basic JWT structure validation (full verification happens in API routes)
    // We check that it has 3 parts separated by dots
    const parts = accessToken.split('.');
    if (parts.length !== 3) {
      const loginUrl = new URL('/admin/login', req.url);
      return NextResponse.redirect(loginUrl);
    }

    // Token exists and looks like a JWT — let the page render
    // Full verification happens when the page calls API routes
  }

  // --- Security headers for all responses ---
  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );
  return response;
}

function handleCors(req: NextRequest, response: NextResponse): NextResponse {
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map(o => o.trim());

  const origin = req.headers.get('origin') || '';

  if (allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Correlation-Id');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}

export const config = {
  matcher: [
    // Match admin pages (except login)
    '/admin/:path*',
    // Match all API routes
    '/api/:path*',
  ],
};
