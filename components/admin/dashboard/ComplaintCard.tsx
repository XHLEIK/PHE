import React from 'react';
import Link from 'next/link';
import { Clock, ChevronRight, BrainCircuit, Loader2 } from 'lucide-react';

export interface Complaint {
  id: string;
  title: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'TRIAGE' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'ESCALATED';
  time: string;
  department: string;
  aiSummary?: string | null;
  aiConfidence?: number | null;
  analysisStatus?: string | null;
}

const priorityClasses: Record<string, string> = {
  CRITICAL: 'text-rose-700 bg-rose-50 border-rose-200',
  HIGH: 'text-amber-700 bg-amber-50 border-amber-200',
  MEDIUM: 'text-blue-700 bg-blue-50 border-blue-200',
  LOW: 'text-emerald-700 bg-emerald-50 border-emerald-200',
};

const statusClasses: Record<string, string> = {
  PENDING: 'text-slate-600 bg-slate-100 border-slate-200',
  TRIAGE: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  IN_PROGRESS: 'text-blue-700 bg-blue-50 border-blue-200',
  RESOLVED: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  CLOSED: 'text-slate-500 bg-slate-50 border-slate-200',
  ESCALATED: 'text-rose-700 bg-rose-50 border-rose-200',
};

const ComplaintCard: React.FC<{ complaint: Complaint }> = ({ complaint }) => {
  const isAnalyzing = complaint.analysisStatus === 'queued' || complaint.analysisStatus === 'processing';
  const isDeferred = complaint.analysisStatus === 'deferred';
  const displayText = complaint.aiSummary || complaint.description;

  return (
    <Link href={`/admin/complaints/${encodeURIComponent(complaint.id)}`}>
      <div className="bg-white p-5 rounded-xl border border-slate-200 group hover:border-amber-300 hover:shadow-md transition-all duration-200 cursor-pointer">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${priorityClasses[complaint.priority] || priorityClasses.MEDIUM}`}>
                {complaint.priority}
              </span>
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${statusClasses[complaint.status] || statusClasses.PENDING}`}>
                {complaint.status.replace(/_/g, ' ')}
              </span>
              {isAnalyzing && (
                <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" /> Analyzing…
                </span>
              )}
              {isDeferred && (
                <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Needs Review
                </span>
              )}
              {complaint.aiConfidence != null && complaint.aiConfidence > 0 && !isAnalyzing && !isDeferred && (
                <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                  <BrainCircuit size={10} /> {Math.round(complaint.aiConfidence * 100)}%
                </span>
              )}
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock size={12} />
                {complaint.time}
              </span>
            </div>

            <h4 className="text-base font-semibold text-slate-800 group-hover:text-amber-800 transition-colors truncate">
              {complaint.title}
            </h4>
            <p className="text-sm text-slate-500 line-clamp-2">
              {complaint.aiSummary ? (
                <span className="inline-flex items-center gap-1">
                  <BrainCircuit size={12} className="text-amber-600 shrink-0" />
                  {displayText}
                </span>
              ) : displayText}
            </p>

            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs font-medium text-slate-400">{complaint.id}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${complaint.department === 'Unassigned'
                  ? 'text-rose-600 bg-rose-50'
                  : 'text-amber-700 bg-amber-50'
                }`}>
                {complaint.department === 'Unassigned' ? '⚠ Unassigned' : complaint.department}
              </span>
            </div>
          </div>

          <ChevronRight size={20} className="text-slate-300 group-hover:text-amber-600 transition-colors mt-1 shrink-0" />
        </div>
      </div>
    </Link>
  );
};

export default ComplaintCard;
