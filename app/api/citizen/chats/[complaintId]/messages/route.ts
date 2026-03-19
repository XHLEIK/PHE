import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import ChatSession from '@/lib/models/ChatSession';
import ChatMessage from '@/lib/models/ChatMessage';
import Complaint from '@/lib/models/Complaint';
import { verifyAccessToken } from '@/lib/auth';
import { getChatResponse, ChatHistoryEntry } from '@/lib/gemini-chat';
import { successResponse, errorResponse, checkRateLimit, getClientIp } from '@/lib/api-utils';
import { PHE_DEPARTMENT_IDS } from '@/lib/constants/phe';
import { ensureComplaintChatBootstrap } from '@/lib/chat-bootstrap';

/**
 * Helper: ensure a ChatSession exists for this citizen + complaint.
 * Auto-creates one if the complaint belongs to the citizen but no session exists yet.
 */
async function ensureSession(complaintId: string, email: string) {
  let session = await ChatSession.findOne({
    complaintId,
    email: email.toLowerCase(),
    isDeleted: false,
  });

  if (!session) {
    // Verify the complaint belongs to this citizen
    const complaint = await Complaint.findOne({
      complaintId,
      department: { $in: PHE_DEPARTMENT_IDS },
      $or: [
        { submitterEmail: { $regex: new RegExp(`^${email}$`, 'i') } },
        { citizenId: { $exists: true } },
      ],
    }).lean();

    if (!complaint) return null;

    // Double-check email match (citizenId complaints may have a different email flow)
    const emailMatch = complaint.submitterEmail?.toLowerCase() === email.toLowerCase();
    if (!emailMatch) {
      // Also check by citizenId if the citizen model has this email
      const Citizen = (await import('@/lib/models/Citizen')).default;
      const citizen = await Citizen.findOne({ email: email.toLowerCase() }).lean();
      if (!citizen || String(complaint.citizenId) !== String(citizen._id)) {
        return null;
      }
    }

    // Auto-create session + initial grievance/AI conversation
    try {
      await ensureComplaintChatBootstrap(
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
      session = await ChatSession.findOne({ complaintId, email: email.toLowerCase(), isDeleted: false });
    } catch (createErr: unknown) {
      // Handle race condition (duplicate key)
      if (createErr && typeof createErr === 'object' && 'code' in createErr && (createErr as { code: number }).code === 11000) {
        session = await ChatSession.findOne({ complaintId, email: email.toLowerCase(), isDeleted: false });
      } else {
        throw createErr;
      }
    }
  }

  return session;
}

/**
 * GET /api/citizen/chats/[complaintId]/messages
 * Returns all chat messages for a complaint (citizen JWT auth).
 * Auto-creates a chat session if one doesn't exist yet.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ complaintId: string }> }
) {
  try {
    const token = req.cookies.get('citizen_access_token')?.value;
    if (!token) {
      return errorResponse('Authentication required', 401);
    }

    const payload = verifyAccessToken(token);
    if (!payload || payload.role !== 'citizen') {
      return errorResponse('Invalid token', 401);
    }

    const { complaintId } = await params;
    await connectDB();

    // Ensure a chat session exists (auto-create if needed)
    const session = await ensureSession(complaintId, payload.email);
    if (!session) {
      return errorResponse('Chat not found', 404);
    }

    const messages = await ChatMessage.find({ complaintId })
      .sort({ createdAt: 1 })
      .select('senderType content createdAt')
      .lean();

    return successResponse(messages);
  } catch (err) {
    console.error('[CITIZEN CHAT MESSAGES GET ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * POST /api/citizen/chats/[complaintId]/messages
 * Body: { message: string }
 * Sends user message, gets AI reply, stores both (citizen JWT auth).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ complaintId: string }> }
) {
  const ip = getClientIp(req);
  const { complaintId } = await params;

  const rl = checkRateLimit(`citizen-chat:${ip}:${complaintId}`, 30, 300_000);
  if (!rl.allowed) {
    return errorResponse('Too many messages. Please wait a moment.', 429);
  }

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

    // Ensure a chat session exists (auto-create if needed)
    const session = await ensureSession(complaintId, payload.email);
    if (!session) {
      return errorResponse('Chat not found', 404);
    }

    const body = await req.json();
    const message = body.message?.trim();

    if (!message || message.length > 2000) {
      return errorResponse('Message is required and must be under 2000 characters', 400);
    }

    // Store user message
    const userMsg = await ChatMessage.create({
      complaintId,
      senderType: 'user',
      content: message,
    });

    // Get complaint details for context
    const complaint = await Complaint.findOne({
      complaintId,
      department: { $in: PHE_DEPARTMENT_IDS },
    }).lean();
    if (!complaint) {
      return errorResponse('Complaint not found', 404);
    }

    // Build conversation history
    const history = await ChatMessage.find({ complaintId })
      .sort({ createdAt: 1 })
      .select('senderType content')
      .limit(40)
      .lean();

    const conversationHistory: ChatHistoryEntry[] = history
      .slice(0, -1)
      .map((m) => ({
        role: m.senderType === 'user' ? ('user' as const) : ('model' as const),
        parts: [{ text: m.content }],
      }));

    // Get AI response
    const aiResult = await getChatResponse(
      {
        title: complaint.title,
        description: complaint.description,
        location: complaint.location || '',
        department: complaint.department || 'complaint_cell',
        status: complaint.status,
        complaintId: complaint.complaintId,
      },
      conversationHistory,
      message
    );

    const aiContent = aiResult.error || aiResult.reply;

    // Store AI response
    const aiMsg = await ChatMessage.create({
      complaintId,
      senderType: 'ai',
      content: aiContent,
    });

    return successResponse({
      userMessage: {
        _id: userMsg._id.toString(),
        senderType: 'user',
        content: userMsg.content,
        createdAt: userMsg.createdAt,
      },
      aiMessage: {
        _id: aiMsg._id.toString(),
        senderType: 'ai',
        content: aiMsg.content,
        createdAt: aiMsg.createdAt,
      },
    });
  } catch (err) {
    console.error('[CITIZEN CHAT MESSAGE POST ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}
