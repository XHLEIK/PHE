import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'head_admin' | 'department_admin' | 'staff';
  departments?: string[]; // populated for department_admin and staff roles
}

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ---------------------------------------------------------------------------
// JWT generation
// ---------------------------------------------------------------------------
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY } as jwt.SignOptions);
}

export function generateRefreshToken(payload: TokenPayload): string {
  // Include a random jti to guarantee uniqueness even for concurrent refreshes
  const jti = crypto.randomUUID();
  return jwt.sign({ ...payload, jti }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Token hashing (for storing refresh tokens securely)
// ---------------------------------------------------------------------------
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------
export function getAccessTokenCookieOptions(): string {
  const maxAge = 15 * 60; // 15 minutes in seconds
  const secure = process.env.NODE_ENV === 'production';
  return `access_token={TOKEN}; HttpOnly; ${secure ? 'Secure; ' : ''}SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

export function getRefreshTokenCookieOptions(): string {
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  const secure = process.env.NODE_ENV === 'production';
  return `refresh_token={TOKEN}; HttpOnly; ${secure ? 'Secure; ' : ''}SameSite=Strict; Path=/api/auth; Max-Age=${maxAge}`;
}

export function clearAuthCookies(): string[] {
  return [
    'access_token=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',
    'refresh_token=; HttpOnly; SameSite=Strict; Path=/api/auth; Max-Age=0',
  ];
}

// ---------------------------------------------------------------------------
// Parse refresh token expiry to a Date
// ---------------------------------------------------------------------------
export function getRefreshTokenExpiryDate(): Date {
  const match = REFRESH_EXPIRY.match(/^(\d+)([smhd])$/);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // default 7d

  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(Date.now() + value * (multipliers[unit] || 24 * 60 * 60 * 1000));
}
