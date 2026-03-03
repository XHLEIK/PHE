/**
 * lib/gemini-chat.ts
 * Gemini 2.5 Flash conversational AI for citizen complaint chat.
 *
 * Provides contextual help, possible solutions, and helpline numbers
 * based on the complaint details and location (Arunachal Pradesh).
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
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
  return `You are "Samadhan AI", an intelligent grievance resolution assistant for the Government of Arunachal Pradesh (APPSC — Arunachal Pradesh Public Service Commission).

CONTEXT — This citizen has filed a grievance:
- Grievance ID: ${complaint.complaintId}
- Title: ${complaint.title}
- Description: ${complaint.description}
- Location: ${complaint.location || 'Not specified'}
- Department: ${complaint.department}
- Current Status: ${complaint.status}

YOUR ROLE:
1. Provide helpful, empathetic, and actionable responses to the citizen.
2. Suggest possible solutions and next steps for their grievance.
3. Provide relevant government helpline numbers and contact details for Arunachal Pradesh based on the department:
   - PWD: 0360-2212467
   - Water Resources: 0360-2212455  
   - Electricity/Power: 1912 (24/7 helpline), 0360-2212428
   - Health: 108 (Ambulance), 0360-2212540
   - Education: 0360-2212435
   - Police/Law & Order: 100, 0360-2244338
   - Revenue & Land: 0360-2212426
   - Social Welfare: 0360-2212440
   - Transport: 0360-2212460
   - General/CM Office: 0360-2212546
   - Women Helpline: 181
   - Child Helpline: 1098
   - Toll-Free Grievance: 1800-345-3601
4. If the complaint is about a specific department, provide department-specific guidance.
5. Be conversational but professional. Use simple language accessible to all citizens.
6. If the citizen asks about their complaint status, tell them the current status.
7. Do NOT ask for personal details like phone, email, or Aadhaar. Privacy is critical.
8. Keep responses concise but informative (2-4 paragraphs max).
9. If you don't know something specific, suggest the citizen contact the relevant helpline.

IMPORTANT:
- Always respond in English.
- Always be respectful and use formal tone appropriate for government communication.
- Include relevant helpline numbers when appropriate.
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
  if (!GEMINI_API_KEY) {
    return {
      reply: '',
      error: 'AI service is not configured. Please contact the helpdesk at 1800-345-3601 for assistance.',
    };
  }

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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      console.error('[GEMINI CHAT ERROR]', response.status, errText);
      return {
        reply: '',
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
