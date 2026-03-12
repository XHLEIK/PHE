'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search, Loader2, Clock, CheckCircle2, AlertTriangle,
  Shield, MapPin, CalendarDays, Building2, FileText,
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
    <div className="max-w-lg mx-auto py-4 font-sans">
      <div className="w-full z-10">
        {/* Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-700 rounded-2xl shadow-lg shadow-amber-700/20 mb-4">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Track Complaint</h1>
          <p className="text-sm text-slate-500 mt-1">Enter your reference number to check status</p>
        </div>

        {/* Search card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-amber-700 via-yellow-400 to-amber-700" />

          <form onSubmit={handleSearch} className="p-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={complaintId}
                onChange={e => { setComplaintId(e.target.value); setError(''); }}
                placeholder="e.g. GRV-AR-PAP-2026-000001"
                className="flex-1 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 bg-[#faf7f0] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors font-mono"
              />
              <button
                type="submit"
                disabled={isSearching || !complaintId.trim()}
                className="shrink-0 px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
          <div className="mt-4 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2">
            <div className="h-1 w-full bg-gradient-to-r from-amber-700 via-yellow-400 to-amber-700" />

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
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 mb-1">AI Summary</p>
                  <p className="text-sm text-amber-900 leading-relaxed">{result.aiAnalysis.summary}</p>
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
                  className="inline-flex items-center gap-2 w-full justify-center px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold rounded-xl transition-colors"
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
            className="inline-flex items-center gap-1 text-sm text-amber-700 hover:text-amber-800 font-medium"
          >
            Back to Dashboard
          </Link>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          Samadhan AI — National Grievance Redressal Platform
        </p>
      </div>
    </div>
  );
}
