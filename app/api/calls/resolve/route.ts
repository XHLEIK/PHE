/**
 * POST /api/calls/resolve
 * Called by the LiveKit AI agent (Sam) to update a complaint's status
 * after a call-based resolution or escalation.
 *
 * Auth: Shared secret (AGENT_API_SECRET) — only the voice agent should call this.
 *
 * Body:
 *   complaintId: string          — the GRV tracking number
 *   outcome: 'resolved' | 'escalated' | 'user_declined'
 *   summary: string              — AI-generated summary of the conversation
 *   citizenSatisfied: boolean    — whether the citizen confirmed satisfaction
 *   resolutionNotes: string      — details on how the issue was resolved / what was discussed
 *   roomName?: string            — LiveKit room name (for audit linking)
 */

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import CallLog from '@/lib/models/CallLog';
import { createAuditEntry } from '@/lib/models/AuditLog';
import { successResponse, errorResponse } from '@/lib/api-utils';

const AGENT_API_SECRET = process.env.AGENT_API_SECRET || process.env.LIVEKIT_API_SECRET || '';

export async function POST(req: NextRequest) {
  try {
    // ── Auth: verify agent secret ───────────────────────────────────────────
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token || token !== AGENT_API_SECRET) {
      return errorResponse('Unauthorized', 401);
    }

    // ── Parse body ──────────────────────────────────────────────────────────
    const body = await req.json();
    const {
      complaintId,
      outcome,
      summary,
      citizenSatisfied,
      resolutionNotes,
      roomName,
    } = body as {
      complaintId?: string;
      outcome?: string;
      summary?: string;
      citizenSatisfied?: boolean;
      resolutionNotes?: string;
      roomName?: string;
    };

    if (!complaintId) {
      return errorResponse('complaintId is required', 400);
    }

    if (!outcome || !['resolved', 'escalated', 'user_declined'].includes(outcome)) {
      return errorResponse('outcome must be one of: resolved, escalated, user_declined', 400);
    }

    await connectDB();

    // ── Find complaint ──────────────────────────────────────────────────────
    const complaint = await Complaint.findOne({ complaintId });
    if (!complaint) {
      return errorResponse('Complaint not found', 404);
    }

    // ── Update complaint based on outcome ───────────────────────────────────
    const updateFields: Record<string, unknown> = {
      callStatus: 'completed',
      lastCallAt: new Date(),
    };

    if (outcome === 'resolved' && citizenSatisfied) {
      updateFields.status = 'resolved';
    } else if (outcome === 'escalated') {
      // Only escalate if not already resolved
      if (complaint.status !== 'resolved') {
        updateFields.status = 'escalated';
      }
    }
    // user_declined — just mark call as completed, don't change complaint status

    await Complaint.findByIdAndUpdate(complaint._id, { $set: updateFields });

    // ── Update CallLog if roomName provided ─────────────────────────────────
    if (roomName) {
      await CallLog.findOneAndUpdate(
        { roomName },
        {
          $set: {
            callOutcome: outcome,
            transcriptSummary: (summary || '').slice(0, 500),
            aiResolution: (resolutionNotes || '').slice(0, 1000),
          },
        }
      );
    } else {
      // Find the most recent call log for this complaint
      await CallLog.findOneAndUpdate(
        { complaintId },
        {
          $set: {
            callOutcome: outcome,
            transcriptSummary: (summary || '').slice(0, 500),
            aiResolution: (resolutionNotes || '').slice(0, 1000),
          },
        },
        { sort: { createdAt: -1 } }
      );
    }

    // ── Audit log ───────────────────────────────────────────────────────────
    await createAuditEntry({
      action: outcome === 'resolved' ? 'call.resolved' : outcome === 'escalated' ? 'call.escalated' : 'call.user_declined',
      actor: 'system:ai-agent-sam',
      targetType: 'complaint',
      targetId: complaint._id.toString(),
      metadata: {
        complaintId,
        outcome,
        citizenSatisfied,
        summary: (summary || '').slice(0, 300),
        resolutionNotes: (resolutionNotes || '').slice(0, 300),
        roomName: roomName || null,
      },
    });

    console.log(`[CALL RESOLVE] ✅ Complaint ${complaintId} → ${outcome} (satisfied: ${citizenSatisfied})`);

    return successResponse({
      message: `Complaint ${outcome === 'resolved' ? 'marked as resolved' : outcome === 'escalated' ? 'escalated' : 'updated'}`,
      complaintId,
      outcome,
      newStatus: updateFields.status || complaint.status,
    });
  } catch (err) {
    console.error('[CALL RESOLVE ERROR]', err);
    return errorResponse('Internal server error', 500);
  }
}
