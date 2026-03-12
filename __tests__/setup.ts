/**
 * Vitest global setup.
 * Sets up test environment variables and mocks.
 */

// Provide required env vars for tests (avoid throwing errors in modules that check them)
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-min-32-chars!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-min-32-chars!!';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.RESEND_API_KEY = 're_test_fake_key';
process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-redis-token';
process.env.GEMINI_API_KEY = 'fake-gemini-key';
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-api-key';
process.env.CLOUDINARY_API_SECRET = 'test-api-secret';
process.env.CRON_SECRET = 'test-cron-secret';
process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3000';
