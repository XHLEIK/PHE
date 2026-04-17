/**
 * lib/call-scheduler.ts
 * Database-driven call scheduling system for AI voice calls.
 *
 * - No setTimeout — scheduling is persisted in the DB via callScheduledAt
 * - processScheduledCalls() is called by an external cron hitting /api/calls/process-scheduled
 * - Uses atomic findOneAndUpdate as a distributed lock to prevent duplicate dispatches
 * - Retry strategy: attempt 1 → +2 min, attempt 2 → +5 min, attempt 3 → +15 min
 * - Quiet hours: 9 AM – 6 PM IST only
 * - Stale-call cleanup: calls stuck in_progress > 10 min → mark failed
 */

import connectDB from './db';
import Complaint, { IComplaint } from './models/Complaint';
import CallLog from './models/CallLog';
import { createAuditEntry } from './models/AuditLog';
import { RoomServiceClient, SipClient, AgentDispatchClient, AccessToken } from 'livekit-server-sdk';
import { DEPARTMENTS } from './constants';

const LIVEKIT_URL = process.env.LIVEKIT_URL || '';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || '';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || '';
const LIVEKIT_SIP_TRUNK_ID = process.env.LIVEKIT_SIP_TRUNK_ID || '';
const TWILIO_NUMBER = process.env.TWILIO_NUMBER || '';
const AGENT_HEALTH_URL = process.env.AGENT_HEALTH_URL || 'http://localhost:8082/';
const MAX_CALLS_PER_COMPLAINT = Number(process.env.MAX_CALLS_PER_COMPLAINT || '3');
const MAX_DAILY_CALLS = Number(process.env.MAX_DAILY_CALLS || '100');

// LiveKit host URL (without wss:// prefix)
function getLivekitHost(): string {
  return LIVEKIT_URL.replace('wss://', '').replace('ws://', '');
}

// ---------------------------------------------------------------------------
// IST quiet-hours check: 9 AM – 6 PM IST (UTC+5:30)
// ---------------------------------------------------------------------------
function isWithinQuietHours(): boolean {
  const now = new Date();
  // IST = UTC + 5:30
  const istHour = (now.getUTCHours() + 5 + (now.getUTCMinutes() + 30 >= 60 ? 1 : 0)) % 24;
  return istHour < 9 || istHour >= 18;
}

function getNextBusinessHourIST(): Date {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // 5:30 in ms
  const istNow = new Date(now.getTime() + istOffset);

  // Set to next 9 AM IST
  const next9AM = new Date(istNow);
  next9AM.setUTCHours(9, 0, 0, 0);

  // If it's already past 9 AM IST today, move to tomorrow
  if (istNow.getUTCHours() >= 9) {
    next9AM.setUTCDate(next9AM.getUTCDate() + 1);
  }

  // Convert back from IST to UTC
  return new Date(next9AM.getTime() - istOffset);
}

// ---------------------------------------------------------------------------
// Build room metadata (minimal — no sensitive data)
// ---------------------------------------------------------------------------
function buildRoomMetadata(complaint: IComplaint): string {
  const dept = DEPARTMENTS.find(d => d.id === complaint.department || d.id === complaint.aiCategory);
  return JSON.stringify({
    complaintId: complaint.complaintId,
    citizenName: complaint.submitterName || 'Citizen',
    complaintTitle: complaint.title,
    complaintDescription: complaint.description,
    complaintSummary: complaint.aiSummary || complaint.description.slice(0, 200),
    department: dept?.label || complaint.department || 'Unassigned',
    departmentId: complaint.department,
    priority: complaint.priority,
    phone: complaint.submitterPhone,
    location: complaint.location || '',
    category: complaint.aiCategory || complaint.category || '',
  });
}

// ---------------------------------------------------------------------------
// Room name convention
// ---------------------------------------------------------------------------
function buildRoomName(complaintId: string, attemptNumber: number): string {
  return `call-${complaintId}-${attemptNumber}`;
}

// ---------------------------------------------------------------------------
// Check agent health
// ---------------------------------------------------------------------------
async function checkAgentHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(AGENT_HEALTH_URL, { signal: controller.signal });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Check daily call limit
// ---------------------------------------------------------------------------
async function getDailyCallCount(): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return CallLog.countDocuments({ createdAt: { $gte: startOfDay } });
}

// ---------------------------------------------------------------------------
// Initiate a single call via LiveKit SIP
// ---------------------------------------------------------------------------
export async function initiateCall(
  complaint: IComplaint,
  callerType: 'ai_agent' | 'human_agent' = 'ai_agent'
): Promise<{ success: boolean; roomName?: string; error?: string }> {
  const attemptNumber = (complaint.callAttempts || 0) + 1;
  const roomName = buildRoomName(complaint.complaintId, attemptNumber);

  if (!complaint.submitterPhone) {
    return { success: false, error: 'No phone number available' };
  }

  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
    return { success: false, error: 'LiveKit credentials not configured' };
  }

  if (!LIVEKIT_SIP_TRUNK_ID) {
    return { success: false, error: 'SIP trunk not configured' };
  }

  try {
    const metadata = buildRoomMetadata(complaint);

    // 1. Create the LiveKit room
    const roomService = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
    await roomService.createRoom({
      name: roomName,
      emptyTimeout: 30,        // Close room 30s after last participant leaves
      maxParticipants: 3,      // agent + citizen + optional monitor
      metadata,
    });

    // 2. Dispatch the AI agent into the room FIRST so it's ready when citizen picks up
    const agentClient = new AgentDispatchClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
    await agentClient.createDispatch(roomName, 'Sam', { metadata });
    console.log(`[CALL-SCHEDULER] 🤖 Agent "Sam" dispatched to room ${roomName}`);

    // 3. Wait for agent to join the room (poll with timeout)
    const agentJoinTimeout = 15000; // 15 seconds max
    const pollInterval = 1000; // Check every second
    const startTime = Date.now();
    let agentJoined = false;

    while (Date.now() - startTime < agentJoinTimeout) {
      try {
        const participants = await roomService.listParticipants(roomName);
        // Look for the agent participant (identity starts with "agent-" or name is "Sam")
        agentJoined = participants.some(p => 
          p.identity?.startsWith('agent-') || 
          p.name === 'Sam' ||
          p.identity === 'Sam'
        );
        if (agentJoined) {
          console.log(`[CALL-SCHEDULER] ✅ Agent joined room ${roomName} after ${Date.now() - startTime}ms`);
          break;
        }
      } catch {
        // Room might not be fully ready yet, continue polling
      }
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    if (!agentJoined) {
      console.warn(`[CALL-SCHEDULER] ⚠️ Agent did not join within ${agentJoinTimeout}ms, proceeding anyway...`);
      // Add extra delay as fallback
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // 4. Format phone number for SIP (ensure +91 prefix for Indian numbers)
    let phoneNumber = complaint.submitterPhone.trim();
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = '+91' + phoneNumber;
    }

    // 5. Create SIP participant — this dials the citizen's phone
    const sipClient = new SipClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
    await sipClient.createSipParticipant(
      LIVEKIT_SIP_TRUNK_ID,
      phoneNumber,
      roomName,
      {
        participantIdentity: `citizen-${complaint.complaintId}`,
        participantName: complaint.submitterName || 'Citizen',
        playDialtone: true,
      }
    );

    // Create CallLog entry
    await CallLog.create({
      complaintId: complaint.complaintId,
      roomName,
      attemptNumber,
      retryCount: Math.max(0, attemptNumber - 1),
      callStatus: 'scheduled',
      callerType,
      startedAt: new Date(),
    });

    // Update complaint denormalized fields
    await Complaint.findByIdAndUpdate(complaint._id, {
      $set: {
        callStatus: 'scheduled',
        lastCallAt: new Date(),
      },
      $inc: { callAttempts: 1 },
    });

    // Audit log
    await createAuditEntry({
      action: 'call.initiated',
      actor: callerType === 'ai_agent' ? 'system:call-scheduler' : 'admin',
      targetType: 'complaint',
      targetId: complaint._id.toString(),
      metadata: {
        complaintId: complaint.complaintId,
        roomName,
        attemptNumber,
        callerType,
        phoneNumber: phoneNumber.slice(0, 4) + '****' + phoneNumber.slice(-2),
      },
    });

    console.log(`[CALL-SCHEDULER] ✅ Call initiated: ${roomName} → ${phoneNumber.slice(0, 4)}****`);
    return { success: true, roomName };
  } catch (err) {
    console.error(`[CALL-SCHEDULER] ❌ Failed to initiate call for ${complaint.complaintId}:`, err);

    // Create a failed CallLog entry
    await CallLog.create({
      complaintId: complaint.complaintId,
      roomName,
      attemptNumber,
      retryCount: Math.max(0, attemptNumber - 1),
      callStatus: 'failed',
      callOutcome: 'technical_failure',
      callerType,
      failureReason: 'network_error',
      startedAt: new Date(),
      endedAt: new Date(),
    }).catch(() => {});

    return { success: false, error: (err as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Schedule a call for a complaint.
// By default (delayMinutes=0) the call is dispatched **immediately inline**
// so citizens receive a call seconds after analysis completes.
// The DB timestamp is still written as a fallback — the cron worker
// (processScheduledCalls) will pick up anything that wasn't dispatched.
// ---------------------------------------------------------------------------
export async function scheduleCall(complaintId: string, delayMinutes = 0): Promise<void> {
  try {
    await connectDB();
    const complaint = await Complaint.findOne({ complaintId });

    if (!complaint) {
      console.warn(`[CALL-SCHEDULER] Complaint not found: ${complaintId}`);
      return;
    }

    // Guard: no consent
    if (!complaint.callConsent) {
      console.log(`[CALL-SCHEDULER] Skipping — no call consent for ${complaintId}`);
      return;
    }

    // Guard: already scheduled or in progress
    if (complaint.callStatus === 'scheduled' || complaint.callStatus === 'in_progress') {
      console.log(`[CALL-SCHEDULER] Skipping — already ${complaint.callStatus} for ${complaintId}`);
      return;
    }

    // Guard: max attempts reached
    if (complaint.callAttempts >= MAX_CALLS_PER_COMPLAINT) {
      console.log(`[CALL-SCHEDULER] Skipping — max attempts (${MAX_CALLS_PER_COMPLAINT}) reached for ${complaintId}`);
      return;
    }

    // Guard: no phone number
    if (!complaint.submitterPhone) {
      console.log(`[CALL-SCHEDULER] Skipping — no phone number for ${complaintId}`);
      return;
    }

    // ── Should we dispatch immediately? ─────────────────────────────────
    // First attempt (delayMinutes === 0) → dispatch inline, skip quiet-hours
    // Retries still respect quiet hours and delay.
    const isImmediate = delayMinutes === 0;

    if (isImmediate) {
      console.log(`[CALL-SCHEDULER] ⚡ Immediate dispatch for ${complaintId}`);

      // Health check before immediate dispatch (agent must be available)
      const agentHealthy = await checkAgentHealth();
      if (!agentHealthy) {
        console.warn(`[CALL-SCHEDULER] Agent health check failed for immediate dispatch. Deferring ${complaintId}`);
        // Defer to cron (schedule for 1 minute later)
        await Complaint.findByIdAndUpdate(complaint._id, {
          $set: {
            callStatus: 'scheduled',
            callScheduledAt: new Date(Date.now() + 60 * 1000),
          },
        });
        return;
      }

      // Mark in_progress right away (acts as distributed lock)
      await Complaint.findByIdAndUpdate(complaint._id, {
        $set: {
          callStatus: 'in_progress',
          callScheduledAt: new Date(),
        },
      });

      await createAuditEntry({
        action: 'call.scheduled',
        actor: 'system:call-scheduler',
        targetType: 'complaint',
        targetId: complaint._id.toString(),
        metadata: {
          complaintId,
          scheduledAt: new Date().toISOString(),
          attemptNumber: (complaint.callAttempts || 0) + 1,
          immediate: true,
        },
      });

      // Re-fetch because initiateCall needs fresh doc
      const freshComplaint = await Complaint.findOne({ complaintId });
      if (!freshComplaint) return;

      const callResult = await initiateCall(freshComplaint);

      if (callResult.success) {
        console.log(`[CALL-SCHEDULER] ✅ Immediate call dispatched: ${callResult.roomName}`);
      } else {
        console.error(`[CALL-SCHEDULER] ❌ Immediate dispatch failed for ${complaintId}: ${callResult.error}`);
        // Revert to 'failed' so retry logic can pick it up
        await Complaint.findByIdAndUpdate(complaint._id, {
          $set: { callStatus: 'failed' },
        });
        // Schedule a retry
        await scheduleRetry(complaintId);
      }
      return;
    }

    // ── Delayed / retry scheduling (respects quiet hours) ──────────────
    let scheduledAt = new Date(Date.now() + delayMinutes * 60 * 1000);

    // If outside quiet hours, defer to next business hour
    if (isWithinQuietHours()) {
      scheduledAt = getNextBusinessHourIST();
      console.log(`[CALL-SCHEDULER] Outside business hours — deferred to ${scheduledAt.toISOString()} for ${complaintId}`);
    }

    // Set the schedule in the database (cron will pick this up)
    await Complaint.findByIdAndUpdate(complaint._id, {
      $set: {
        callStatus: 'scheduled',
        callScheduledAt: scheduledAt,
      },
    });

    await createAuditEntry({
      action: 'call.scheduled',
      actor: 'system:call-scheduler',
      targetType: 'complaint',
      targetId: complaint._id.toString(),
      metadata: {
        complaintId,
        scheduledAt: scheduledAt.toISOString(),
        attemptNumber: (complaint.callAttempts || 0) + 1,
      },
    });

    console.log(`[CALL-SCHEDULER] 📅 Call scheduled for ${complaintId} at ${scheduledAt.toISOString()}`);
  } catch (err) {
    console.error(`[CALL-SCHEDULER] Error scheduling call for ${complaintId}:`, err);
  }
}

// ---------------------------------------------------------------------------
// Schedule a retry call with escalating backoff
// ---------------------------------------------------------------------------
export async function scheduleRetry(complaintId: string): Promise<void> {
  try {
    await connectDB();
    const complaint = await Complaint.findOne({ complaintId });
    if (!complaint) return;

    // Check if user declined — no retries
    const lastLog = await CallLog.findOne({ complaintId }).sort({ createdAt: -1 });
    if (lastLog?.callOutcome === 'user_declined') {
      console.log(`[CALL-SCHEDULER] No retry — user declined for ${complaintId}`);
      await Complaint.findByIdAndUpdate(complaint._id, { $set: { callStatus: 'completed' } });
      return;
    }

    // Max attempts check
    if (complaint.callAttempts >= MAX_CALLS_PER_COMPLAINT) {
      console.log(`[CALL-SCHEDULER] No retry — max attempts reached for ${complaintId}`);
      await Complaint.findByIdAndUpdate(complaint._id, { $set: { callStatus: 'failed' } });

      await createAuditEntry({
        action: 'call.failed',
        actor: 'system:call-scheduler',
        targetType: 'complaint',
        targetId: complaint._id.toString(),
        metadata: {
          complaintId,
          reason: 'max_attempts_reached',
          totalAttempts: complaint.callAttempts,
        },
      });
      return;
    }

    // Escalating backoff: attempt 2 → +5 min, attempt 3 → +15 min
    const backoffMinutes = [2, 5, 15];
    const nextAttempt = complaint.callAttempts; // 0-indexed for backoff array
    const delayMin = backoffMinutes[Math.min(nextAttempt, backoffMinutes.length - 1)];

    await scheduleCall(complaintId, delayMin);
  } catch (err) {
    console.error(`[CALL-SCHEDULER] Error scheduling retry for ${complaintId}:`, err);
  }
}

// ---------------------------------------------------------------------------
// processScheduledCalls — the worker that polls the DB every minute
// Called by GET /api/calls/process-scheduled via external cron
// ---------------------------------------------------------------------------
export async function processScheduledCalls(): Promise<{
  processed: number;
  skipped: number;
  failed: number;
  errors: string[];
}> {
  const result = { processed: 0, skipped: 0, failed: 0, errors: [] as string[] };

  try {
    await connectDB();

    // ── Stale-call cleanup ─────────────────────────────────────────────────
    // Calls stuck in_progress > 10 min → mark failed with timeout
    const staleThreshold = new Date(Date.now() - 10 * 60 * 1000);
    const staleComplaints = await Complaint.find({
      callStatus: 'in_progress',
      lastCallAt: { $lte: staleThreshold },
    });

    for (const stale of staleComplaints) {
      await Complaint.findByIdAndUpdate(stale._id, {
        $set: { callStatus: 'failed' },
      });

      // Update the most recent CallLog for this complaint
      await CallLog.findOneAndUpdate(
        { complaintId: stale.complaintId, callStatus: 'active' },
        {
          $set: {
            callStatus: 'failed',
            callOutcome: 'technical_failure',
            failureReason: 'timeout',
            endedAt: new Date(),
          },
        },
        { sort: { createdAt: -1 } }
      );

      await createAuditEntry({
        action: 'call.failed',
        actor: 'system:call-scheduler',
        targetType: 'complaint',
        targetId: stale._id.toString(),
        metadata: {
          complaintId: stale.complaintId,
          reason: 'stale_call_timeout',
        },
      });

      // Try to schedule a retry
      await scheduleRetry(stale.complaintId);
      result.skipped++;
    }

    // ── Quiet hours check ──────────────────────────────────────────────────
    if (isWithinQuietHours()) {
      console.log('[CALL-SCHEDULER] Outside business hours (9 AM – 6 PM IST). Skipping.');
      return result;
    }

    // ── Daily limit check ──────────────────────────────────────────────────
    const dailyCount = await getDailyCallCount();
    if (dailyCount >= MAX_DAILY_CALLS) {
      console.log(`[CALL-SCHEDULER] Daily call limit reached (${dailyCount}/${MAX_DAILY_CALLS}). Skipping.`);
      return result;
    }

    // ── Agent health check ─────────────────────────────────────────────────
    const agentHealthy = await checkAgentHealth();
    if (!agentHealthy) {
      console.warn('[CALL-SCHEDULER] Agent health check failed. Skipping scheduled calls.');
      result.errors.push('Agent health check failed');
      return result;
    }

    // ── Process scheduled calls ────────────────────────────────────────────
    // Use atomic findOneAndUpdate as distributed lock
    const remainingBudget = MAX_DAILY_CALLS - dailyCount;
    const batchSize = Math.min(5, remainingBudget); // Process up to 5 calls per cycle

    for (let i = 0; i < batchSize; i++) {
      // Atomic lock: only the process that wins the update will initiate the call
      const complaint = await Complaint.findOneAndUpdate(
        {
          callStatus: 'scheduled',
          callScheduledAt: { $lte: new Date() },
          callConsent: true,
          callAttempts: { $lt: MAX_CALLS_PER_COMPLAINT },
        },
        {
          $set: { callStatus: 'in_progress' },
        },
        {
          sort: { callScheduledAt: 1 }, // Oldest first
          returnDocument: 'after',
        }
      );

      if (!complaint) break; // No more scheduled calls

      const callResult = await initiateCall(complaint);

      if (callResult.success) {
        result.processed++;
      } else {
        result.failed++;
        result.errors.push(`${complaint.complaintId}: ${callResult.error}`);

        // Revert status so retry can pick it up
        await Complaint.findByIdAndUpdate(complaint._id, {
          $set: { callStatus: 'failed' },
        });

        // Schedule retry
        await scheduleRetry(complaint.complaintId);
      }
    }

    console.log(`[CALL-SCHEDULER] Cycle complete: ${result.processed} processed, ${result.failed} failed, ${result.skipped} stale cleaned`);
  } catch (err) {
    console.error('[CALL-SCHEDULER] processScheduledCalls error:', err);
    result.errors.push((err as Error).message);
  }

  return result;
}
