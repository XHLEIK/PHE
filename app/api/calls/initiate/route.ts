import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import CallLog from '@/lib/models/CallLog';
import { verifyAccessToken } from '@/lib/auth';
import { initiateCall } from '@/lib/call-scheduler';
import { createAuditEntry } from '@/lib/models/AuditLog';
import {
  successResponse,
  errorResponse,
  getAccessTokenFromCookies,
} from '@/lib/api-utils';
import { authorize, toAdminCtx } from '@/lib/rbac';

const MAX_CALLS_PER_COMPLAINT = Number(process.env.MAX_CALLS_PER_COMPLAINT || '3');
const MAX_DAILY_CALLS = Number(process.env.MAX_DAILY_CALLS || '100');

/**
 * POST /api/calls/initiate — Admin-initiated call to citizen
 * Only head_admin and department_admin can initiate calls.
 */
export async function POST(req: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const token = getAccessTokenFromCookies(req);
    if (!token) return errorResponse('Authentication required', 401);

    const payload = verifyAccessToken(token);
    if (!payload) return errorResponse('Invalid or expired token', 401);

    // RBAC: require call:initiate permission
    const adminCtx = toAdminCtx(payload);
    authorize(adminCtx, 'call:initiate');

    // ── Parse body ──────────────────────────────────────────────────────────
    const body = await req.json();
    const { complaintId } = body as { complaintId?: string };

    if (!complaintId) {
      return errorResponse('complaintId is required', 400);
    }

    await connectDB();

    // ── Find complaint ──────────────────────────────────────────────────────
    const complaint = await Complaint.findOne({ complaintId });
    if (!complaint) {
      return errorResponse('Complaint not found', 404);
    }

    // ── Department scoping ───────────────────────────────────────────────────────────
    if (adminCtx.departments.length > 0) {
      if (!adminCtx.departments.includes(complaint.department)) {
        return errorResponse('You can only initiate calls for complaints in your department', 403);
      }
    }

    // ── Guard: call consent ─────────────────────────────────────────────────
    if (!complaint.callConsent) {
      return errorResponse('Citizen has not consented to receive calls', 400);
    }

    // ── Guard: no phone number ──────────────────────────────────────────────
    if (!complaint.submitterPhone) {
      return errorResponse('No phone number on record for this complaint', 400);
    }

    // ── Guard: concurrent call prevention (mutex) ───────────────────────────
    if (complaint.callStatus === 'scheduled' || complaint.callStatus === 'in_progress') {
      return errorResponse(`A call is already ${complaint.callStatus} for this complaint`, 409);
    }

    // ── Guard: max attempts per complaint ───────────────────────────────────
    if (complaint.callAttempts >= MAX_CALLS_PER_COMPLAINT) {
      return errorResponse(`Maximum call attempts (${MAX_CALLS_PER_COMPLAINT}) reached for this complaint`, 400);
    }

    // ── Guard: daily system limit ───────────────────────────────────────────
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const dailyCount = await CallLog.countDocuments({ createdAt: { $gte: startOfDay } });
    if (dailyCount >= MAX_DAILY_CALLS) {
      return errorResponse(`Daily call limit (${MAX_DAILY_CALLS}) reached. Try again tomorrow.`, 429);
    }

    // ── Initiate the call ───────────────────────────────────────────────────
    const result = await initiateCall(complaint, 'human_agent');

    if (!result.success) {
      return errorResponse(`Failed to initiate call: ${result.error}`, 500);
    }

    // ── Also log contact reveal (initiating a call exposes phone number) ────
    await createAuditEntry({
      action: 'complaint.contact_revealed',
      actor: payload.email,
      targetType: 'complaint',
      targetId: complaint._id.toString(),
      metadata: {
        complaintId,
        reason: 'Call initiation',
        revealedFields: ['submitterPhone'],
      },
    });

    return successResponse({
      message: 'Call initiated successfully',
      roomName: result.roomName,
      complaintId,
      attemptNumber: (complaint.callAttempts || 0) + 1,
    });
  } catch (err) {
    console.error('[CALLS INITIATE] Error:', err);
    return errorResponse('Internal server error', 500);
  }
}
