import { NextRequest } from 'next/server';
import { processScheduledCalls } from '@/lib/call-scheduler';
import { successResponse, errorResponse } from '@/lib/api-utils';

/**
 * GET /api/calls/process-scheduled — Cron worker endpoint
 * Processes pending scheduled calls from the database.
 * Protected by CRON_SECRET via Vercel's standard Bearer auth header.
 * Registered in vercel.json to run every minute.
 */
export async function GET(req: NextRequest) {
  try {
    // ── Validate cron secret (Vercel sends `Authorization: Bearer <CRON_SECRET>`) ──
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization') || '';

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return errorResponse('Unauthorized', 401);
    }

    // ── Process scheduled calls ─────────────────────────────────────────────
    const result = await processScheduledCalls();

    return successResponse({
      message: 'Scheduler cycle complete',
      ...result,
    });
  } catch (err) {
    console.error('[PROCESS-SCHEDULED] Error:', err);
    return errorResponse('Internal server error', 500);
  }
}
