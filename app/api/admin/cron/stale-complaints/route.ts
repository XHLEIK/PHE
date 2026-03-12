import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import { notifyDepartmentAdmins } from '@/lib/notifications';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/admin/cron/stale-complaints — Detect stale complaints
 * Finds complaints that have been stuck in 'pending' for > 48 hours
 * or 'in_progress' for > 7 days with no updates.
 * Sends alert notifications to department admins.
 * Protected by CRON_SECRET — runs every 12 hours.
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
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Pending complaints older than 48 hours
    const stalePending = await Complaint.find({
      status: 'pending',
      createdAt: { $lt: twoDaysAgo },
    })
      .select('_id complaintId title department createdAt')
      .limit(100)
      .lean();

    // In-progress complaints with no updates for 7 days
    const staleInProgress = await Complaint.find({
      status: 'in_progress',
      updatedAt: { $lt: sevenDaysAgo },
    })
      .select('_id complaintId title department assignedToName updatedAt')
      .limit(100)
      .lean();

    const totalStale = stalePending.length + staleInProgress.length;

    if (totalStale === 0) {
      return successResponse({
        message: 'No stale complaints detected',
        stalePending: 0,
        staleInProgress: 0,
        correlationId,
      });
    }

    // Group stale complaints by department and send notifications
    const deptPending = groupByDepartment(stalePending);
    const deptInProgress = groupByDepartment(staleInProgress);

    const allDepartments = new Set([
      ...Object.keys(deptPending),
      ...Object.keys(deptInProgress),
    ]);

    const notifyPromises = [...allDepartments].map(async (department) => {
      const pendingList = deptPending[department] || [];
      const inProgressList = deptInProgress[department] || [];

      const lines: string[] = [];
      if (pendingList.length > 0) {
        lines.push(`<strong>${pendingList.length}</strong> complaint(s) stuck in PENDING for over 48 hours`);
        pendingList.slice(0, 5).forEach((c) => {
          lines.push(`• ${c.complaintId}: ${c.title}`);
        });
        if (pendingList.length > 5) {
          lines.push(`... and ${pendingList.length - 5} more`);
        }
      }
      if (inProgressList.length > 0) {
        lines.push(`<strong>${inProgressList.length}</strong> complaint(s) stuck in IN_PROGRESS for over 7 days`);
        inProgressList.slice(0, 5).forEach((c) => {
          lines.push(`• ${c.complaintId}: ${c.title}`);
        });
        if (inProgressList.length > 5) {
          lines.push(`... and ${inProgressList.length - 5} more`);
        }
      }

      try {
        await notifyDepartmentAdmins(
          department,
          {
            type: 'system',
            title: `Stale Complaints Alert — ${department}`,
            message: lines.join('<br>'),
            metadata: { stalePending: pendingList.length, staleInProgress: inProgressList.length },
            sendEmail: true,
          }
        );
      } catch (err) {
        console.error(`[STALE-COMPLAINTS] Failed to notify ${department}:`, err);
      }
    });

    await Promise.all(notifyPromises);

    return successResponse({
      message: 'Stale complaint alerts sent',
      stalePending: stalePending.length,
      staleInProgress: staleInProgress.length,
      departments: allDepartments.size,
      correlationId,
    });
  } catch (err) {
    console.error('[STALE-COMPLAINTS CRON] Error:', err);
    return errorResponse('Internal server error', 500);
  }
}

function groupByDepartment<T extends { department?: string }>(complaints: T[]) {
  const groups: Record<string, T[]> = {};
  for (const c of complaints) {
    const dept = c.department || 'Unassigned';
    if (!groups[dept]) groups[dept] = [];
    groups[dept].push(c);
  }
  return groups;
}
