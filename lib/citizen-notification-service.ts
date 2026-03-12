import connectDB from '@/lib/db';
import CitizenNotification, { type CitizenNotificationType } from '@/lib/models/CitizenNotification';
import Complaint from '@/lib/models/Complaint';
import { sendStatusUpdateEmail, sendResolutionEmail } from '@/lib/email';

// ---------------------------------------------------------------------------
// Citizen Notification Service
// Creates notifications for citizens when their complaint status changes,
// is assigned to a department, etc.
// ---------------------------------------------------------------------------

interface CreateCitizenNotificationOptions {
  citizenId: string;
  citizenEmail: string;
  type: CitizenNotificationType;
  title: string;
  message: string;
  relatedComplaintId?: string;
  relatedComplaintTrackingId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a single citizen notification.
 */
export async function createCitizenNotification(opts: CreateCitizenNotificationOptions) {
  try {
    await connectDB();
    return await CitizenNotification.create({
      citizenId: opts.citizenId,
      citizenEmail: opts.citizenEmail,
      type: opts.type,
      title: opts.title,
      message: opts.message,
      relatedComplaintId: opts.relatedComplaintId || null,
      relatedComplaintTrackingId: opts.relatedComplaintTrackingId || null,
      metadata: opts.metadata || {},
    });
  } catch (err) {
    console.error('[CITIZEN NOTIFICATION CREATE ERROR]', err);
    return null;
  }
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Review',
  triage: 'Under Triage',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  escalated: 'Escalated',
};

/**
 * Notify a citizen about a complaint status change.
 * Resolves the citizen from the complaint's citizenId or submitterEmail.
 */
export async function notifyCitizenOnStatusChange(
  complaintId: string, // MongoDB _id
  complaintTrackingId: string,
  changes: Record<string, { from: unknown; to: unknown }>,
  metadata?: Record<string, unknown>
) {
  try {
    await connectDB();
    const complaint = await Complaint.findById(complaintId).lean();
    if (!complaint) return;

    // Need citizenId and email to create notification
    const citizenId = complaint.citizenId?.toString();
    const citizenEmail = complaint.submitterEmail;

    // Anonymous complaints (no citizenId) can't receive in-app notifications
    if (!citizenId || !citizenEmail) return;

    const notifications: CreateCitizenNotificationOptions[] = [];

    // Status change notification
    if (changes.status) {
      const fromLabel = STATUS_LABELS[changes.status.from as string] || String(changes.status.from);
      const toLabel = STATUS_LABELS[changes.status.to as string] || String(changes.status.to);
      const isResolved = changes.status.to === 'resolved';

      notifications.push({
        citizenId,
        citizenEmail,
        type: isResolved ? 'resolved' : 'status_change',
        title: isResolved
          ? 'Complaint Resolved'
          : `Status Updated: ${toLabel}`,
        message: isResolved
          ? `Your grievance ${complaintTrackingId} has been resolved. If you are not satisfied, you can reopen it from the dashboard.`
          : `Your grievance ${complaintTrackingId} status has changed from "${fromLabel}" to "${toLabel}".`,
        relatedComplaintId: complaintId,
        relatedComplaintTrackingId: complaintTrackingId,
        metadata: { ...metadata, statusFrom: changes.status.from, statusTo: changes.status.to },
      });
    }

    // Department assignment notification
    if (changes.department) {
      notifications.push({
        citizenId,
        citizenEmail,
        type: 'department_assigned',
        title: 'Department Assigned',
        message: `Your grievance ${complaintTrackingId} has been assigned to the ${changes.department.to} department.`,
        relatedComplaintId: complaintId,
        relatedComplaintTrackingId: complaintTrackingId,
        metadata: { ...metadata, departmentFrom: changes.department.from, departmentTo: changes.department.to },
      });
    }

    // Priority change notification
    if (changes.priority) {
      notifications.push({
        citizenId,
        citizenEmail,
        type: 'priority_change',
        title: 'Priority Updated',
        message: `Your grievance ${complaintTrackingId} priority has been changed to ${String(changes.priority.to).toUpperCase()}.`,
        relatedComplaintId: complaintId,
        relatedComplaintTrackingId: complaintTrackingId,
        metadata: { ...metadata, priorityFrom: changes.priority.from, priorityTo: changes.priority.to },
      });
    }

    // Create all notifications in parallel
    await Promise.all(notifications.map(n => createCitizenNotification(n)));

    // ── Send emails alongside in-app notifications (fire & forget) ──────
    if (changes.status) {
      const toLabel = STATUS_LABELS[changes.status.to as string] || String(changes.status.to);
      const isResolved = changes.status.to === 'resolved';

      if (isResolved) {
        // Resolution email with summary
        const resolutionMessage =
          (metadata?.resolutionNote as string) ||
          `Your grievance has been resolved by the assigned department.`;
        sendResolutionEmail(citizenEmail, complaintTrackingId, resolutionMessage).catch(err =>
          console.error('[CITIZEN EMAIL] Resolution email failed:', err)
        );
      } else {
        // Generic status update email
        const fromLabel = STATUS_LABELS[changes.status.from as string] || String(changes.status.from);
        sendStatusUpdateEmail(
          citizenEmail,
          complaintTrackingId,
          changes.status.to as string,
          `Your grievance status has changed from "${fromLabel}" to "${toLabel}".`
        ).catch(err =>
          console.error('[CITIZEN EMAIL] Status update email failed:', err)
        );
      }
    }
  } catch (err) {
    console.error('[CITIZEN NOTIFICATION DISPATCH ERROR]', err);
  }
}
