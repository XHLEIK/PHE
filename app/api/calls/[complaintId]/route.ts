import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import CallLog from '@/lib/models/CallLog';
import { verifyAccessToken } from '@/lib/auth';
import {
  successResponse,
  errorResponse,
  getAccessTokenFromCookies,
} from '@/lib/api-utils';
import { toAdminCtx, authorize, getRoleLevel } from '@/lib/rbac';

/**
 * GET /api/calls/[complaintId] — Get call logs for a complaint
 * RBAC-scoped via complaint.department:
 *   head_admin → all
 *   department_admin → own department
 *   staff → assigned complaints only (read-only)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ complaintId: string }> }
) {
  try {
    const token = getAccessTokenFromCookies(req);
    if (!token) return errorResponse('Authentication required', 401);

    const payload = verifyAccessToken(token);
    if (!payload) return errorResponse('Invalid or expired token', 401);

    const { complaintId } = await params;

    if (!complaintId) {
      return errorResponse('complaintId is required', 400);
    }

    await connectDB();

    // ── Find the complaint to enforce RBAC ──────────────────────────────────
    const complaint = await Complaint.findOne({ complaintId }).lean();
    if (!complaint) {
      return errorResponse('Complaint not found', 404);
    }

    // ── RBAC enforcement ────────────────────────────────────────────────────
    const adminCtx = toAdminCtx(payload);
    const roleLevel = getRoleLevel(adminCtx.role);
    if (roleLevel >= 7 && complaint.assignedTo !== payload.email) {
      // Officer-level and below can only view call logs for complaints assigned to them
      return errorResponse('Access denied — complaint is not assigned to you', 403);
    }
    if (adminCtx.departments.length > 0 && !adminCtx.departments.includes(complaint.department)) {
      return errorResponse('Access denied — complaint is not in your department', 403);
    }
    // head_admin / cabinet / state_chief / district_commissioner → no restrictions

    // ── Fetch call logs ─────────────────────────────────────────────────────
    const callLogs = await CallLog.find({ complaintId })
      .sort({ createdAt: -1 })
      .lean();

    return successResponse({
      complaintId,
      callStatus: complaint.callStatus ?? 'not_called',
      callAttempts: complaint.callAttempts ?? 0,
      callConsent: complaint.callConsent ?? false,
      logs: callLogs.map(log => ({
        id: String(log._id),
        roomName: log.roomName,
        attemptNumber: log.attemptNumber,
        retryCount: log.retryCount,
        callStatus: log.callStatus,
        callOutcome: log.callOutcome,
        callerType: log.callerType,
        failureReason: log.failureReason,
        duration: log.duration,
        transcriptSummary: log.transcriptSummary,
        transcriptRaw: log.transcriptRaw,
        aiResolution: log.aiResolution,
        startedAt: log.startedAt,
        endedAt: log.endedAt,
        createdAt: log.createdAt,
      })),
    });
  } catch (err) {
    console.error('[CALLS GET] Error:', err);
    return errorResponse('Internal server error', 500);
  }
}
