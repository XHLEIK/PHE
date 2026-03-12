import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { v4 as uuidv4 } from 'uuid';

// Dynamic imports to avoid model registration issues
async function getModels() {
  const [CallLog, CitizenNotification] = await Promise.all([
    import('@/lib/models/CallLog').then(m => m.default),
    import('@/lib/models/CitizenNotification').then(m => m.default),
  ]);
  return { CallLog, CitizenNotification };
}

const CALL_LOG_RETENTION_DAYS = Number(process.env.CALL_LOG_RETENTION_DAYS || '365');

/**
 * GET /api/admin/cron/data-retention — Data retention & cleanup cron
 *
 * Operations:
 * 1. Delete CallLog entries older than CALL_LOG_RETENTION_DAYS (default: 1 year)
 * 2. Delete CitizenNotifications older than their TTL (90 days — TTL index handles this,
 *    but we run a manual sweep for safety)
 *
 * Protected by CRON_SECRET — runs weekly.
 */
export async function GET(req: NextRequest) {
  const correlationId = uuidv4();

  try {
    // Verify cron secret
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return errorResponse('Unauthorized', 401);
    }

    await connectDB();

    const now = new Date();
    const stats: Record<string, number> = {};

    const { CallLog, CitizenNotification } = await getModels();

    // 1. Clean old call logs
    const callLogCutoff = new Date(now.getTime() - CALL_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const callLogResult = await CallLog.deleteMany({ createdAt: { $lt: callLogCutoff } });
    stats.callLogsDeleted = callLogResult.deletedCount;

    // 2. Clean old citizen notifications (safety sweep beyond TTL index)
    const notifCutoff = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000); // 100 days (10 days past 90-day TTL)
    const notifResult = await CitizenNotification.deleteMany({ createdAt: { $lt: notifCutoff } });
    stats.citizenNotificationsDeleted = notifResult.deletedCount;

    console.log(`[DATA-RETENTION] Cleanup complete:`, stats);

    return successResponse({
      message: 'Data retention cleanup complete',
      ...stats,
      correlationId,
    });
  } catch (err) {
    console.error('[DATA-RETENTION CRON] Error:', err);
    return errorResponse('Internal server error', 500);
  }
}
