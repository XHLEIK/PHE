/**
 * lib/notifications.ts
 * Notification service — creates in-app notifications for admin users.
 * Optionally sends email for critical notifications.
 */

import Notification from '@/lib/models/Notification';
import User from '@/lib/models/User';
import { sendGenericEmail } from '@/lib/email';

interface CreateNotificationParams {
  recipientEmail: string;
  type: 'assignment' | 'escalation' | 'sla_warning' | 'sla_breach' | 'status_change' | 'new_complaint' | 'note_added' | 'system';
  title: string;
  message: string;
  relatedComplaintId?: string;
  relatedComplaintTrackingId?: string;
  metadata?: Record<string, unknown>;
  sendEmail?: boolean;
}

/**
 * Create a single notification for an admin user.
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const user = await User.findOne({ email: params.recipientEmail, isActive: true })
      .select('_id email')
      .lean();
    if (!user) return null;

    const notification = await Notification.create({
      recipientId: user._id,
      recipientEmail: params.recipientEmail,
      type: params.type,
      title: params.title,
      message: params.message,
      relatedComplaintId: params.relatedComplaintId || null,
      relatedComplaintTrackingId: params.relatedComplaintTrackingId || null,
      metadata: params.metadata || {},
    });

    // Fire-and-forget email for critical notifications
    if (params.sendEmail) {
      sendGenericEmail(
        params.recipientEmail,
        params.title,
        `<p style="color:#475569;font-size:15px;line-height:1.7;">${params.message}</p>
         ${params.relatedComplaintTrackingId ? `<p style="color:#64748b;font-size:13px;">Complaint: <strong>${params.relatedComplaintTrackingId}</strong></p>` : ''}`
      ).catch(err => console.error('[NOTIFICATION EMAIL ERROR]', err));
    }

    return notification;
  } catch (err) {
    console.error('[CREATE NOTIFICATION ERROR]', err);
    return null;
  }
}

/**
 * Notify all department admins + head admins about something (e.g., SLA breach).
 * Optionally filter by department.
 */
export async function notifyDepartmentAdmins(
  department: string | null,
  params: Omit<CreateNotificationParams, 'recipientEmail'>
) {
  try {
    const filter: Record<string, unknown> = { isActive: true };
    if (department) {
      // head_admin sees everything; department_admin/staff scoped to department
      filter.$or = [
        { role: 'head_admin' },
        { departments: department },
      ];
    } else {
      filter.role = 'head_admin';
    }

    const admins = await User.find(filter).select('email').lean();
    const results = await Promise.allSettled(
      admins.map(admin =>
        createNotification({ ...params, recipientEmail: admin.email })
      )
    );

    return results.filter(r => r.status === 'fulfilled').length;
  } catch (err) {
    console.error('[NOTIFY DEPT ADMINS ERROR]', err);
    return 0;
  }
}

/**
 * Shorthand: Notify when a complaint is assigned to an admin.
 */
export async function notifyAssignment(
  assigneeEmail: string,
  assignedBy: string,
  complaintId: string,
  trackingId: string,
  complaintTitle: string
) {
  return createNotification({
    recipientEmail: assigneeEmail,
    type: 'assignment',
    title: 'Complaint Assigned to You',
    message: `${assignedBy} assigned "${complaintTitle}" to you.`,
    relatedComplaintId: complaintId,
    relatedComplaintTrackingId: trackingId,
    sendEmail: true,
  });
}

/**
 * Shorthand: Notify about escalation.
 */
export async function notifyEscalation(
  department: string,
  escalatedBy: string,
  complaintId: string,
  trackingId: string,
  reason: string
) {
  return notifyDepartmentAdmins(department, {
    type: 'escalation',
    title: 'Complaint Escalated',
    message: `A complaint has been escalated to your department by ${escalatedBy}. Reason: ${reason}`,
    relatedComplaintId: complaintId,
    relatedComplaintTrackingId: trackingId,
    sendEmail: true,
  });
}

/**
 * Shorthand: Notify about SLA breach.
 */
export async function notifySlaBreachWarning(
  department: string,
  assignedTo: string | null,
  complaintId: string,
  trackingId: string,
  hoursRemaining: number
) {
  const targets: CreateNotificationParams[] = [];

  if (assignedTo) {
    targets.push({
      recipientEmail: assignedTo,
      type: 'sla_warning',
      title: 'SLA Deadline Approaching',
      message: `Complaint ${trackingId} has ${hoursRemaining} hours until SLA deadline.`,
      relatedComplaintId: complaintId,
      relatedComplaintTrackingId: trackingId,
      sendEmail: hoursRemaining <= 24,
    });
  }

  // Also notify department admins
  await notifyDepartmentAdmins(department, {
    type: 'sla_warning',
    title: 'SLA Deadline Approaching',
    message: `Complaint ${trackingId} has ${hoursRemaining} hours until SLA deadline.`,
    relatedComplaintId: complaintId,
    relatedComplaintTrackingId: trackingId,
    sendEmail: hoursRemaining <= 24,
  });

  return Promise.allSettled(targets.map(t => createNotification(t)));
}

/**
 * Shorthand: Notify about SLA breach (already breached).
 */
export async function notifySlaBreached(
  department: string,
  assignedTo: string | null,
  complaintId: string,
  trackingId: string
) {
  const targets: CreateNotificationParams[] = [];

  if (assignedTo) {
    targets.push({
      recipientEmail: assignedTo,
      type: 'sla_breach',
      title: 'SLA Breached',
      message: `Complaint ${trackingId} has exceeded its SLA deadline. Immediate action required.`,
      relatedComplaintId: complaintId,
      relatedComplaintTrackingId: trackingId,
      sendEmail: true,
    });
  }

  await notifyDepartmentAdmins(department, {
    type: 'sla_breach',
    title: 'SLA Breached',
    message: `Complaint ${trackingId} has exceeded its SLA deadline. Immediate action required.`,
    relatedComplaintId: complaintId,
    relatedComplaintTrackingId: trackingId,
    sendEmail: true,
  });

  return Promise.allSettled(targets.map(t => createNotification(t)));
}
