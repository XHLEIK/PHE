/**
 * lib/redis.ts
 * Singleton Upstash Redis client for caching, rate limiting, job queues,
 * and notification delivery.
 *
 * Uses the serverless REST-based Upstash SDK — works on Vercel Edge,
 * Node.js, and any serverless environment without persistent TCP connections.
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// ---------------------------------------------------------------------------
// Singleton Redis client
// ---------------------------------------------------------------------------
let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (_redis) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      '[REDIS] Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in environment variables'
    );
  }

  _redis = new Redis({ url, token });
  return _redis;
}

// ---------------------------------------------------------------------------
// Pre-built rate limiters
// ---------------------------------------------------------------------------

/**
 * API rate limiter — 100 requests per 15 minutes per key.
 * Used for general API endpoints.
 */
export function getApiRateLimiter() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(
      Number(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      `${Number(process.env.RATE_LIMIT_WINDOW_MS || '900000')}ms`
    ),
    analytics: true,
    prefix: 'ratelimit:api',
  });
}

/**
 * Complaint submission rate limiter — 10 per 15 minutes per IP.
 */
export function getComplaintRateLimiter() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(10, '15m'),
    analytics: true,
    prefix: 'ratelimit:complaint',
  });
}

/**
 * Login rate limiter — 5 attempts per 15 minutes per IP.
 */
export function getLoginRateLimiter() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(
      Number(process.env.LOGIN_RATE_LIMIT_MAX || '5'),
      `${Number(process.env.LOGIN_LOCKOUT_DURATION_MS || '900000')}ms`
    ),
    analytics: true,
    prefix: 'ratelimit:login',
  });
}

/**
 * OTP rate limiter — 5 OTP requests per 10 minutes per identifier.
 */
export function getOtpRateLimiter() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(5, '10m'),
    analytics: true,
    prefix: 'ratelimit:otp',
  });
}

/**
 * Mutation rate limiter — 20 write operations per minute per key.
 * Used for admin mutation endpoints (assign, escalate, notes, user management, etc.)
 */
export function getMutationRateLimiter() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(20, '1m'),
    analytics: true,
    prefix: 'ratelimit:mutation',
  });
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

/**
 * Get a cached value, or compute and cache it.
 * TTL in seconds. Falls back to direct compute if Redis is unreachable.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>
): Promise<T> {
  try {
    const redis = getRedis();
    const existing = await redis.get<T>(key);
    if (existing !== null && existing !== undefined) {
      return existing;
    }

    const value = await compute();
    // Best-effort cache write — don't fail if Redis is down
    try {
      await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
    } catch {
      // ignore cache write failure
    }
    return value;
  } catch (err) {
    console.warn('[CACHE] Redis unavailable, computing directly:', (err as Error).message);
    return compute();
  }
}

// ------------------ AI Strict Cache ------------------
export async function getAICache(normalizedQuery: string): Promise<string | null> {
  try {
    return await getRedis().get<string>(`ai:query:${normalizedQuery}`);
  } catch (err) {
    console.warn('[CACHE] AI Cache get failed:', (err as Error).message);
    return null;
  }
}

export async function setAICache(normalizedQuery: string, response: string, ttlSeconds = 86400): Promise<void> {
  try {
    await getRedis().set(`ai:query:${normalizedQuery}`, response, { ex: ttlSeconds });
  } catch (err) {
    console.warn('[CACHE] AI Cache set failed:', (err as Error).message);
  }
}

// ------------------ Incident Key Cache ------------------
export interface IncidentCacheData {
  incidentId: string;
  complaintCount: number;
  priority: string;
}

export async function getIncidentCache(incidentKey: string): Promise<IncidentCacheData | null> {
  try {
    return await getRedis().get<IncidentCacheData>(`incident:${incidentKey}`);
  } catch (err) {
    console.warn('[CACHE] Incident Cache get failed:', (err as Error).message);
    return null;
  }
}

export async function setIncidentCache(
  incidentKey: string, 
  data: IncidentCacheData, 
  ttlSeconds = 86400
): Promise<void> {
  try {
    await getRedis().set(`incident:${incidentKey}`, JSON.stringify(data), { ex: ttlSeconds });
  } catch (err) {
    console.warn('[CACHE] Incident Cache set failed:', (err as Error).message);
  }
}

export async function invalidateIncidentCache(incidentKey: string): Promise<void> {
  try {
    await getRedis().del(`incident:${incidentKey}`);
  } catch (err) {
    console.warn('[CACHE] Incident Cache invalidate failed:', (err as Error).message);
  }
}

/**
 * Invalidate a cached key.
 */
export async function invalidateCache(key: string): Promise<void> {
  const redis = getRedis();
  await redis.del(key);
}

/**
 * Invalidate all keys matching a pattern prefix.
 * WARNING: Uses SCAN — do not use on extremely large keyspaces in hot paths.
 */
export async function invalidateCacheByPrefix(prefix: string): Promise<number> {
  const redis = getRedis();
  let cursor = 0;
  let deleted = 0;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, { match: `${prefix}*`, count: 100 });
    cursor = Number(nextCursor);
    if (keys.length > 0) {
      await redis.del(...keys);
      deleted += keys.length;
    }
  } while (cursor !== 0);

  return deleted;
}

// ---------------------------------------------------------------------------
// OTP storage helpers (with in-memory fallback for local dev)
// ---------------------------------------------------------------------------

/**
 * In-memory OTP store — used as fallback when Redis is unreachable.
 * Each entry stores { code, expiresAt } so we can respect TTL.
 */
const _memOtp = new Map<string, { code: string; expiresAt: number }>();

function cleanExpiredMemOtp() {
  const now = Date.now();
  for (const [key, val] of _memOtp) {
    if (val.expiresAt <= now) _memOtp.delete(key);
  }
}

/**
 * Store an OTP code for verification.
 * Falls back to in-memory storage if Redis is unreachable (local dev).
 */
export async function storeOtp(
  identifier: string,
  code: string,
  ttlSeconds = 600
): Promise<void> {
  try {
    const redis = getRedis();
    await redis.set(`otp:${identifier}`, code, { ex: ttlSeconds });
  } catch (err) {
    console.warn('[OTP] Redis unavailable, using in-memory fallback:', (err as Error).message);
    cleanExpiredMemOtp();
    _memOtp.set(identifier, { code, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}

/**
 * Verify and consume an OTP code. Returns true if valid.
 * One-time use — the OTP is deleted after successful verification.
 * Falls back to in-memory store if Redis is unreachable.
 */
export async function verifyOtp(
  identifier: string,
  code: string
): Promise<boolean> {
  try {
    const redis = getRedis();
    const stored = await redis.get<string>(`otp:${identifier}`);
    if (!stored || stored !== code) {
      // Also check in-memory (OTP may have been stored there during Redis outage)
      return verifyMemOtp(identifier, code);
    }
    // Consume the OTP
    await redis.del(`otp:${identifier}`);
    _memOtp.delete(identifier); // clean fallback too
    return true;
  } catch {
    // Redis unreachable — check in-memory fallback
    return verifyMemOtp(identifier, code);
  }
}

function verifyMemOtp(identifier: string, code: string): boolean {
  cleanExpiredMemOtp();
  const entry = _memOtp.get(identifier);
  if (!entry || entry.code !== code) return false;
  _memOtp.delete(identifier); // consume
  return true;
}
