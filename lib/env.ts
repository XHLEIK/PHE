/**
 * lib/env.ts
 * Environment variable validation — fail fast at startup if critical vars are missing.
 *
 * Import this module in lib/db.ts or layout.tsx to ensure early validation.
 * Uses Zod for schema-based validation with clear error messages.
 */

import { z } from 'zod';

const envSchema = z.object({
  // Database
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  // JWT secrets
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Email (Resend)
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  EMAIL_FROM: z.string().default('Samadhan AI <onboarding@resend.dev>'),

  // Redis (Upstash)
  UPSTASH_REDIS_REST_URL: z.string().url('UPSTASH_REDIS_REST_URL must be a valid URL'),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'UPSTASH_REDIS_REST_TOKEN is required'),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),

  // AI (Gemini)
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),

  // Cron secret (for Vercel crons)
  CRON_SECRET: z.string().min(8, 'CRON_SECRET should be at least 8 characters').optional(),

  // LiveKit (optional — only needed if AI calling is enabled)
  LIVEKIT_URL: z.string().optional(),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),

  // Twilio (optional — only needed if AI calling is enabled)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // CORS
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_API_BASE_URL: z.string().default(''),
});

export type Env = z.infer<typeof envSchema>;

let _validated = false;

/**
 * Validate all required environment variables.
 * Logs warnings for optional missing vars.
 * Throws on missing required vars (fail-fast).
 */
export function validateEnv(): Env {
  if (_validated) return envSchema.parse(process.env);

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `  ✗ ${issue.path.join('.')}: ${issue.message}`
    );

    console.error(
      '\n╔══════════════════════════════════════════════════════╗\n' +
        '║       ENVIRONMENT VARIABLE VALIDATION FAILED        ║\n' +
        '╚══════════════════════════════════════════════════════╝\n\n' +
        'The following environment variables are missing or invalid:\n\n' +
        errors.join('\n') +
        '\n\n' +
        'Please check your .env.local file or deployment settings.\n' +
        'See .env.example for required variables.\n'
    );

    throw new Error(`Missing or invalid environment variables: ${errors.join(', ')}`);
  }

  _validated = true;

  // Log optional warnings
  if (!result.data.CRON_SECRET) {
    console.warn('[ENV] ⚠ CRON_SECRET not set — cron endpoints will reject all requests');
  }
  if (!result.data.LIVEKIT_URL) {
    console.warn('[ENV] ⚠ LIVEKIT_URL not set — AI calling features will be disabled');
  }

  return result.data;
}

/**
 * Get a specific env var (type-safe). Validates on first call.
 */
export function env(): Env {
  return validateEnv();
}
