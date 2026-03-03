import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import { createAuditEntry } from '@/lib/models/AuditLog';
import { verifyAccessToken } from '@/lib/auth';
import { successResponse, errorResponse, getAccessTokenFromCookies, getClientIp } from '@/lib/api-utils';
import { processAnalysis } from '@/lib/gemini';

const COOLDOWN_SECONDS = 60;

/**
 * POST /api/complaints/[id]/reanalyze
 * Manually trigger AI re-analysis for a deferred complaint.
 * Any authenticated admin can trigger. 60-second cooldown per complaint.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getAccessTokenFromCookies(req);
    if (!token) return errorResponse('Authentication required', 401);

    const payload = verifyAccessToken(token);
    if (!payload) return errorResponse('Invalid or expired token', 401);

    // Any authenticated admin can trigger re-analysis
    if (!payload.role) {
      return errorResponse('Administrative access required', 403);
    }

    const { id } = await params;
    await connectDB();

    const complaint = await Complaint.findOne({ complaintId: id });
    if (!complaint) return errorResponse('Complaint not found', 404);

    // 60-second cooldown check
    if (complaint.lastAnalysisAt) {
      const elapsed = (Date.now() - complaint.lastAnalysisAt.getTime()) / 1000;
      if (elapsed < COOLDOWN_SECONDS) {
        const remaining = Math.ceil(COOLDOWN_SECONDS - elapsed);
        return errorResponse(
          `Re-analysis on cooldown. Please wait ${remaining} more second(s).`,
          429,
          [{ field: 'cooldown', message: `${remaining}s remaining` }]
        );
      }
    }

    const attemptNum = (complaint.analysisAttempts || 0) + 1;

    // Write audit entry before triggering
    await createAuditEntry({
      action: 'complaint.reanalysis_triggered',
      actor: payload.email,
      targetType: 'complaint',
      targetId: complaint._id.toString(),
      metadata: {
        complaintId: id,
        attempt: attemptNum,
        previousStatus: complaint.analysisStatus,
      },
      ipAddress: getClientIp(req),
    });

    // Reset status to queued and update lastAnalysisAt to enforce cooldown
    complaint.analysisStatus = 'queued';
    complaint.lastAnalysisAt = new Date();
    await complaint.save();

    // Fire-and-forget re-analysis
    setImmediate(() => {
      processAnalysis(id).catch(err => {
        console.error('[REANALYZE] Fire-and-forget error:', err);
      });
    });

    return successResponse({
      message: 'Re-analysis triggered successfully.',
      complaintId: id,
      attempt: attemptNum,
    });
  } catch (err) {
    console.error('[REANALYZE ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
