import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import ChatSession from '@/lib/models/ChatSession';
import Complaint from '@/lib/models/Complaint';
import Citizen from '@/lib/models/Citizen';
import { verifyAccessToken } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { PHE_DEPARTMENT_IDS } from '@/lib/constants/phe';
import { ensureComplaintChatBootstrap } from '@/lib/chat-bootstrap';

/**
 * GET /api/citizen/chats
 * Returns all chat sessions for the logged-in citizen.
 *
 * Logic:
 * 1. Find all complaints belonging to this citizen (by email or citizenId).
 * 2. For any complaint that doesn't have a ChatSession yet, auto-create one.
 * 3. Return all sessions sorted newest-first.
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('citizen_access_token')?.value;
    if (!token) {
      return errorResponse('Authentication required', 401);
    }

    const payload = verifyAccessToken(token);
    if (!payload || payload.role !== 'citizen') {
      return errorResponse('Invalid token', 401);
    }

    await connectDB();

    const email = payload.email.toLowerCase();

    // 1. Find the citizen record to get citizenId
    const citizen = await Citizen.findOne({ email }).lean();

    // 2. Find ALL complaints for this citizen (by email or citizenId)
    const emailFilter: Record<string, unknown>[] = [
      { submitterEmail: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
    ];
    if (citizen) {
      emailFilter.push({ citizenId: citizen._id });
    }

    const complaints = await Complaint.find({
      $or: emailFilter,
      department: { $in: PHE_DEPARTMENT_IDS },
    })
      .select('complaintId title description location')
      .sort({ createdAt: -1 })
      .lean();

    // 3. Find existing chat sessions for this citizen
    const existingSessions = await ChatSession.find({
      email,
      isDeleted: false,
    }).lean();

    const existingComplaintIds = new Set(existingSessions.map((s) => s.complaintId));

    // 4. Auto-create missing ChatSessions for complaints that don't have one
    const missingComplaints = complaints.filter((c) => !existingComplaintIds.has(c.complaintId));

    if (missingComplaints.length > 0) {
      await Promise.allSettled(
        missingComplaints.map((c) =>
          ensureComplaintChatBootstrap(
            {
              complaintId: c.complaintId,
              title: c.title,
              description: c.description || c.title,
              location: c.location,
              department: 'complaint_cell',
              status: 'pending',
            },
            email
          )
        )
      );
    }

    // 5. Re-fetch all sessions (including the ones we just created)
    const pheComplaintIds = complaints.map((c) => c.complaintId);

    const allSessions = await ChatSession.find({
      email,
      isDeleted: false,
      complaintId: { $in: pheComplaintIds },
    })
      .sort({ createdAt: -1 })
      .select('complaintId title email accessToken createdAt updatedAt')
      .lean();

    return successResponse(allSessions);
  } catch (err) {
    console.error('[CITIZEN CHATS LIST ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}
