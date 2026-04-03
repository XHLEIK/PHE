import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import AuditLog from '@/lib/models/AuditLog';
import { verifyAccessToken, getCitizenAccessTokenFromCookies } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-utils';

/**
 * GET /api/citizen/complaints/[id]/timeline
 * Returns a citizen-safe timeline of events for a complaint.
 * Strips internal details (actor email, IP addresses, etc.)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getCitizenAccessTokenFromCookies(req);
    if (!token) return errorResponse('Authentication required', 401);

    const payload = verifyAccessToken(token);
    if (!payload || payload.role !== 'citizen') {
      return errorResponse('Invalid or expired token', 401);
    }

    const { id } = await params;
    await connectDB();

    // Verify complaint belongs to this citizen (by ID or email)
    const complaint = await Complaint.findOne({
      $and: [
        { $or: [{ complaintId: id }, { _id: id }] },
        { $or: [{ citizenId: payload.userId }, { submitterEmail: payload.email }] },
      ],
    }).lean();

    if (!complaint) {
      return errorResponse('Complaint not found or access denied', 404);
    }

    // Fetch audit entries for this complaint
    const auditEntries = await AuditLog.find({
      targetType: 'complaint',
      targetId: complaint._id.toString(),
    })
      .sort({ createdAt: 1 }) // chronological order
      .lean();

    // Transform to citizen-safe timeline events
    const timeline = auditEntries.map(entry => {
      const event: Record<string, unknown> = {
        id: entry._id.toString(),
        action: entry.action,
        timestamp: entry.createdAt,
      };

      // Translate actions to citizen-friendly labels
      const changes = (entry.changes || {}) as Record<string, { from: unknown; to: unknown }>;

      if (entry.action === 'complaint.created') {
        const isReq = complaint.complaintId?.startsWith('PHED/');
        event.label = isReq ? 'Request Submitted' : 'Complaint Submitted';
        event.description = isReq
          ? 'Your new connection request was received and registered in the system.'
          : 'Your grievance was received and registered in the system.';
        event.type = 'created';
      } else if (entry.action === 'complaint.updated') {
        const descriptions: string[] = [];
        event.type = 'updated';

        if (changes.status) {
          const to = String(changes.status.to);
          event.label = `Status: ${formatStatus(to)}`;
          descriptions.push(`Status changed to ${formatStatus(to)}`);

          if (to === 'resolved') {
            event.type = 'resolved';
            event.label = 'Complaint Resolved';
          } else if (to === 'escalated') {
            event.type = 'escalated';
          }
        }
        if (changes.department) {
          descriptions.push(`Assigned to ${changes.department.to} department`);
          if (!event.label) event.label = 'Department Assigned';
        }
        if (changes.priority) {
          descriptions.push(`Priority set to ${String(changes.priority.to).toUpperCase()}`);
          if (!event.label) event.label = 'Priority Updated';
        }
        if (changes.assignedTo) {
          descriptions.push('An officer has been assigned to your case');
          if (!event.label) event.label = 'Officer Assigned';
        }

        if (!event.label) event.label = 'Complaint Updated';
        event.description = descriptions.join('. ') || 'Your complaint was updated.';

        // Include reason if provided (for resolutions/closures)
        const meta = entry.metadata as Record<string, unknown> | undefined;
        if (meta?.reason) {
          event.reason = meta.reason;
        }
        if (meta?.comment) {
          event.comment = meta.comment;
        }
      } else if (entry.action === 'complaint.ai_analyzed') {
        event.label = 'AI Analysis Complete';
        event.description = 'Your grievance has been analyzed and routed to the appropriate department.';
        event.type = 'ai';
      } else {
        event.label = 'Update';
        event.description = 'Your complaint was updated.';
        event.type = 'updated';
      }

      return event;
    });

    return successResponse(timeline);
  } catch (err) {
    console.error('[CITIZEN TIMELINE ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pending Review',
    triage: 'Under Triage',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
    escalated: 'Escalated',
  };
  return labels[status] || status;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
