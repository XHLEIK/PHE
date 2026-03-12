/**
 * Unit tests — Auth & Crypto module
 * Tests: password hashing, JWT generation/verification, token hashing, cookie helpers.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';

import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  clearAuthCookies,
  setCitizenCookies,
  clearCitizenAuthCookies,
  getRefreshTokenExpiryDate,
  type TokenPayload,
} from '@/lib/auth';

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------
const adminPayload: TokenPayload = {
  userId: '507f1f77bcf86cd799439011',
  email: 'admin@gov.in',
  role: 'head_admin',
};

const deptAdminPayload: TokenPayload = {
  userId: '507f1f77bcf86cd799439012',
  email: 'dept@gov.in',
  role: 'department_head',
  departments: ['Revenue', 'Transport'],
};

const citizenPayload: TokenPayload = {
  userId: '507f1f77bcf86cd799439013',
  email: 'citizen@example.com',
  role: 'citizen',
  citizenId: '507f1f77bcf86cd799439014',
};

// ---------------------------------------------------------------------------
// Password Hashing
// ---------------------------------------------------------------------------
describe('Password Hashing', () => {
  it('hashes a password and verifies correctly', async () => {
    const password = 'SuperSecure@123';
    const hashed = await hashPassword(password);

    expect(hashed).toBeDefined();
    expect(hashed).not.toBe(password);
    expect(hashed.startsWith('$2')).toBe(true); // bcrypt hash prefix

    const isValid = await verifyPassword(password, hashed);
    expect(isValid).toBe(true);
  });

  it('rejects wrong password', async () => {
    const hashed = await hashPassword('correctPassword');
    const isValid = await verifyPassword('wrongPassword', hashed);
    expect(isValid).toBe(false);
  });

  it('generates different hashes for same password (salt randomness)', async () => {
    const password = 'TestPassword123!';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    expect(hash1).not.toBe(hash2);
  });

  it('handles empty string password', async () => {
    const hashed = await hashPassword('');
    expect(hashed).toBeDefined();
    const isValid = await verifyPassword('', hashed);
    expect(isValid).toBe(true);
  });

  it('handles unicode passwords', async () => {
    const password = 'पासवर्ड🔐123';
    const hashed = await hashPassword(password);
    const isValid = await verifyPassword(password, hashed);
    expect(isValid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// JWT Access Tokens
// ---------------------------------------------------------------------------
describe('JWT Access Tokens', () => {
  it('generates a valid access token for admin', () => {
    const token = generateAccessToken(adminPayload);
    expect(token).toBeDefined();
    expect(token.split('.').length).toBe(3); // JWT format

    const decoded = verifyAccessToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.userId).toBe(adminPayload.userId);
    expect(decoded!.email).toBe(adminPayload.email);
    expect(decoded!.role).toBe('head_admin');
  });

  it('preserves departments array for department_admin', () => {
    const token = generateAccessToken(deptAdminPayload);
    const decoded = verifyAccessToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.departments).toEqual(['Revenue', 'Transport']);
  });

  it('preserves citizenId for citizen role', () => {
    const token = generateAccessToken(citizenPayload);
    const decoded = verifyAccessToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.citizenId).toBe(citizenPayload.citizenId);
    expect(decoded!.role).toBe('citizen');
  });

  it('returns null for tampered token', () => {
    const token = generateAccessToken(adminPayload);
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(verifyAccessToken(tampered)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(verifyAccessToken('')).toBeNull();
  });

  it('returns null for garbage input', () => {
    expect(verifyAccessToken('not.a.jwt')).toBeNull();
    expect(verifyAccessToken('random-garbage')).toBeNull();
  });

  it('does not verify access token with refresh secret', () => {
    const accessToken = generateAccessToken(adminPayload);
    // Access token should not verify as a refresh token
    const decoded = verifyRefreshToken(accessToken);
    expect(decoded).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// JWT Refresh Tokens
// ---------------------------------------------------------------------------
describe('JWT Refresh Tokens', () => {
  it('generates a valid refresh token', () => {
    const token = generateRefreshToken(adminPayload);
    expect(token).toBeDefined();
    expect(token.split('.').length).toBe(3);

    const decoded = verifyRefreshToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.userId).toBe(adminPayload.userId);
  });

  it('generates unique tokens (each has a different jti)', () => {
    const token1 = generateRefreshToken(adminPayload);
    const token2 = generateRefreshToken(adminPayload);
    expect(token1).not.toBe(token2);
  });

  it('returns null for tampered refresh token', () => {
    const token = generateRefreshToken(adminPayload);
    const tampered = token.slice(0, -5) + 'ZZZZZ';
    expect(verifyRefreshToken(tampered)).toBeNull();
  });

  it('does not verify refresh token with access secret', () => {
    const refreshToken = generateRefreshToken(adminPayload);
    const decoded = verifyAccessToken(refreshToken);
    expect(decoded).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Token Hashing
// ---------------------------------------------------------------------------
describe('Token Hashing', () => {
  it('produces a consistent SHA-256 hash', () => {
    const token = 'some-refresh-token';
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 = 64 hex chars
  });

  it('different tokens produce different hashes', () => {
    const hash1 = hashToken('token-a');
    const hash2 = hashToken('token-b');
    expect(hash1).not.toBe(hash2);
  });
});

// ---------------------------------------------------------------------------
// Cookie Helpers
// ---------------------------------------------------------------------------
describe('Cookie Helpers', () => {
  it('access token cookie contains HttpOnly and Path=/', () => {
    const cookie = getAccessTokenCookieOptions();
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Max-Age=900'); // 15 min
  });

  it('refresh token cookie scoped to /api/auth', () => {
    const cookie = getRefreshTokenCookieOptions();
    expect(cookie).toContain('Path=/api/auth');
    expect(cookie).toContain('HttpOnly');
  });

  it('clearAuthCookies sets Max-Age=0', () => {
    const cookies = clearAuthCookies();
    expect(cookies.length).toBe(2);
    cookies.forEach(c => expect(c).toContain('Max-Age=0'));
  });

  it('setCitizenCookies includes both access and refresh', () => {
    const cookies = setCitizenCookies('access-tok', 'refresh-tok');
    expect(cookies.length).toBe(2);
    expect(cookies[0]).toContain('citizen_access_token=access-tok');
    expect(cookies[1]).toContain('citizen_refresh_token=refresh-tok');
  });

  it('clearCitizenAuthCookies sets Max-Age=0', () => {
    const cookies = clearCitizenAuthCookies();
    expect(cookies.length).toBe(2);
    cookies.forEach(c => expect(c).toContain('Max-Age=0'));
  });
});

// ---------------------------------------------------------------------------
// Refresh Token Expiry Parser
// ---------------------------------------------------------------------------
describe('getRefreshTokenExpiryDate', () => {
  it('returns a date in the future', () => {
    const expiry = getRefreshTokenExpiryDate();
    expect(expiry.getTime()).toBeGreaterThan(Date.now());
  });

  it('returns approximately 7 days from now with default 7d', () => {
    const expiry = getRefreshTokenExpiryDate();
    const diff = expiry.getTime() - Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    // Allow 5 second tolerance
    expect(Math.abs(diff - sevenDaysMs)).toBeLessThan(5000);
  });
});
