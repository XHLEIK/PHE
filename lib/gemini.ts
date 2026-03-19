/**
 * lib/gemini.ts
 * Gemini 2.5 Flash AI analysis pipeline for complaints.
 * - Reads GEMINI_API_KEY from env only (never hardcoded)
 * - 30s timeout via AbortController
 * - 2 retries with 2s exponential backoff
 * - Returns structured JSON: {category, priority, summary, confidence, modelVersion, promptHash}
 * - On failure: returns {status: 'deferred', error}
 * - Exports processAnalysis(complaintId) as standalone fn — queue-ready
 */
import crypto from 'crypto';
import connectDB from './db';
import Complaint from './models/Complaint';
import Department from './models/Department';
import { DEPARTMENT_IDS } from './constants';
import { createAuditEntry } from './models/AuditLog';
import { scheduleCall } from './call-scheduler';
import { PHE_DEPARTMENT_IDS } from './constants/phe';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2_000;

export interface GeminiAnalysisResult {
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  confidence: number;
  modelVersion: string;
  promptHash: string;
}

export interface GeminiDeferredResult {
  status: 'deferred';
  error: string;
}

type AnalysisOutcome = GeminiAnalysisResult | GeminiDeferredResult;

// ---------------------------------------------------------------------------
// Build the analysis prompt
// ---------------------------------------------------------------------------
async function buildPrompt(title: string, description: string): Promise<{ prompt: string; departmentIds: string[] }> {
  // Try to get active department IDs from DB; fallback to constants
  let departmentIds: string[] = DEPARTMENT_IDS;
  try {
    const depts = await Department.find({ active: true }).select('id label').lean();
    if (depts.length > 0) {
      departmentIds = depts.map(d => d.id);
    }
  } catch {
    // DB lookup failed — use constants fallback silently
  }

  const deptList = departmentIds.join(', ');

  const prompt = `You are an AI assistant for a state government grievance redressal system in India.
Analyze the following citizen complaint and return a structured JSON response.

COMPLAINT TITLE: ${title.trim()}

COMPLAINT DESCRIPTION: ${description.trim()}

AVAILABLE DEPARTMENT IDs (use EXACTLY one of these values for "category"):
${deptList}

INSTRUCTIONS:
1. category: Choose the single most relevant department ID from the list above. Use exactly the ID string, not a label.
2. priority: One of: "low", "medium", "high", "critical"
   - critical: Immediate danger to life, public safety emergency
   - high: Significant impact on daily life, urgent service failure  
   - medium: Moderate inconvenience, needs timely resolution
   - low: Minor issue, can be addressed in normal course
3. summary: 2-3 sentences, written for a government administrator. Be concise and factual. No legal jargon. Focus on: what the issue is, who is affected, what action is needed.
4. confidence: A decimal between 0 and 1 representing how confident you are in the category and priority assignment.

IMPORTANT: Return ONLY valid JSON, no markdown, no explanation. Example format:
{"category":"pwd","priority":"high","summary":"Pothole on NH-44 near Itanagar causing road accidents. Multiple vehicles damaged. Requires immediate road repair.","confidence":0.92}`;

  return { prompt, departmentIds };
}

// ---------------------------------------------------------------------------
// Call Gemini API with timeout + retry
// ---------------------------------------------------------------------------
async function callGemini(prompt: string, attempt = 0): Promise<GeminiAnalysisResult | null> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const promptHash = crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16);

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Gemini API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const modelVersion: string = data?.modelVersion || GEMINI_MODEL;

    // Parse the structured JSON response
    let parsed: Record<string, unknown>;
    try {
      // Strip any accidental markdown code fences
      let cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      // Attempt to repair truncated JSON — close open strings and braces
      if (!cleaned.endsWith('}')) {
        // If truncated mid-string, close the string
        const openQuotes = (cleaned.match(/"/g) || []).length;
        if (openQuotes % 2 !== 0) cleaned += '"';
        // Close any open object
        if (!cleaned.endsWith('}')) cleaned += '}';
      }
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error(`Failed to parse Gemini response as JSON: ${rawText.slice(0, 200)}`);
    }

    const { category, priority, summary, confidence } = parsed as Record<string, unknown>;

    if (!category || !priority || !summary) {
      throw new Error(`Gemini returned incomplete fields: ${JSON.stringify(parsed)}`);
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    const safePriority = validPriorities.includes(String(priority)) ? String(priority) : 'medium';

    return {
      category: String(category).trim().toLowerCase(),
      priority: safePriority as GeminiAnalysisResult['priority'],
      summary: String(summary).trim().slice(0, 500), // hard cap
      confidence: Math.min(1, Math.max(0, Number(confidence) || 0.5)),
      modelVersion,
      promptHash,
    };
  } catch (err) {
    clearTimeout(timeoutId);

    const isRetryable = attempt < MAX_RETRIES;
    if (isRetryable) {
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
      console.warn(`[GEMINI] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, (err as Error).message);
      await new Promise(r => setTimeout(r, delay));
      return callGemini(prompt, attempt + 1);
    }

    throw err;
  }
}

// ---------------------------------------------------------------------------
// analyzeComplaint — returns result or deferred object
// ---------------------------------------------------------------------------
export async function analyzeComplaint(
  title: string,
  description: string
): Promise<AnalysisOutcome> {
  try {
    const { prompt } = await buildPrompt(title, description);
    const result = await callGemini(prompt);
    if (!result) throw new Error('Null result from Gemini');
    return result;
  } catch (err) {
    const errorMsg = (err as Error).message || 'Unknown error';
    console.error('[GEMINI] Analysis failed after all retries:', errorMsg);
    return { status: 'deferred', error: errorMsg };
  }
}

// ---------------------------------------------------------------------------
// processAnalysis — full pipeline: analyze → update complaint → audit
// This is the standalone function that can be called by a queue worker later.
// ---------------------------------------------------------------------------
export async function processAnalysis(complaintId: string): Promise<void> {
  try {
    await connectDB();

    const complaint = await Complaint.findOne({ complaintId });
    if (!complaint) {
      console.error(`[GEMINI] Complaint not found: ${complaintId}`);
      return;
    }

    // Mark as processing
    complaint.analysisStatus = 'processing';
    complaint.lastAnalysisAt = new Date();
    await complaint.save();

    // Build prompt and analyze
    const { prompt } = await buildPrompt(complaint.title, complaint.description);
    const result = await analyzeComplaint(complaint.title, complaint.description);

    if ('status' in result && result.status === 'deferred') {
      // Analysis failed — mark deferred
      complaint.analysisStatus = 'deferred';
      complaint.lastAnalysisError = result.error;
      complaint.lastAnalysisAt = new Date();
      complaint.analysisAttempts = (complaint.analysisAttempts || 0) + 1;
      await complaint.save();

      await createAuditEntry({
        action: 'complaint.analysis_deferred',
        actor: 'system:gemini',
        targetType: 'complaint',
        targetId: complaint._id.toString(),
        metadata: {
          complaintId,
          error: result.error,
          attempt: complaint.analysisAttempts,
        },
      });

      console.warn(`[GEMINI] Analysis deferred for ${complaintId}: ${result.error}`);
      return;
    }

    // Success — update complaint with AI results
    const analysis = result as GeminiAnalysisResult;
    complaint.analysisStatus = 'completed';
    const safeCategory = PHE_DEPARTMENT_IDS.includes(analysis.category)
      ? analysis.category
      : 'complaint_cell';

    complaint.aiCategory = safeCategory;
    complaint.aiPriority = analysis.priority;
    complaint.aiSummary = analysis.summary;
    complaint.aiConfidence = analysis.confidence;
    complaint.modelVersion = analysis.modelVersion;
    complaint.promptHash = analysis.promptHash;
    complaint.analyzedAt = new Date();
    complaint.lastAnalysisAt = new Date();
    complaint.lastAnalysisError = null;
    complaint.analysisAttempts = (complaint.analysisAttempts || 0) + 1;

    // Auto-assign department from AI category (PHE-only safe assignment)
    if (
      complaint.department === 'Unassigned' ||
      complaint.department === 'complaint_cell' ||
      !complaint.department
    ) {
      complaint.department = safeCategory;
    }

    // Override priority with AI if currently default
    if (complaint.priority === 'medium' && analysis.priority) {
      complaint.priority = analysis.priority;
    }

    await complaint.save();

    await createAuditEntry({
      action: 'complaint.analysis_completed',
      actor: 'system:gemini',
      targetType: 'complaint',
      targetId: complaint._id.toString(),
      metadata: {
        complaintId,
        category: safeCategory,
        priority: analysis.priority,
        confidence: analysis.confidence,
        modelVersion: analysis.modelVersion,
        promptHash: analysis.promptHash,
      },
    });

    console.log(`[GEMINI] ✅ Analysis complete for ${complaintId}: ${analysis.category} (${(analysis.confidence * 100).toFixed(0)}% confidence)`);

    // Schedule AI call if citizen consented (fire-and-forget, DB-driven)
    setImmediate(() => {
      scheduleCall(complaintId).catch(err => {
        console.error(`[GEMINI] Failed to schedule call for ${complaintId}:`, err);
      });
    });
  } catch (err) {
    console.error(`[GEMINI] processAnalysis error for ${complaintId}:`, err);
    // Best-effort: mark deferred on unexpected error
    try {
      await connectDB();
      await Complaint.findOneAndUpdate(
        { complaintId },
        {
          $set: {
            analysisStatus: 'deferred',
            lastAnalysisError: (err as Error).message,
            lastAnalysisAt: new Date(),
          },
          $inc: { analysisAttempts: 1 },
        }
      );
    } catch {
      // Ignore secondary error
    }
  }
}
