import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

/**
 * GET /api/health — Health check endpoint
 * No authentication required. Used by load balancers, uptime monitors, and CI.
 * Returns: DB connection status, Redis connectivity, uptime, and version.
 */

const startTime = Date.now();

export async function GET() {
  const health: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.round((Date.now() - startTime) / 1000),
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development',
  };

  // Check MongoDB connection
  try {
    const dbState = mongoose.connection.readyState;
    // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    const dbStates: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    health.database = dbStates[dbState] || 'unknown';
    if (dbState !== 1) health.status = 'degraded';
  } catch {
    health.database = 'error';
    health.status = 'degraded';
  }

  // Check Redis connectivity
  try {
    const { getRedis } = await import('@/lib/redis');
    const redis = getRedis();
    await redis.ping();
    health.redis = 'connected';
  } catch {
    health.redis = 'disconnected';
    // Redis being down is degraded, not full failure
    if (health.status === 'ok') health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
