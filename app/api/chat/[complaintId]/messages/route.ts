import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import ChatSession from '@/lib/models/ChatSession';
import ChatMessage from '@/lib/models/ChatMessage';
import Complaint from '@/lib/models/Complaint';
import { getChatResponse, ChatHistoryEntry } from '@/lib/gemini-chat';
import { successResponse, errorResponse, checkRateLimit, getClientIp } from '@/lib/api-utils';

/**
 * Validate chat access token and return session + complaint.
 */
async function validateAccess(req: NextRequest, complaintId: string) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return { error: errorResponse('Access token required', 401) };
  }

  await connectDB();

  const session = await ChatSession.findOne({
    complaintId,
    accessToken: token,
    isDeleted: false,
  });

  if (!session) {
    // Also check if the token belongs to the same email (cross-complaint access)
    const ownerSession = await ChatSession.findOne({ accessToken: token });
    if (!ownerSession) {
      return { error: errorResponse('Invalid access token', 401) };
    }

    // Verify the requested complaintId belongs to the same email
    const targetSession = await ChatSession.findOne({
      complaintId,
      email: ownerSession.email,
      isDeleted: false,
    });

    if (!targetSession) {
      return { error: errorResponse('Access denied', 403) };
    }

    return { session: targetSession };
  }

  return { session };
}

/**
 * GET /api/chat/[complaintId]/messages?token=<accessToken>
 * Returns all chat messages for a complaint.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ complaintId: string }> }
) {
  try {
    const { complaintId } = await params;
    const result = await validateAccess(req, complaintId);

    if ('error' in result) return result.error;

    const messages = await ChatMessage.find({ complaintId })
      .sort({ createdAt: 1 })
      .select('senderType content createdAt')
      .lean();

    return successResponse(messages);
  } catch (err) {
    console.error('[CHAT MESSAGES GET ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * POST /api/chat/[complaintId]/messages?token=<accessToken>
 * Body: { message: string }
 * Sends user message, gets AI reply, stores both.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ complaintId: string }> }
) {
  const ip = getClientIp(req);
  const { complaintId } = await params;

  const rl = checkRateLimit(`chat-msg:${ip}:${complaintId}`, 30, 300_000);
  if (!rl.allowed) {
    return errorResponse('Too many messages. Please wait a moment before sending more.', 429);
  }

  try {
    const result = await validateAccess(req, complaintId);
    if ('error' in result) return result.error;

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
    const complaint = await Complaint.findOne({ complaintId }).lean();
    if (!complaint) {
      return errorResponse('Complaint not found', 404);
    }

    // Build conversation history from DB (limited to last 20 messages for context window)
    const history = await ChatMessage.find({ complaintId })
      .sort({ createdAt: 1 })
      .select('senderType content')
      .limit(40)
      .lean();

    // Convert to Gemini format (exclude the current user message, it's sent separately)
    const conversationHistory: ChatHistoryEntry[] = history
      .slice(0, -1) // exclude the just-created user message
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
        department: complaint.department || 'Unassigned',
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
    console.error('[CHAT MESSAGE POST ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * DELETE /api/chat/[complaintId]/messages?token=<accessToken>
 * Soft-deletes the chat session (marks isDeleted = true).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ complaintId: string }> }
) {
  try {
    const { complaintId } = await params;
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return errorResponse('Access token required', 401);
    }

    await connectDB();

    // Find token owner
    const ownerSession = await ChatSession.findOne({ accessToken: token });
    if (!ownerSession) {
      return errorResponse('Invalid access token', 401);
    }

    // Verify the complaint belongs to the same email
    const session = await ChatSession.findOne({
      complaintId,
      email: ownerSession.email,
    });

    if (!session) {
      return errorResponse('Chat not found', 404);
    }

    // Soft delete the session
    session.isDeleted = true;
    await session.save();

    // Also delete actual messages for privacy
    await ChatMessage.deleteMany({ complaintId });

    return successResponse({ message: 'Chat deleted successfully' });
  } catch (err) {
    console.error('[CHAT DELETE ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}
