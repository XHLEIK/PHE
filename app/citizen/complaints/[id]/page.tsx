'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Clock, CheckCircle2, AlertTriangle, Loader2,
  MapPin, Phone, Mail, Tag, CalendarDays, Building2,
} from 'lucide-react';
import { getCitizenComplaintById, getCitizenComplaintTimeline, type TimelineEvent } from '@/lib/citizen-api-client';
import ComplaintTimeline from '@/components/citizen/ComplaintTimeline';
import AttachmentGallery from '@/components/AttachmentGallery';

interface AiAnalysis {
  summary?: string;
  department?: string;
  priority?: string;
  sentiment?: string;
  suggestedActions?: string[];
}

interface AttachmentMeta {
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  publicId?: string;
  storageKey?: string;
  thumbnailUrl?: string;
  streamingUrl?: string;
  posterUrl?: string;
}

interface Complaint {
  _id: string;
  complaintId: string;
  title: string;
  description: string;
  status: string;
  priority?: string;
  department?: string;
  submitterName?: string;
  submitterPhone?: string;
  submitterEmail?: string;
  location?: string;
  state?: string;
  district?: string;
  callConsent?: boolean;
  aiAnalysis?: AiAnalysis;
  attachments?: AttachmentMeta[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABEL: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <Clock size={14} /> },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Loader2 size={14} className="animate-spin" /> },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle2 size={14} /> },
  closed: { label: 'Closed', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: <CheckCircle2 size={14} /> },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200', icon: <AlertTriangle size={14} /> },
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-slate-100 text-slate-500',
};

export default function CitizenComplaintDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const [res, tlRes] = await Promise.all([
          getCitizenComplaintById(id),
          getCitizenComplaintTimeline(id),
        ]);
        if (res.success && res.data) {
          setComplaint(res.data as unknown as Complaint);
        } else {
          setError(res.error || 'Complaint not found.');
        }
        if (tlRes.success && tlRes.data) {
          setTimeline(tlRes.data);
        }
      } catch {
        setError('Failed to load complaint details.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading…
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <AlertTriangle size={40} className="mx-auto text-red-400 mb-3" />
        <h2 className="text-lg font-bold text-slate-900 mb-1">Not Found</h2>
        <p className="text-sm text-slate-500 mb-4">{error || 'This complaint could not be found.'}</p>
        <Link
          href="/citizen/complaints"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gov-blue-800 hover:text-gov-blue-700"
        >
          <ArrowLeft size={14} /> Back to Grievances
        </Link>
      </div>
    );
  }

  const st = STATUS_LABEL[complaint.status] ?? STATUS_LABEL.pending;

  return (
    <div className="citizen-page-shell max-w-4xl">
      <Link
        href="/citizen/complaints"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-gov-blue-800 mb-4 transition-colors"
      >
        <ArrowLeft size={14} /> Back to Grievances
      </Link>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-gov-blue-100 shadow-xl overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-gov-blue-800 via-gov-aqua-700 to-gov-blue-700" />

        <div className="p-6">
          {/* Status + ID */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${st.color}`}>
              {st.icon} {st.label}
            </span>
            {complaint.priority && (
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${PRIORITY_BADGE[complaint.priority] ?? PRIORITY_BADGE.low}`}>
                {complaint.priority}
              </span>
            )}
            <span className="ml-auto font-mono text-xs text-slate-400">{complaint.complaintId}</span>
          </div>

          <h1 className="text-xl font-bold text-slate-900 mb-2">{complaint.title}</h1>

          {/* Meta */}
          <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-5">
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={12} />
              Filed {fmtDate(complaint.createdAt)}
            </span>
            {complaint.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} /> {complaint.location}
              </span>
            )}
            {(complaint.aiAnalysis?.department || complaint.department) && (
              <span className="inline-flex items-center gap-1">
                <Building2 size={12} /> {complaint.aiAnalysis?.department || complaint.department}
              </span>
            )}
          </div>

          {/* Description */}
          <div className="bg-gov-neutral-50 rounded-xl border border-gov-blue-100 p-4 mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Description</h3>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{complaint.description}</p>
          </div>

          {/* Attachments */}
          {complaint.attachments && complaint.attachments.length > 0 && (
            <div className="mb-6">
              <AttachmentGallery attachments={complaint.attachments} />
            </div>
          )}

          {/* AI analysis */}
          {complaint.aiAnalysis?.summary && (
            <div className="bg-gov-aqua-50 rounded-xl border border-gov-aqua-200 p-4 mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gov-blue-700 mb-2 flex items-center gap-1">
                <Tag size={12} /> AI Analysis
              </h3>
              <p className="text-sm text-gov-blue-900 leading-relaxed mb-3">{complaint.aiAnalysis.summary}</p>
              {complaint.aiAnalysis.suggestedActions && complaint.aiAnalysis.suggestedActions.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gov-blue-700 mb-1">Suggested Actions</p>
                  <ul className="list-disc list-inside text-sm text-gov-blue-900 space-y-0.5">
                    {complaint.aiAnalysis.suggestedActions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Contact info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {complaint.submitterName && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Name</p>
                <p className="text-sm font-medium text-slate-700">{complaint.submitterName}</p>
              </div>
            )}
            {complaint.submitterPhone && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Phone</p>
                <p className="text-sm font-medium text-slate-700 flex items-center gap-1">
                  <Phone size={12} className="text-slate-400" /> {complaint.submitterPhone}
                </p>
              </div>
            )}
            {complaint.submitterEmail && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Email</p>
                <p className="text-sm font-medium text-slate-700 flex items-center gap-1 truncate">
                  <Mail size={12} className="text-slate-400" /> {complaint.submitterEmail}
                </p>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Complaint Timeline</h3>
            <ComplaintTimeline events={timeline} />
          </div>
        </div>
      </div>
    </div>
  );
}
