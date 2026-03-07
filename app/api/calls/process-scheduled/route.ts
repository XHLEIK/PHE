import { NextRequest } from 'next/server';
import { processScheduledCalls } from '@/lib/call-scheduler';
import { successResponse, errorResponse } from '@/lib/api-utils';

const SCHEDULER_SECRET = process.env.SCHEDULER_SECRET || '';

/**
 * GET /api/calls/process-scheduled — Cron worker endpoint
 * Processes pending scheduled calls from the database.
 * Secured via SCHEDULER_SECRET header — must match env var.
 * Called by external cron every 60 seconds.
 */
export async function GET(req: NextRequest) {
  try {
    // ── Validate scheduler secret ───────────────────────────────────────────
    const authHeader = req.headers.get('x-scheduler-secret') || '';

    if (!SCHEDULER_SECRET || authHeader !== SCHEDULER_SECRET) {
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
