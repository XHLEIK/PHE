import connectDB from '@/lib/db';
import ConsumerPendingBill from '@/lib/models/ConsumerPendingBill';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const TIMEOUT_MS = 25_000;

export interface PublicChatHistoryEntry {
  role: 'user' | 'assistant';
  text: string;
}

type GeminiChatHistoryEntry = {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
};

const DEMO_PENDING_BILL_SEED: Array<{ consumerId: string; pendingAmount: number }> = [
  { consumerId: 'ITA/RKM/DR/52', pendingAmount: 450 },
  { consumerId: 'ITA/ESS/DR/28', pendingAmount: 300 },
];

const CONSUMER_ID_REGEX = /\bITA\/[A-Z]{3}\/DR\/\d{2}\b/gi;

const DIVISION_OFFICE_ADDRESS_REPLY = `Office the Executive Engineer
PHE & WS Division, Itanagar
Senkhi View, District - Papum Pare
Arunachal Pradesh - 791113
Email:- eepheditanagar@gmail.com

Office the Executive Engineer
PHE & WS Division, Naharlagun
District - Papum Pare
Arunachal Pradesh - 791110`;

function sanitizeAssistantReply(text: string): string {
  return text.replace(/\*\*/g, '').trim();
}

function buildSystemInstruction(): string {
  return `You are "PHE&WS AI Assistant" for Arunachal Pradesh Public Health Engineering & Water Supply (PHE&WS).

SCOPE (STRICT):
- Answer ONLY PHE&WS-related topics: drinking water supply, pipelines, leakage, low pressure, water quality, billing, metering, grievance filing, grievance tracking, department routing, and service guidance.
- If user asks non-PHE topics, politely refuse and redirect to PHE&WS help topics.

TRUSTED INFORMATION TO USE:
1) Department profile
- Organization: Arunachal Pradesh Public Health Engineering & Water Supply Department (PHE&WS)
- Service focus: Rural and urban drinking water supply, treatment and quality, maintenance, grievance handling, new connection support.

2) Office & support references (for citizen guidance)
- Headquarters (for guidance): Office of the Chief Engineer, PHE & Water Supply, Itanagar, Arunachal Pradesh.
- State grievance/toll-free helpdesk: 1800-345-3601
- Emergency numbers (if urgent public safety concern): 100 / 108 / 112
- Advise users to confirm district-division office timings and latest contacts before visiting.

3) Payment guidance (general)
- Users can pay water charges through official counters or approved online modes where enabled.
- Typical channels: UPI, net banking, debit card, and authorized collection counters.
- For payment disputes: ask user to keep consumer ID, last receipt, billing period, and meter reading photo if available.

4) New water connection (how-to)
- Step 1: Create/login citizen account in the portal.
- Step 2: Open request/complaint and choose New Connection under relevant PHE category.
- Step 3: Provide full address, landmark, district, and contact details.
- Step 4: Upload supporting documents (identity/address proof, ownership/occupancy proof if applicable).
- Step 5: Submit request and keep tracking ID for follow-up.
- Step 6: Respond to inspection/document clarification requests promptly.

5) Complaint routing categories in this system
- water_supply_operations
- water_treatment_quality
- pipeline_maintenance
- project_construction
- rural_water_supply
- urban_water_supply
- complaint_cell
- technical_engineering
- monitoring_inspection
- it_digital_systems

RESPONSE RULES:
- Be concise, practical, and citizen-friendly.
- Prefer short bullet points or numbered steps.
- Never invent policy rates, legal decisions, or exact fees. If unknown, say so and direct user to helpdesk.
- Never request Aadhaar, full bank details, OTP, or passwords.
- If user asks pending bill amount and a known consumer ID is provided in context, report it clearly in INR format.
- Keep default response in English.`;
}

function findConsumerIds(input: string): string[] {
  const matches = input.toUpperCase().match(CONSUMER_ID_REGEX) ?? [];
  return Array.from(new Set(matches));
}

function isDivisionOfficeAddressQuery(input: string): boolean {
  const q = input.toLowerCase();
  return (
    (q.includes('division') || q.includes('devision')) &&
    (q.includes('office') || q.includes('address') || q.includes('location'))
  );
}

function isConsumerIdOnlyMessage(input: string): boolean {
  const ids = findConsumerIds(input);
  if (ids.length !== 1) return false;
  return input.trim().toUpperCase() === ids[0];
}

function hadPendingAmountIntent(history: PublicChatHistoryEntry[]): boolean {
  const recentUserMessages = history
    .filter(h => h.role === 'user')
    .slice(-4)
    .map(h => h.text || '');

  return recentUserMessages.some((m) => isPendingAmountQuery(m));
}

function isPendingAmountQuery(input: string): boolean {
  const q = input.toLowerCase();
  return (
    q.includes('pending amount') ||
    q.includes('pending bill') ||
    q.includes('due amount') ||
    q.includes('bill due') ||
    (q.includes('pending') && q.includes('amount'))
  );
}

async function getPendingAmountReply(input: string): Promise<string | null> {
  if (!isPendingAmountQuery(input)) return null;

  const ids = findConsumerIds(input);
  if (ids.length === 0) {
    return 'Please share your consumer ID in this format: ITA/XXX/DR/NN so I can check your pending amount.';
  }

  try {
    await connectDB();

    await ConsumerPendingBill.bulkWrite(
      DEMO_PENDING_BILL_SEED.map((item) => ({
        updateOne: {
          filter: { consumerId: item.consumerId },
          update: {
            $setOnInsert: {
              consumerId: item.consumerId,
              pendingAmount: item.pendingAmount,
              active: true,
            },
          },
          upsert: true,
        },
      })),
      { ordered: false }
    );
  } catch (err) {
    console.error('[PUBLIC PHE CHAT BILL DB SEED ERROR]', err);
  }

  let amountMap = new Map<string, number>();
  try {
    const records = await ConsumerPendingBill.find({
      consumerId: { $in: ids },
      active: true,
    })
      .select('consumerId pendingAmount')
      .lean();

    amountMap = new Map(
      records.map((r: { consumerId: string; pendingAmount: number }) => [r.consumerId, r.pendingAmount])
    );
  } catch (err) {
    console.error('[PUBLIC PHE CHAT BILL DB QUERY ERROR]', err);
    amountMap = new Map(DEMO_PENDING_BILL_SEED.map((x) => [x.consumerId, x.pendingAmount]));
  }

  const lines: string[] = [];
  for (const id of ids) {
    const amount = amountMap.get(id);
    if (typeof amount === 'number') {
      lines.push(`Consumer ID ${id}: Pending amount is ₹${amount}.`);
    } else {
      lines.push(`Consumer ID ${id}: No pending bill record found in the current billing database.`);
    }
  }

  lines.push('For payment support, keep your consumer ID and last receipt ready and contact 1800-345-3601 if needed.');
  return lines.join('\n');
}

async function callGemini(contents: GeminiChatHistoryEntry[]): Promise<{ reply: string; error?: string }> {
  if (!GEMINI_API_KEY) {
    return {
      reply: '',
      error: 'AI assistant is not configured. Please set GEMINI_API_KEY and try again.',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: buildSystemInstruction() }],
        },
        contents,
        generationConfig: {
          temperature: 0.3,
          topP: 0.9,
          maxOutputTokens: 700,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      console.error('[PUBLIC PHE CHAT ERROR]', response.status, errText);
      return {
        reply: '',
        error: 'AI service is temporarily unavailable. Please try again in a moment.',
      };
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!reply) {
      return {
        reply: '',
        error: 'I could not generate a response right now. Please rephrase your question.',
      };
    }

    return { reply: sanitizeAssistantReply(reply) };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { reply: '', error: 'AI response timed out. Please try again.' };
    }
    console.error('[PUBLIC PHE CHAT ERROR]', err);
    return { reply: '', error: 'Unexpected AI error. Please try again.' };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getPhePublicAssistantReply(
  history: PublicChatHistoryEntry[],
  userMessage: string
): Promise<{ reply: string; error?: string }> {
  if (isDivisionOfficeAddressQuery(userMessage)) {
    return { reply: DIVISION_OFFICE_ADDRESS_REPLY };
  }

  const pendingLookupInput =
    isConsumerIdOnlyMessage(userMessage) && hadPendingAmountIntent(history)
      ? `pending amount ${userMessage}`
      : userMessage;

  const pendingReply = await getPendingAmountReply(pendingLookupInput);
  if (pendingReply) {
    return { reply: sanitizeAssistantReply(pendingReply) };
  }

  const sanitizedHistory = history
    .slice(-12)
    .filter((h) => (h.role === 'assistant' || h.role === 'user') && h.text.trim().length > 0)
    .map((h): GeminiChatHistoryEntry => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.text.trim().slice(0, 2000) }],
    }));

  const contents: GeminiChatHistoryEntry[] = [
    ...sanitizedHistory,
    { role: 'user', parts: [{ text: userMessage.trim().slice(0, 2000) }] },
  ];

  return callGemini(contents);
}
