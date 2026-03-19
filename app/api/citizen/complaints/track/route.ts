import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import { trackComplaintSchema } from '@/lib/validations';
import { successResponse, errorResponse } from '@/lib/api-utils';

/**
 * GET /api/citizen/complaints/track?complaintId=GRV-AR-PAP-2026-000001
 * Public endpoint — no auth required.
 * Returns safe public fields only (no contact info).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const complaintId = searchParams.get('complaintId') || '';

    const parsed = trackComplaintSchema.safeParse({ complaintId });
    if (!parsed.success) {
      return errorResponse('Invalid complaint tracking ID', 400,
        parsed.error.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    await connectDB();

    const complaint = await Complaint.findOne({
      $or: [
        { complaintId: parsed.data.complaintId },
        { legacyIds: parsed.data.complaintId },
      ],
    })
      .select('complaintId title status priority department category location state district createdAt updatedAt aiSummary analysisStatus')
      .lean();

    if (!complaint) {
      return errorResponse('No complaint found with this tracking ID', 404);
    }

    return successResponse({
      ...complaint,
      matchedBy: (complaint as { complaintId: string }).complaintId === parsed.data.complaintId ? 'complaintId' : 'legacyId',
    });
  } catch (err) {
    console.error('[COMPLAINT TRACK ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
