'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search, Loader2, Clock, CheckCircle2, AlertTriangle,
  ShieldCheck, MapPin, CalendarDays, Building2, FileText,
} from 'lucide-react';
import { trackComplaint } from '@/lib/citizen-api-client';

interface TrackedComplaint {
  complaintId: string;
  title: string;
  status: string;
  priority?: string;
  department?: string;
  location?: string;
  state?: string;
  district?: string;
  createdAt: string;
  updatedAt: string;
  aiAnalysis?: {
    summary?: string;
    department?: string;
  };
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800', icon: <Clock size={14} /> },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: <Loader2 size={14} className="animate-spin" /> },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 size={14} /> },
  closed: { label: 'Closed', color: 'bg-slate-100 text-slate-700', icon: <CheckCircle2 size={14} /> },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: <AlertTriangle size={14} /> },
};

export default function TrackComplaintPage() {
  const [complaintId, setComplaintId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<TrackedComplaint | null>(null);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = complaintId.trim();
    if (!trimmed) return;

    setIsSearching(true);
    setError('');
    setResult(null);
    setSearched(true);

    try {
      const res = await trackComplaint(trimmed);
      if (res.success && res.data) {
        setResult(res.data as unknown as TrackedComplaint);
      } else {
        setError(res.error || 'Complaint not found. Please check the reference number.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const st = result ? (STATUS_MAP[result.status] ?? STATUS_MAP.pending) : null;

  return (
    <div className="citizen-page-shell max-w-3xl py-4 font-sans">
      <div className="w-full z-10">
        {/* Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gov-blue-800 rounded-2xl shadow-lg shadow-gov-blue-800/20 mb-4">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="citizen-title text-2xl">Track Complaint</h1>
          <p className="citizen-subtitle mt-1">Enter your reference number to check status</p>
        </div>

        {/* Search card */}
        <div className="citizen-card shadow-xl overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-gov-blue-800 via-gov-aqua-700 to-gov-blue-700" />

          <form onSubmit={handleSearch} className="p-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={complaintId}
                onChange={e => { setComplaintId(e.target.value); setError(''); }}
                placeholder="e.g. GRV-AR-PAP-2026-000001"
                className="flex-1 rounded-lg border border-gov-blue-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 bg-gov-neutral-50 focus:outline-none focus:ring-2 focus:ring-gov-aqua-700 transition-colors font-mono"
              />
              <button
                type="submit"
                disabled={isSearching || !complaintId.trim()}
                className="shrink-0 px-5 py-2.5 bg-gov-blue-800 hover:bg-gov-blue-700 text-white text-sm font-bold rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                Track
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Result card */}
        {result && st && (
          <div className="mt-4 bg-white rounded-2xl border border-gov-blue-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2">
            <div className="h-1 w-full bg-gradient-to-r from-gov-blue-800 via-gov-aqua-700 to-gov-blue-700" />

            <div className="p-6">
              {/* Status badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${st.color}`}>
                  {st.icon} {st.label}
                </span>
                <span className="ml-auto text-xs font-mono text-slate-400">{result.complaintId}</span>
              </div>

              <h2 className="text-lg font-bold text-slate-900 mb-2">{result.title}</h2>

              {/* Meta */}
              <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-4">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays size={12} /> {fmtDate(result.createdAt)}
                </span>
                {result.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} /> {result.location}
                  </span>
                )}
                {(result.aiAnalysis?.department || result.department) && (
                  <span className="inline-flex items-center gap-1">
                    <Building2 size={12} /> {result.aiAnalysis?.department || result.department}
                  </span>
                )}
              </div>

              {/* AI Summary */}
              {result.aiAnalysis?.summary && (
                <div className="bg-gov-aqua-50 border border-gov-aqua-200 rounded-xl p-3 mb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gov-blue-700 mb-1">AI Summary</p>
                  <p className="text-sm text-gov-blue-900 leading-relaxed">{result.aiAnalysis.summary}</p>
                </div>
              )}

              {/* Timeline */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Timeline</h3>
                <ol className="relative border-l border-slate-200 ml-3 space-y-3">
                  <li className="ml-6">
                    <span className="absolute -left-2 w-4 h-4 bg-amber-100 border-2 border-amber-500 rounded-full" />
                    <p className="text-sm font-medium text-slate-700">Complaint Submitted</p>
                    <p className="text-xs text-slate-400">{fmtDate(result.createdAt)}</p>
                  </li>
                  {result.aiAnalysis?.department && (
                    <li className="ml-6">
                      <span className="absolute -left-2 w-4 h-4 bg-blue-100 border-2 border-blue-500 rounded-full" />
                      <p className="text-sm font-medium text-slate-700">Routed to {result.aiAnalysis.department}</p>
                    </li>
                  )}
                  {(result.status === 'resolved' || result.status === 'closed') && (
                    <li className="ml-6">
                      <span className="absolute -left-2 w-4 h-4 bg-green-100 border-2 border-green-500 rounded-full" />
                      <p className="text-sm font-medium text-slate-700">{result.status === 'resolved' ? 'Resolved' : 'Closed'}</p>
                      <p className="text-xs text-slate-400">{fmtDate(result.updatedAt)}</p>
                    </li>
                  )}
                </ol>
              </div>

              {/* Full details link for logged-in citizen */}
              <div className="pt-4 border-t border-slate-100 mt-4">
                <Link
                  href={`/citizen/complaints/${result.complaintId}`}
                  className="inline-flex items-center gap-2 w-full justify-center px-4 py-2.5 bg-gov-blue-800 hover:bg-gov-blue-700 text-white text-sm font-bold rounded-xl transition-colors"
                >
                  <FileText size={14} />
                  View Full Details &amp; Timeline
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* No result after search */}
        {searched && !result && !error && !isSearching && (
          <div className="mt-4 text-center text-sm text-slate-400">No results found.</div>
        )}

        {/* Links */}
        <div className="mt-6 text-center space-y-2">
          <Link
            href="/citizen/complaints"
            className="inline-flex items-center gap-1 text-sm text-gov-blue-800 hover:text-gov-blue-700 font-medium"
          >
            Back to Dashboard
          </Link>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          Arunachal Pradesh PHE &amp; Water Supply Department Citizen Services
        </p>
      </div>
    </div>
  );
}
