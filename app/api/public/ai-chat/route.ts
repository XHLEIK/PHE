import { NextRequest } from 'next/server';
import { errorResponse, getClientIp, checkRateLimit, successResponse } from '@/lib/api-utils';
import { getPhePublicAssistantReply, PublicChatHistoryEntry } from '@/lib/phe-public-chat';

interface ChatRequestBody {
  message?: string;
  history?: PublicChatHistoryEntry[];
}

/**
 * POST /api/public/ai-chat
 * Public AI assistant endpoint for homepage floating chat.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`public-ai-chat:${ip}`, 25, 60_000);
  if (!rl.allowed) {
    return errorResponse('Too many messages. Please wait a moment and try again.', 429);
  }

  try {
    const body = (await req.json()) as ChatRequestBody;
    const message = body.message?.trim() ?? '';

    if (!message) {
      return errorResponse('Message is required', 400);
    }

    if (message.length > 2000) {
      return errorResponse('Message must be under 2000 characters', 400);
    }

    const rawHistory = Array.isArray(body.history) ? body.history : [];
    const history: PublicChatHistoryEntry[] = rawHistory
      .slice(-20)
      .filter((item) =>
        item &&
        (item.role === 'user' || item.role === 'assistant') &&
        typeof item.text === 'string'
      )
      .map((item) => ({
        role: item.role,
        text: item.text,
      }));

    const aiResult = await getPhePublicAssistantReply(history, message);
    const reply = aiResult.error || aiResult.reply;

    if (!reply) {
      return errorResponse('AI assistant could not respond at this time.', 503);
    }

    return successResponse({ reply });
  } catch (err) {
    console.error('[PUBLIC AI CHAT ROUTE ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}
