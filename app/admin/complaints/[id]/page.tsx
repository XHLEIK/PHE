'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/admin/dashboard/Sidebar';
import Topbar from '@/components/admin/dashboard/Topbar';
import { getComplaintById, updateComplaint, getAuditLogs, revealContact, reanalyzeComplaint, getMe } from '@/lib/api-client';
import { DEPARTMENTS, REVEAL_REASONS } from '@/lib/constants';
import CallHistoryCard from '@/components/admin/dashboard/CallHistoryCard';
import SLABadge from '@/components/admin/dashboard/SLABadge';
import InternalNotes from '@/components/admin/dashboard/InternalNotes';
import AssignmentPicker from '@/components/admin/dashboard/AssignmentPicker';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Building2,
  User,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FileText,
  History,
  BrainCircuit,
  Eye,
  EyeOff,
  RefreshCw,
  Loader2,
  X,
  Phone,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import AttachmentGallery from '@/components/AttachmentGallery';

const priorityColors: Record<string, string> = {
  critical: 'text-rose-700 bg-rose-50 border-rose-200',
  high: 'text-amber-700 bg-amber-50 border-amber-200',
  medium: 'text-blue-700 bg-blue-50 border-blue-200',
  low: 'text-emerald-700 bg-emerald-50 border-emerald-200',
};

const statusColors: Record<string, string> = {
  pending: 'text-slate-600 bg-slate-100 border-slate-200',
  triage: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  in_progress: 'text-blue-700 bg-blue-50 border-blue-200',
  resolved: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  closed: 'text-slate-500 bg-slate-50 border-slate-200',
  escalated: 'text-rose-700 bg-rose-50 border-rose-200',
};

interface AuditEntry {
  action: string;
  actor: string;
  changes: Record<string, { from: unknown; to: unknown }>;
  metadata: Record<string, unknown>;
  createdAt: string;
}

const CLOSURE_REASONS = ['Issue Resolved', 'Duplicate', 'Invalid', 'Transferred', 'Out of Scope'];

const ComplaintDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const complaintId = params.id ? decodeURIComponent(params.id as string) : '';

  const [complaint, setComplaint] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Update form
  const [newStatus, setNewStatus] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');
  const [updateErr, setUpdateErr] = useState('');

  // Audit trail
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);

  // Contact reveal
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [revealReason, setRevealReason] = useState('');
  const [revealedContact, setRevealedContact] = useState<{ phone: string | null; email: string | null; name: string | null } | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [revealError, setRevealError] = useState('');

  // Re-analyze
  const [reanalyzing, setReanalyzing] = useState(false);

  // Current user role for permission gating
  const [userRole, setUserRole] = useState<string>('staff');

  // Active tab
  const [activeTab, setActiveTab] = useState<'details' | 'calls' | 'notes' | 'audit'>('details');

  const fetchUserRole = useCallback(async () => {
    try {
      const result = await getMe();
      if (result.success && result.data) {
        setUserRole((result.data.user as Record<string, unknown>).role as string || 'staff');
      }
    } catch {
      // defaults
    }
  }, []);

  const isStaff = userRole === 'staff';
  const canRevealContact = !isStaff; // head_admin and department_admin only
  const canResolveClose = !isStaff;  // staff cannot resolve/close

  const fetchComplaint = useCallback(async () => {
    try {
      const result = await getComplaintById(complaintId);
      if (result.success && result.data) {
        setComplaint(result.data);
        setNewStatus((result.data.status as string) || '');
        setNewPriority((result.data.priority as string) || '');
        setNewDepartment((result.data.department as string) || '');
      } else {
        setError(result.error || 'Complaint not found');
      }
    } catch {
      setError('Failed to load complaint');
    } finally {
      setLoading(false);
    }
  }, [complaintId]);

  const fetchAudit = useCallback(async () => {
    try {
      const result = await getAuditLogs({ limit: 20 });
      if (result.success && result.data) {
        const filtered = (result.data as Array<Record<string, unknown>>).filter(
          (a) => (a.metadata as Record<string, unknown>)?.complaintId === complaintId
        );
        setAuditLogs(
          filtered.map((a) => ({
            action: (a.action as string) || '',
            actor: (a.actor as string) || '',
            changes: (a.changes as Record<string, { from: unknown; to: unknown }>) || {},
            metadata: (a.metadata as Record<string, unknown>) || {},
            createdAt: (a.createdAt as string) || '',
          }))
        );
      }
    } catch {
      // Audit logs are optional
    }
  }, [complaintId]);

  useEffect(() => {
    fetchComplaint();
    fetchAudit();
    fetchUserRole();
  }, [fetchComplaint, fetchAudit, fetchUserRole]);

  const handleRevealContact = async () => {
    if (!revealReason) {
      setRevealError('Please select a reason');
      return;
    }
    setRevealError('');
    setRevealing(true);
    try {
      const result = await revealContact(complaintId, revealReason);
      if (result.success && result.data) {
        setRevealedContact(result.data);
        setShowRevealModal(false);
        setRevealReason('');
      } else {
        setRevealError(result.error || 'Failed to reveal contact');
      }
    } catch {
      setRevealError('Network error');
    } finally {
      setRevealing(false);
    }
  };

  const handleReanalyze = async () => {
    setReanalyzing(true);
    try {
      await reanalyzeComplaint(complaintId);
      // Refresh after a short delay for analysis to start
      setTimeout(() => {
        fetchComplaint();
        setReanalyzing(false);
      }, 2000);
    } catch {
      setReanalyzing(false);
    }
  };

  const handleUpdate = async () => {
    setUpdateErr('');
    setUpdateMsg('');
    const updates: Record<string, unknown> = {};

    if (newStatus && newStatus !== (complaint?.status as string)) updates.status = newStatus;
    if (newPriority && newPriority !== (complaint?.priority as string)) updates.priority = newPriority;
    if (newDepartment && newDepartment !== (complaint?.department as string)) updates.department = newDepartment;
    if (reason) updates.reason = reason;
    if (comment) updates.comment = comment;

    if (Object.keys(updates).filter(k => k !== 'reason' && k !== 'comment').length === 0) {
      setUpdateErr('No changes to save');
      return;
    }

    // Check if reason is needed for terminal statuses
    const terminalStatuses = ['resolved', 'closed', 'escalated'];
    if (updates.status && terminalStatuses.includes(updates.status as string) && !reason) {
      setUpdateErr(`A reason is required when changing status to "${updates.status}"`);
      return;
    }

    setUpdating(true);

    // Optimistic update — apply changes immediately, revert on failure
    const previousComplaint = complaint ? { ...complaint } : null;
    if (complaint) {
      const optimistic = { ...complaint };
      if (updates.status) optimistic.status = updates.status;
      if (updates.priority) optimistic.priority = updates.priority;
      if (updates.department) optimistic.department = updates.department;
      setComplaint(optimistic);
    }

    try {
      const result = await updateComplaint(complaintId, updates);
      if (result.success) {
        setUpdateMsg('Complaint updated successfully');
        setReason('');
        setComment('');
        fetchComplaint(); // Refresh with server truth
        fetchAudit();
      } else {
        setComplaint(previousComplaint); // Revert on failure
        setUpdateErr(result.error || 'Update failed');
      }
    } catch {
      setComplaint(previousComplaint); // Revert on failure
      setUpdateErr('Network error');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (d: unknown) => {
    if (!d) return '—';
    return new Date(d as string).toLocaleString();
  };

  const statusLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  const currentStatus = ((complaint?.status as string) || 'pending').toLowerCase();
  const currentPriority = ((complaint?.priority as string) || 'medium').toLowerCase();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf7f0] flex font-sans">
        <Sidebar />
        <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
          <Topbar />
          <main className="p-6 md:p-8">
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-6 animate-pulse h-40" />
              <div className="bg-white border border-slate-200 rounded-xl p-6 animate-pulse h-64" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="min-h-screen bg-[#faf7f0] flex font-sans">
        <Sidebar />
        <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
          <Topbar />
          <main className="p-6 md:p-8">
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              <AlertTriangle size={40} className="text-rose-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-slate-800 mb-2">Complaint Not Found</h2>
              <p className="text-slate-500 text-sm mb-4">{error || 'The requested complaint could not be loaded.'}</p>
              <Link href="/admin/complaints" className="text-sm text-amber-700 hover:underline">← Back to Grievances</Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf7f0] flex font-sans">
      <Sidebar />
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen overflow-x-hidden">
        <Topbar />
        <main className="p-6 md:p-8 space-y-6">
          {/* Back + Title */}
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <ArrowLeft size={18} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Grievance {String(complaint.complaintId || '')}</h1>
              <p className="text-xs text-slate-400">Filed {formatDate(complaint.createdAt)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tab Bar */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex border-b border-slate-200">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'details'
                        ? 'border-amber-700 text-amber-800 bg-amber-50/50'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                      }`}
                  >
                    <FileText size={14} />
                    Details
                  </button>
                  <button
                    onClick={() => setActiveTab('calls')}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'calls'
                        ? 'border-amber-700 text-amber-800 bg-amber-50/50'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                      }`}
                  >
                    <Phone size={14} />
                    Calls
                    {Number(complaint.callAttempts || 0) > 0 && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">
                        {String(complaint.callAttempts)}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('notes')}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'notes'
                        ? 'border-amber-700 text-amber-800 bg-amber-50/50'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                      }`}
                  >
                    <MessageSquare size={14} />
                    Notes
                    {Number(complaint.internalNoteCount || 0) > 0 && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-semibold">
                        {String(complaint.internalNoteCount)}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('audit')}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'audit'
                        ? 'border-amber-700 text-amber-800 bg-amber-50/50'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                      }`}
                  >
                    <History size={14} />
                    Audit
                    {auditLogs.length > 0 && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-semibold">
                        {auditLogs.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* ═══ Details Tab ═══ */}
              {activeTab === 'details' && (
                <>
                  {/* Complaint Details Card */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${priorityColors[currentPriority] || 'text-slate-600 bg-slate-100 border-slate-200'}`}>
                        {currentPriority}
                      </span>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${statusColors[currentStatus] || 'text-slate-600 bg-slate-100 border-slate-200'}`}>
                        {statusLabel(currentStatus)}
                      </span>
                      <SLABadge
                        slaDeadline={(complaint.slaDeadline as string) || null}
                        slaBreached={!!complaint.slaBreached}
                        status={currentStatus}
                      />
                    </div>

                    <h2 className="text-lg font-semibold text-slate-900">{String(complaint.title || '')}</h2>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{String(complaint.description || '')}</p>

                    {/* Attachments */}
                    {Array.isArray(complaint.attachments) && (complaint.attachments as Array<Record<string, unknown>>).length > 0 && (
                      <div className="pt-3">
                        <AttachmentGallery
                          attachments={(complaint.attachments as Array<Record<string, unknown>>).map((att) => ({
                            fileName: String(att.fileName || 'File'),
                            fileType: String(att.fileType || ''),
                            fileSize: Number(att.fileSize || 0),
                            url: String(att.url || ''),
                            thumbnailUrl: String(att.thumbnailUrl || ''),
                            storageKey: String(att.storageKey || att.publicId || ''),
                            streamingUrl: String(att.streamingUrl || ''),
                            posterUrl: String(att.posterUrl || ''),
                          }))}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Department</p>
                        <p className="text-sm font-medium text-slate-700 flex items-center gap-1"><Building2 size={14} className="text-amber-700" /> {String(complaint.department || '—')}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Location</p>
                        <p className="text-sm font-medium text-slate-700 flex items-center gap-1"><MapPin size={14} className="text-amber-700" /> {String(complaint.location || '—')}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Submitter</p>
                        <p className="text-sm font-medium text-slate-700 flex items-center gap-1"><User size={14} className="text-amber-700" /> {String(complaint.submitterName || 'Anonymous')}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Updated</p>
                        <p className="text-sm font-medium text-slate-700 flex items-center gap-1"><Clock size={14} className="text-amber-700" /> {formatDate(complaint.updatedAt)}</p>
                      </div>
                    </div>

                    {/* Contact Info — masked by default, with reveal button */}
                    {(!!complaint.submitterPhone || !!complaint.submitterEmail) && (
                      <div className="pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Contact Information</p>
                          {!revealedContact && canRevealContact && (
                            <button
                              onClick={() => setShowRevealModal(true)}
                              className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium transition-colors"
                            >
                              <Eye size={14} />
                              Reveal Full Contact
                            </button>
                          )}
                        </div>
                        <div className="flex gap-4 text-sm text-slate-600">
                          {revealedContact ? (
                            <>
                              <span>📞 {revealedContact.phone || '—'}</span>
                              <span>✉️ {revealedContact.email || '—'}</span>
                            </>
                          ) : (
                            <>
                              {!!complaint.submitterPhone && <span className="flex items-center gap-1"><EyeOff size={12} className="text-slate-400" /> 📞 {String(complaint.submitterPhone)}</span>}
                              {!!complaint.submitterEmail && <span className="flex items-center gap-1"><EyeOff size={12} className="text-slate-400" /> ✉️ {String(complaint.submitterEmail)}</span>}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI Analysis Card — using real AI fields */}
                  {!!(complaint.aiSummary || complaint.analysisStatus) && (
                    <div className={`border rounded-xl p-6 ${complaint.analysisStatus === 'deferred' ? 'bg-amber-50 border-amber-200' :
                        complaint.analysisStatus === 'completed' ? 'bg-emerald-50 border-emerald-200' :
                          'bg-blue-50 border-blue-200'
                      }`}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <BrainCircuit size={16} className="text-amber-700" />
                          Samadhan AI Analysis
                          {complaint.analysisStatus === 'queued' || complaint.analysisStatus === 'processing' ? (
                            <span className="text-xs text-blue-600 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Analyzing…</span>
                          ) : complaint.analysisStatus === 'deferred' ? (
                            <span className="text-xs text-amber-600">Deferred — Needs Review</span>
                          ) : null}
                        </h3>
                        {complaint.analysisStatus === 'deferred' && (
                          <button
                            onClick={handleReanalyze}
                            disabled={reanalyzing}
                            className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium disabled:opacity-50"
                          >
                            <RefreshCw size={12} className={reanalyzing ? 'animate-spin' : ''} />
                            Re-analyze
                          </button>
                        )}
                      </div>

                      {!!complaint.aiSummary && (
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">AI Summary</p>
                            <p className="text-sm text-slate-800">{String(complaint.aiSummary || '')}</p>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            {!!complaint.aiCategory && (
                              <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Suggested Dept</p>
                                <p className="text-sm font-medium text-slate-700">{String(complaint.aiCategory || '')}</p>
                              </div>
                            )}
                            {!!complaint.aiPriority && (
                              <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Suggested Priority</p>
                                <p className="text-sm font-medium text-slate-700 capitalize">{String(complaint.aiPriority || '')}</p>
                              </div>
                            )}
                            {complaint.aiConfidence != null && (
                              <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Confidence</p>
                                <p className={`text-sm font-medium ${Number(complaint.aiConfidence) >= 0.8 ? 'text-emerald-700' :
                                    Number(complaint.aiConfidence) >= 0.6 ? 'text-amber-700' : 'text-rose-700'
                                  }`}>
                                  {Math.round(Number(complaint.aiConfidence) * 100)}%
                                  {Number(complaint.aiConfidence) < 0.6 && <span className="text-xs text-amber-600 ml-1">⚠ Low confidence</span>}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ═══ Calls Tab ═══ */}
              {activeTab === 'calls' && (
                <CallHistoryCard
                  complaintId={complaintId}
                  callConsent={!!complaint.callConsent}
                  callStatus={String(complaint.callStatus || 'not_called')}
                  callAttempts={Number(complaint.callAttempts || 0)}
                  hasPhone={!!complaint.submitterPhone}
                  userRole={userRole}
                  onCallInitiated={fetchComplaint}
                />
              )}

              {/* ═══ Notes Tab ═══ */}
              {activeTab === 'notes' && (
                <InternalNotes complaintId={complaintId} />
              )}

              {/* ═══ Audit Tab ═══ */}
              {activeTab === 'audit' && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <History size={16} className="text-slate-500" />
                    Activity History
                  </h3>
                  {auditLogs.length === 0 ? (
                    <div className="text-center py-8">
                      <History size={24} className="text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">No audit entries found for this complaint.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {auditLogs.map((log, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-700">
                              <span className="font-medium">{log.actor}</span>
                              {' updated '}
                              {Object.entries(log.changes).map(([key, val]) => (
                                <span key={key} className="inline">
                                  <span className="font-medium">{key}</span>
                                  {' from '}
                                  <span className="text-slate-400">{String(val.from)}</span>
                                  {' → '}
                                  <span className="text-amber-700 font-medium">{String(val.to)}</span>
                                  {' '}
                                </span>
                              ))}
                            </p>
                            {!!log.metadata?.reason && (
                              <p className="text-xs text-slate-500 mt-1">Reason: {String(log.metadata.reason)}</p>
                            )}
                            <p className="text-[10px] text-slate-400 mt-1">{formatDate(log.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Sidebar - Actions */}
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Update Grievance</h3>

                {updateErr && <div className="mb-3 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">{updateErr}</div>}
                {updateMsg && <div className="mb-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">{updateMsg}</div>}

                <div className="space-y-4">
                  {/* Status */}
                  <div>
                    <label className="text-xs text-slate-500 font-medium mb-1 block">Status</label>
                    <div className="relative">
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-amber-500 appearance-none"
                      >
                        <option value="pending">Pending</option>
                        <option value="triage">Triage</option>
                        <option value="in_progress">In Progress</option>
                        {canResolveClose && <option value="resolved">Resolved</option>}
                        {canResolveClose && <option value="closed">Closed</option>}
                        <option value="escalated">Escalated</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                    {isStaff && (
                      <p className="text-[10px] text-slate-400 mt-1">Staff can escalate or mark in-progress. Only department admins can resolve/close.</p>
                    )}
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="text-xs text-slate-500 font-medium mb-1 block">Priority</label>
                    <div className="relative">
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-amber-500 appearance-none"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Department */}
                  <div>
                    <label className="text-xs text-slate-500 font-medium mb-1 block">Department</label>
                    <div className="relative">
                      <select
                        value={newDepartment}
                        onChange={(e) => setNewDepartment(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-amber-500 appearance-none"
                      >
                        <option value="">Select department</option>
                        {DEPARTMENTS.filter(d => d.active).map(d => (
                          <option key={d.id} value={d.id}>{d.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Reason (required for terminal statuses) */}
                  <div>
                    <label className="text-xs text-slate-500 font-medium mb-1 block">
                      Reason {['resolved', 'closed', 'escalated'].includes(newStatus) && <span className="text-rose-500">*</span>}
                    </label>
                    <div className="relative">
                      <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-amber-500 appearance-none"
                      >
                        <option value="">Select reason</option>
                        {CLOSURE_REASONS.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="text-xs text-slate-500 font-medium mb-1 block">Comment (optional)</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      placeholder="Add a note..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-amber-500 resize-none placeholder:text-slate-400"
                    />
                  </div>

                  <button
                    onClick={handleUpdate}
                    disabled={updating}
                    className="w-full py-2.5 bg-amber-700 text-white rounded-lg text-sm font-semibold hover:bg-amber-800 transition-colors disabled:opacity-50"
                  >
                    {updating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              {/* Assignment */}
              <AssignmentPicker
                complaintId={complaintId}
                complaintDepartment={String(complaint.department || '')}
                currentAssignee={complaint.assignedTo as string | undefined}
                onAssigned={() => { fetchComplaint(); }}
              />

              {/* Quick Info */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Quick Info</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Complaint ID</span>
                  <span className="text-slate-700 font-medium">{String(complaint.complaintId || '')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Assigned To</span>
                  <span className="text-slate-700 font-medium">{String(complaint.assignedToName || complaint.assignedTo || 'Unassigned')}</span>
                </div>
                {!!complaint.slaDeadline && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">SLA Deadline</span>
                    <span className={`font-medium ${complaint.slaBreached ? 'text-rose-600' : 'text-slate-700'}`}>
                      {formatDate(complaint.slaDeadline)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Category</span>
                  <span className="text-slate-700 font-medium">{String(complaint.category || '—')}</span>
                </div>
                {!!complaint.coordinates && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">GPS</span>
                    <span className="text-slate-700 font-medium text-xs">
                      {(complaint.coordinates as Record<string, number>).lat?.toFixed(4)}, {(complaint.coordinates as Record<string, number>).lng?.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reveal Contact Modal */}
          {showRevealModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
              <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-slate-200 mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Eye size={18} className="text-amber-700" />
                    Reveal Contact Information
                  </h3>
                  <button onClick={() => { setShowRevealModal(false); setRevealError(''); }} className="p-1 hover:bg-slate-100 rounded">
                    <X size={18} className="text-slate-400" />
                  </button>
                </div>
                <p className="text-sm text-slate-500 mb-4">Select a reason for accessing contact details. This action is logged in the audit trail.</p>
                {revealError && <div className="mb-3 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">{revealError}</div>}
                <div className="space-y-3 mb-6">
                  {REVEAL_REASONS.map((r) => (
                    <label key={r} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${revealReason === r ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:bg-slate-50'
                      }`}>
                      <input
                        type="radio"
                        name="revealReason"
                        value={r}
                        checked={revealReason === r}
                        onChange={() => setRevealReason(r)}
                        className="accent-amber-700"
                      />
                      <span className="text-sm text-slate-700">{r}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setShowRevealModal(false); setRevealError(''); }} className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleRevealContact} disabled={revealing} className="flex-1 py-2.5 bg-amber-700 text-white rounded-lg text-sm font-semibold hover:bg-amber-800 transition-colors disabled:opacity-50">
                    {revealing ? 'Revealing…' : 'Confirm & Reveal'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ComplaintDetailPage;
