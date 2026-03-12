import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import { notifySlaBreached } from '@/lib/notifications';
import { createAuditEntry } from '@/lib/models/AuditLog';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/admin/cron/sla-check — Detect SLA breaches and mark them
 * Protected by CRON_SECRET header — intended to be called by Vercel Cron
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

    // Find complaints where SLA deadline has passed but not yet marked as breached
    const breachedComplaints = await Complaint.find({
      slaDeadline: { $lt: now },
      slaBreached: false,
      status: { $nin: ['resolved', 'closed', 'withdrawn'] },
    }).select(
      '_id trackingId title department assignedTo assignedToName slaDeadline'
    );

    if (breachedComplaints.length === 0) {
      return successResponse({
        message: 'No SLA breaches detected',
        checked: 0,
        breached: 0,
      });
    }

    // Mark all as breached
    const ids = breachedComplaints.map((c) => c._id);
    await Complaint.updateMany(
      { _id: { $in: ids } },
      { $set: { slaBreached: true } }
    );

    // Send notifications for each breached complaint
    const notifyPromises = breachedComplaints.map(async (complaint) => {
      try {
        await notifySlaBreached(
          complaint.department,
          complaint.assignedToName || null,
          complaint._id.toString(),
          complaint.complaintId
        );
      } catch (err) {
        console.error(
          `[SLA NOTIFY ERROR] ${complaint.complaintId}:`,
          err
        );
      }
    });

    await Promise.all(notifyPromises);

    // Single audit entry for the batch
    await createAuditEntry({
      action: 'system.sla_breach_check',
      actor: 'system:cron',
      targetType: 'system',
      targetId: 'sla-check',
      changes: {},
      metadata: {
        totalBreached: breachedComplaints.length,
        trackingIds: breachedComplaints.map((c) => c.complaintId),
      },
      correlationId,
      ipAddress: '0.0.0.0',
    });

    return successResponse({
      message: `${breachedComplaints.length} SLA breach(es) detected and marked`,
      checked: breachedComplaints.length,
      breached: breachedComplaints.length,
      trackingIds: breachedComplaints.map((c) => c.complaintId),
    });
  } catch (err) {
    console.error('[SLA CRON ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}
