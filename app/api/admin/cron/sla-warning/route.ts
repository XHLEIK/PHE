import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import { notifySlaBreachWarning } from '@/lib/notifications';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/admin/cron/sla-warning — Pre-breach SLA warning cron
 * Finds complaints where SLA deadline is within 24 hours but not yet breached.
 * Sends warning notifications to assigned admins / department heads.
 * Protected by CRON_SECRET — intended to be called by Vercel Cron every 6 hours.
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
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find complaints where:
    // - SLA deadline is within the next 24 hours
    // - Not yet breached
    // - Still in an active status
    const atRiskComplaints = await Complaint.find({
      slaDeadline: { $gt: now, $lte: twentyFourHoursFromNow },
      slaBreached: false,
      status: { $nin: ['resolved', 'closed', 'withdrawn'] },
    }).select(
      '_id complaintId title department assignedTo assignedToName slaDeadline'
    );

    if (atRiskComplaints.length === 0) {
      return successResponse({
        message: 'No SLA warnings needed',
        checked: 0,
        warned: 0,
        correlationId,
      });
    }

    // Send warning notifications for each at-risk complaint
    const notifyPromises = atRiskComplaints.map(async (complaint) => {
      try {
        const hoursRemaining = Math.round(
          (complaint.slaDeadline!.getTime() - now.getTime()) / (1000 * 60 * 60)
        );

        await notifySlaBreachWarning(
          complaint.department,
          complaint.assignedToName || null,
          complaint._id.toString(),
          complaint.complaintId,
          hoursRemaining
        );
      } catch (err) {
        console.error(`[SLA-WARNING] Failed to notify for ${complaint.complaintId}:`, err);
      }
    });

    await Promise.all(notifyPromises);

    return successResponse({
      message: 'SLA warnings sent',
      checked: atRiskComplaints.length,
      warned: atRiskComplaints.length,
      correlationId,
    });
  } catch (err) {
    console.error('[SLA-WARNING CRON] Error:', err);
    return errorResponse('Internal server error', 500);
  }
}
