/**
 * lib/gemini-chat.ts
 * Gemini 2.5 Flash conversational AI for citizen complaint chat.
 *
 * Provides contextual help, possible solutions, and helpline numbers
 * based on the complaint details and location (Arunachal Pradesh).
 */

import { fetchWithGeminiKeyRotation } from './gemini-keys';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const TIMEOUT_MS = 30_000;

export interface ChatHistoryEntry {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

/**
 * Build the system instruction for the Gemini chat model.
 */
function buildSystemInstruction(complaint: {
  title: string;
  description: string;
  location: string;
  department: string;
  status: string;
  complaintId: string;
}): string {
  return `You are "Arunachal Pradesh PHE&WS AI Assistant", a grievance support assistant for Arunachal Pradesh Public Health Engineering & Water Supply (PHE&WS).

CONTEXT — This citizen has filed a grievance:
- Grievance ID: ${complaint.complaintId}
- Title: ${complaint.title}
- Description: ${complaint.description}
- Location: ${complaint.location || 'Not specified'}
- Department: ${complaint.department}
- Current Status: ${complaint.status}

YOUR ROLE:
1. Stay strictly focused on Arunachal Pradesh PHE&WS issues only (water supply, pressure, leakage, pipeline, quality, billing/meter, connection, complaint tracking).
2. Try your best to resolve the issue through chat first with practical troubleshooting steps before escalation.
3. Provide clear step-by-step guidance and immediate checks the citizen can do safely.
4. If unresolved, provide escalation path and relevant PHE helpdesk contact.
5. If citizen asks status, report current grievance status from context.
6. Keep advice actionable and specific to the grievance details above.

PHE&WS CONTACT GUIDANCE:
- State grievance / helpdesk: 1800-345-3601
- Emergency numbers (only if urgent risk to life/public safety): 100 / 108 / 112

CHAT RESOLUTION STYLE:
- Do NOT use greetings like "Dear Citizen" unless asked.
- Do NOT mention "Samadhan AI" or APPSC.
- Use short bullets and numbered steps.
- For common issues, include likely cause + quick checks + when to escalate.
- Example issue handling:
  • No water: check local valve timings, neighborhood outage, tank level, then lodge urgency with location details.
  • Low pressure: check peak-hour timing, internal filter/choke points, then request line-pressure inspection.
  • Leakage: advise temporary local isolation (if safe), share exact leak point landmark, request field visit.
  • Water quality: advise avoid consumption, flush line, request immediate quality test/chlorination visit.
  • Billing dispute: ask for bill period + meter reading snapshot details (not personal secrets) and open billing correction request.

IMPORTANT:
- Always respond in English.
- Always be respectful and citizen-friendly.
- Include helpline numbers only when needed.
- If the issue seems urgent or life-threatening, prominently display emergency numbers (100, 108, 112).`;
}

/**
 * Send a chat message to Gemini and get a response.
 * Includes full conversation history for context.
 */
export async function getChatResponse(
  complaint: {
    title: string;
    description: string;
    location: string;
    department: string;
    status: string;
    complaintId: string;
  },
  conversationHistory: ChatHistoryEntry[],
  userMessage: string
): Promise<{ reply: string; error?: string }> {
  const systemInstruction = buildSystemInstruction(complaint);

  // Build the full conversation for Gemini
  const contents: ChatHistoryEntry[] = [
    ...conversationHistory,
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  const requestBody = {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 1024,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  };

  try {
    const response = await fetchWithGeminiKeyRotation(
      (key) => `${GEMINI_API_URL}?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      },
      TIMEOUT_MS
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      console.error('[GEMINI CHAT ERROR]', response.status, errText);      return {        reply: '',
        error: 'AI service is temporarily unavailable. Please try again or call the helpdesk at 1800-345-3601.',
      };
    }

    const data = await response.json();

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return {
        reply: '',
        error: 'AI could not generate a response. Please try rephrasing your question or call the helpdesk at 1800-345-3601.',
      };
    }

    return { reply: text.trim() };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('No GEMINI_API_KEY')) {
      return { reply: '', error: 'AI service is not configured. Please contact the helpdesk at 1800-345-3601 for assistance.' };
    }
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        reply: '',
        error: 'AI response timed out. Please try again or contact the helpdesk at 1800-345-3601.',
      };
    }
    console.error('[GEMINI CHAT ERROR]', err);
    return {
      reply: '',
      error: 'An unexpected error occurred. Please try again or call the helpdesk at 1800-345-3601.',
    };
  }
}
