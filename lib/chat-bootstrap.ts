import crypto from 'crypto';
import ChatSession from '@/lib/models/ChatSession';
import ChatMessage from '@/lib/models/ChatMessage';
import { getChatResponse } from '@/lib/gemini-chat';

interface BootstrapComplaintContext {
  complaintId: string;
  title: string;
  description: string;
  location?: string;
  department?: string;
  status?: string;
}

/**
 * Ensure complaint chat exists with the required initial conversation:
 * 1) first user message = grievance description
 * 2) first AI reply generated via Gemini 2.5 Flash
 */
export async function ensureComplaintChatBootstrap(
  complaint: BootstrapComplaintContext,
  email: string
): Promise<{ sessionId: string; accessToken: string }> {
  const safeEmail = email.toLowerCase().trim();

  let session = await ChatSession.findOne({
    complaintId: complaint.complaintId,
    email: safeEmail,
    isDeleted: false,
  });

  if (!session) {
    const accessToken = crypto.randomBytes(32).toString('hex');
    try {
      session = await ChatSession.create({
        complaintId: complaint.complaintId,
        email: safeEmail,
        title: complaint.title,
        accessToken,
      });
    } catch (err: unknown) {
      // race-safe duplicate handling
      if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
        session = await ChatSession.findOne({
          complaintId: complaint.complaintId,
          email: safeEmail,
          isDeleted: false,
        });
      } else {
        throw err;
      }
    }
  }

  if (!session) {
    throw new Error('Failed to create or resolve chat session');
  }

  const existingMessages = await ChatMessage.find({ complaintId: complaint.complaintId })
    .sort({ createdAt: 1 })
    .select('senderType content')
    .limit(2)
    .lean();

  if (existingMessages.length === 0) {
    const firstUserText = complaint.description?.trim() || complaint.title.trim();

    await ChatMessage.create({
      complaintId: complaint.complaintId,
      senderType: 'user',
      content: firstUserText,
    });

    const aiResult = await getChatResponse(
      {
        title: complaint.title,
        description: complaint.description,
        location: complaint.location || '',
        department: complaint.department || 'complaint_cell',
        status: complaint.status || 'pending',
        complaintId: complaint.complaintId,
      },
      [],
      firstUserText
    );

    await ChatMessage.create({
      complaintId: complaint.complaintId,
      senderType: 'ai',
      content: aiResult.error || aiResult.reply,
    });
  }

  return {
    sessionId: session._id.toString(),
    accessToken: session.accessToken,
  };
}
