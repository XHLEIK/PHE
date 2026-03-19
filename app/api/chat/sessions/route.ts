import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import ChatSession from '@/lib/models/ChatSession';
import Complaint from '@/lib/models/Complaint';
import { successResponse, errorResponse, checkRateLimit, getClientIp } from '@/lib/api-utils';
import { ensureComplaintChatBootstrap } from '@/lib/chat-bootstrap';

/**
 * POST /api/chat/sessions — Create a new chat session after complaint submission
 * Body: { complaintId, email }
 * Returns: { session, accessToken }
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`chat-session:${ip}`, 20, 900_000);
  if (!rl.allowed) {
    return errorResponse('Too many requests. Please try again later.', 429);
  }

  try {
    const body = await req.json();
    const { complaintId, email } = body;

    if (!complaintId || !email) {
      return errorResponse('complaintId and email are required', 400);
    }

    await connectDB();

    // Verify the complaint exists and the email matches
    const complaint = await Complaint.findOne({ complaintId }).lean();
    if (!complaint) {
      return errorResponse('Complaint not found', 404);
    }

    if (complaint.submitterEmail?.toLowerCase() !== email.toLowerCase()) {
      return errorResponse('Email does not match the complaint submitter', 403);
    }

    // Check if a session already exists
    const existing = await ChatSession.findOne({ complaintId });
    if (existing) {
      return successResponse({
        sessionId: existing._id.toString(),
        complaintId: existing.complaintId,
        accessToken: existing.accessToken,
      });
    }

    const boot = await ensureComplaintChatBootstrap(
      {
        complaintId: complaint.complaintId,
        title: complaint.title,
        description: complaint.description,
        location: complaint.location,
        department: complaint.department,
        status: complaint.status,
      },
      email
    );

    return successResponse(
      {
        sessionId: boot.sessionId,
        complaintId,
        accessToken: boot.accessToken,
      },
      undefined,
      201
    );
  } catch (err) {
    console.error('[CHAT SESSION CREATE ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * GET /api/chat/sessions?token=<accessToken>
 * Returns all chat sessions for the same email as the token owner.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return errorResponse('Access token required', 401);
    }

    await connectDB();

    // Find the session this token belongs to
    const session = await ChatSession.findOne({ accessToken: token });
    if (!session) {
      return errorResponse('Invalid access token', 401);
    }

    // Fetch all non-deleted sessions for this email
    const sessions = await ChatSession.find({
      email: session.email,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .select('complaintId title createdAt accessToken')
      .lean();

    return successResponse(sessions);
  } catch (err) {
    console.error('[CHAT SESSIONS LIST ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}
