import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import { createAuditEntry } from '@/lib/models/AuditLog';
import { verifyAccessToken } from '@/lib/auth';
import { revealContactSchema } from '@/lib/validations';
import { successResponse, errorResponse, getAccessTokenFromCookies, getClientIp } from '@/lib/api-utils';

/**
 * POST /api/complaints/[id]/reveal-contact
 * Returns unmasked phone and email for a complaint.
 * Requires structured reason from REVEAL_REASONS.
 * Writes an audit entry every time — all access is traceable.
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

    // Staff cannot reveal contact information
    if (payload.role === 'staff') {
      return errorResponse('Staff members do not have permission to reveal contact information', 403);
    }

    const body = await req.json();
    const parsed = revealContactSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Validation failed', 400,
        parsed.error.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    const { id } = await params;
    await connectDB();

    const complaint = await Complaint.findOne({ complaintId: id })
      .select('complaintId submitterName submitterPhone submitterEmail department')
      .lean();

    if (!complaint) return errorResponse('Complaint not found', 404);

    // Department scope check for department_admin
    if (payload.role === 'department_admin' && payload.departments?.length) {
      if (!payload.departments.includes(String((complaint as any).department))) {
        return errorResponse('You do not have access to this complaint', 403);
      }
    }

    // Always write audit entry — reason is mandatory and structured
    await createAuditEntry({
      action: 'complaint.contact_revealed',
      actor: payload.email,
      targetType: 'complaint',
      targetId: complaint._id.toString(),
      metadata: {
        complaintId: id,
        reason: parsed.data.reason,
        adminRole: payload.role,
      },
      ipAddress: getClientIp(req),
    });

    return successResponse({
      phone: (complaint as any).submitterPhone || null,
      email: (complaint as any).submitterEmail || null,
      name: (complaint as any).submitterName || null,
    });
  } catch (err) {
    console.error('[REVEAL CONTACT ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
