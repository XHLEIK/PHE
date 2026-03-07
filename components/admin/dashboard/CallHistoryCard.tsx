'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneMissed,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  Ban,
  Volume2,
} from 'lucide-react';
import { initiateCall, getCallLogs } from '@/lib/api-client';

/* ── Types ──────────────────────────────────────────────────────── */

interface CallLog {
  _id: string;
  roomName: string;
  attemptNumber: number;
  retryCount: number;
  callStatus: 'scheduled' | 'ringing' | 'active' | 'completed' | 'failed' | 'no_answer';
  callOutcome?: 'resolved' | 'escalated' | 'no_answer' | 'user_declined' | 'ai_failed' | 'technical_failure' | null;
  callerType: 'ai_agent' | 'human_agent';
  failureReason?: string | null;
  duration?: number | null;
  transcriptSummary?: string | null;
  aiResolution?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
}

interface CallHistoryCardProps {
  complaintId: string;
  callConsent: boolean;
  callStatus: string;
  callAttempts: number;
  hasPhone: boolean;
  userRole: string;
  onCallInitiated?: () => void;
}

/* ── Status configs ─────────────────────────────────────────────── */

const callStatusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  scheduled:  { label: 'Scheduled',  color: 'text-blue-700 bg-blue-50 border-blue-200',     icon: Clock },
  ringing:    { label: 'Ringing',    color: 'text-amber-700 bg-amber-50 border-amber-200',   icon: PhoneCall },
  active:     { label: 'In Progress', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: Volume2 },
  completed:  { label: 'Completed',  color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  failed:     { label: 'Failed',     color: 'text-rose-700 bg-rose-50 border-rose-200',       icon: PhoneOff },
  no_answer:  { label: 'No Answer',  color: 'text-slate-600 bg-slate-100 border-slate-200',   icon: PhoneMissed },
};

const outcomeConfig: Record<string, { label: string; color: string }> = {
  resolved:          { label: 'Resolved',        color: 'text-emerald-700' },
  escalated:         { label: 'Escalated',       color: 'text-amber-700' },
  no_answer:         { label: 'No Answer',       color: 'text-slate-500' },
  user_declined:     { label: 'User Declined',   color: 'text-rose-600' },
  ai_failed:         { label: 'AI Failed',       color: 'text-rose-600' },
  technical_failure: { label: 'Technical Error',  color: 'text-rose-600' },
};

/* ── Helpers ────────────────────────────────────────────────────── */

function formatDuration(seconds?: number | null): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ── Component ──────────────────────────────────────────────────── */

const CallHistoryCard: React.FC<CallHistoryCardProps> = ({
  complaintId,
  callConsent,
  callStatus,
  callAttempts,
  hasPhone,
  userRole,
  onCallInitiated,
}) => {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const isStaff = userRole === 'staff';
  const canInitiate = !isStaff && callConsent && hasPhone && callAttempts < 3;
  const hasActiveCall = callStatus === 'scheduled' || callStatus === 'in_progress';

  const fetchLogs = useCallback(async () => {
    try {
      const result = await getCallLogs(complaintId);
      if (result.success && Array.isArray(result.data)) {
        setLogs(result.data as unknown as CallLog[]);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [complaintId]);

  useEffect(() => {
    fetchLogs();
    // Poll every 5s while a call is active
    const interval = setInterval(fetchLogs, hasActiveCall ? 5000 : 30000);
    return () => clearInterval(interval);
  }, [fetchLogs, hasActiveCall]);

  const handleInitiateCall = async () => {
    setActionError('');
    setActionMsg('');
    setInitiating(true);
    try {
      const result = await initiateCall(complaintId);
      if (result.success) {
        setActionMsg('Call initiated successfully');
        fetchLogs();
        onCallInitiated?.();
      } else {
        setActionError((result as unknown as Record<string, string>).error || 'Failed to initiate call');
      }
    } catch {
      setActionError('Network error');
    } finally {
      setInitiating(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Phone size={16} className="text-amber-700" />
          AI Call History
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          {callAttempts > 0 && (
            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {callAttempts}/3 attempts
            </span>
          )}
        </div>
      </div>

      {/* Consent & eligibility warnings */}
      {!callConsent && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <Ban size={14} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            Citizen did not consent to automated calls. Manual follow-up recommended.
          </p>
        </div>
      )}
      {!hasPhone && callConsent && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
          <AlertTriangle size={14} className="text-slate-500 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-600">No phone number on file. Call feature unavailable.</p>
        </div>
      )}

      {/* Action buttons */}
      {actionError && (
        <div className="px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
          {actionError}
        </div>
      )}
      {actionMsg && (
        <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          {actionMsg}
        </div>
      )}

      {canInitiate && !hasActiveCall && (
        <button
          onClick={handleInitiateCall}
          disabled={initiating}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-700 text-white rounded-lg text-sm font-semibold hover:bg-amber-800 transition-colors disabled:opacity-50"
        >
          {initiating ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Initiating Call…
            </>
          ) : (
            <>
              <PhoneCall size={14} />
              {callAttempts > 0 ? 'Retry Call' : 'Call Citizen'}
            </>
          )}
        </button>
      )}

      {hasActiveCall && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg">
          <Loader2 size={14} className="text-blue-600 animate-spin" />
          <p className="text-xs text-blue-700 font-medium">
            {callStatus === 'scheduled' ? 'Call scheduled — waiting for quiet hours…' : 'Call in progress…'}
          </p>
        </div>
      )}

      {isStaff && callConsent && hasPhone && (
        <p className="text-[10px] text-slate-400">Only department admins and head admins can initiate calls.</p>
      )}

      {/* Call timeline */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={20} className="animate-spin text-slate-300" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-6">
          <PhoneOff size={24} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No calls have been made yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const cfg = callStatusConfig[log.callStatus] || callStatusConfig.failed;
            const StatusIcon = cfg.icon;
            const outcomeCfg = log.callOutcome ? outcomeConfig[log.callOutcome] : null;

            return (
              <div
                key={log._id}
                className="border border-slate-200 rounded-lg p-4 space-y-3 hover:border-slate-300 transition-colors"
              >
                {/* Row 1: Status + attempt + time */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-1 ${cfg.color}`}>
                      <StatusIcon size={10} />
                      {cfg.label}
                    </span>
                    {outcomeCfg && (
                      <span className={`text-[10px] font-medium ${outcomeCfg.color}`}>
                        → {outcomeCfg.label}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                      Attempt #{log.attemptNumber}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {formatTime(log.startedAt || log.createdAt)}
                  </span>
                </div>

                {/* Row 2: Duration + caller */}
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  {log.duration != null && log.duration > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatDuration(log.duration)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    {log.callerType === 'ai_agent' ? (
                      <><Volume2 size={12} className="text-amber-600" /> AI Agent</>
                    ) : (
                      <><Phone size={12} /> Human Agent</>
                    )}
                  </span>
                  {log.callOutcome === 'escalated' && (
                    <span className="flex items-center gap-1 text-amber-700 font-medium">
                      <ArrowUpRight size={12} /> Escalated
                    </span>
                  )}
                </div>

                {/* Transcript summary */}
                {log.transcriptSummary && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Summary</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{log.transcriptSummary}</p>
                  </div>
                )}

                {/* AI resolution */}
                {log.aiResolution && (
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <p className="text-[10px] text-emerald-600 uppercase tracking-wider mb-1">Resolution</p>
                    <p className="text-xs text-emerald-700 leading-relaxed">{log.aiResolution}</p>
                  </div>
                )}

                {/* Failure reason */}
                {log.failureReason && (
                  <p className="text-xs text-rose-600 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    {log.failureReason.replace(/_/g, ' ')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CallHistoryCard;
