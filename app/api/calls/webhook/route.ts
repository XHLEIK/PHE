import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Complaint from '@/lib/models/Complaint';
import CallLog from '@/lib/models/CallLog';
import { createAuditEntry } from '@/lib/models/AuditLog';
import { scheduleRetry } from '@/lib/call-scheduler';
import { WebhookReceiver } from 'livekit-server-sdk';
import { successResponse, errorResponse } from '@/lib/api-utils';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || '';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || '';

/**
 * POST /api/calls/webhook — LiveKit webhook handler
 * Validated via WebhookReceiver signature. Handles room events to update
 * CallLog and Complaint status throughout the call lifecycle.
 *
 * Event mapping:
 *   participant_joined   → ringing
 *   track_subscribed     → active
 *   participant_left     → call ended
 *   room_finished        → finalize call
 */
export async function POST(req: NextRequest) {
  try {
    // ── Validate webhook signature ──────────────────────────────────────────
    const receiver = new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

    const rawBody = await req.text();
    const authHeader = req.headers.get('authorization') || '';

    let event;
    try {
      event = await receiver.receive(rawBody, authHeader);
    } catch (err) {
      console.error('[WEBHOOK] Signature validation failed:', (err as Error).message);
      return errorResponse('Invalid webhook signature', 401);
    }

    if (!event || !event.event) {
      return errorResponse('Invalid webhook payload', 400);
    }

    const eventType = event.event;
    const roomName = event.room?.name || '';
    const participantId = event.participant?.identity || '';
    const timestamp = new Date().toISOString();

    // Log every webhook event for debugging
    console.log(`[WEBHOOK] Event: ${eventType} | Room: ${roomName} | Participant: ${participantId} | Time: ${timestamp}`);

    // Only process events for call rooms (naming convention: call-{complaintId}-{attempt})
    if (!roomName.startsWith('call-')) {
      return successResponse({ message: 'Ignored — not a call room' });
    }

    await connectDB();

    // Find the corresponding CallLog
    const callLog = await CallLog.findOne({ roomName });
    if (!callLog) {
      console.warn(`[WEBHOOK] No CallLog found for room: ${roomName}`);
      return successResponse({ message: 'No matching call log' });
    }

    // ── Handle events ───────────────────────────────────────────────────────
    switch (eventType) {
      case 'participant_joined': {
        // Citizen or agent joined — mark as ringing
        if (callLog.callStatus === 'scheduled') {
          await CallLog.findByIdAndUpdate(callLog._id, {
            $set: { callStatus: 'ringing' },
          });
          await Complaint.findOneAndUpdate(
            { complaintId: callLog.complaintId },
            { $set: { callStatus: 'in_progress' } }
          );

          await createAuditEntry({
            action: 'call.connected',
            actor: 'system:livekit',
            targetType: 'complaint',
            targetId: callLog.complaintId,
            metadata: { roomName, participantId, eventType },
          });
        }
        break;
      }

      case 'track_published': {
        // Audio track published — call is now active
        if (callLog.callStatus === 'ringing' || callLog.callStatus === 'scheduled') {
          await CallLog.findByIdAndUpdate(callLog._id, {
            $set: { callStatus: 'active' },
          });
          await Complaint.findOneAndUpdate(
            { complaintId: callLog.complaintId },
            { $set: { callStatus: 'in_progress' } }
          );
        }
        break;
      }

      case 'participant_left': {
        // A participant left — check if it's the citizen
        if (participantId.startsWith('citizen-')) {
          // Citizen left → call has ended
          const endedAt = new Date();
          const duration = callLog.startedAt
            ? Math.round((endedAt.getTime() - new Date(callLog.startedAt).getTime()) / 1000)
            : 0;

          // Determine outcome from room metadata if available
          const roomMetadata = event.room?.metadata || '';
          let callOutcome: string = 'escalated'; // default: escalate
          let aiResolution: string | null = null;

          try {
            const meta = JSON.parse(roomMetadata);
            if (meta.callOutcome) callOutcome = meta.callOutcome;
            if (meta.aiResolution) aiResolution = meta.aiResolution;
          } catch {
            // Metadata may not have outcome info
          }

          await CallLog.findByIdAndUpdate(callLog._id, {
            $set: {
              callStatus: 'completed',
              callOutcome,
              aiResolution,
              duration,
              endedAt,
            },
          });

          // Update complaint status based on outcome
          const complaintUpdate: Record<string, unknown> = {
            callStatus: 'completed',
            lastCallAt: endedAt,
          };

          if (callOutcome === 'resolved') {
            complaintUpdate.status = 'resolved';
          } else if (callOutcome === 'escalated') {
            complaintUpdate.status = 'escalated';
          } else if (callOutcome === 'user_declined') {
            // User doesn't want calls — no retry
            complaintUpdate.callStatus = 'completed';
          }

          await Complaint.findOneAndUpdate(
            { complaintId: callLog.complaintId },
            { $set: complaintUpdate }
          );

          await createAuditEntry({
            action: 'call.completed',
            actor: 'system:livekit',
            targetType: 'complaint',
            targetId: callLog.complaintId,
            metadata: {
              roomName,
              callOutcome,
              duration,
              aiResolution,
            },
          });

          // If not resolved and not declined, schedule retry
          if (callOutcome !== 'resolved' && callOutcome !== 'user_declined') {
            await scheduleRetry(callLog.complaintId);
          }
        }
        break;
      }

      case 'room_finished': {
        // Room closed — finalize any incomplete call logs
        if (callLog.callStatus !== 'completed') {
          const endedAt = new Date();
          const duration = callLog.startedAt
            ? Math.round((endedAt.getTime() - new Date(callLog.startedAt).getTime()) / 1000)
            : 0;

          // If call never went active, mark as no_answer
          const wasActive = callLog.callStatus === 'active';
          const callOutcome = wasActive ? 'escalated' : 'no_answer';
          const finalStatus = wasActive ? 'completed' : 'no_answer';

          await CallLog.findByIdAndUpdate(callLog._id, {
            $set: {
              callStatus: finalStatus,
              callOutcome,
              duration,
              endedAt,
            },
          });

          await Complaint.findOneAndUpdate(
            { complaintId: callLog.complaintId },
            {
              $set: {
                callStatus: callOutcome === 'no_answer' ? 'failed' : 'completed',
                lastCallAt: endedAt,
              },
            }
          );

          const auditAction = callOutcome === 'no_answer' ? 'call.no_answer' : 'call.completed';
          await createAuditEntry({
            action: auditAction,
            actor: 'system:livekit',
            targetType: 'complaint',
            targetId: callLog.complaintId,
            metadata: { roomName, callOutcome, duration },
          });

          // Schedule retry for non-resolved outcomes
          if (callOutcome === 'no_answer') {
            await scheduleRetry(callLog.complaintId);
          }
        }
        break;
      }

      default:
        // Unhandled event — log and acknowledge
        console.log(`[WEBHOOK] Unhandled event type: ${eventType}`);
        break;
    }

    return successResponse({ message: 'Webhook processed', eventType, roomName });
  } catch (err) {
    console.error('[WEBHOOK] Error processing webhook:', err);
    return errorResponse('Internal server error', 500);
  }
}
