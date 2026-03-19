'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, Search, Clock, AlertTriangle, CheckCircle2, Loader2,
  ChevronRight, FileText, Filter, ArrowUpDown,
} from 'lucide-react';
import { getCitizenComplaints, type CitizenComplaintQuery } from '@/lib/citizen-api-client';

type Status = 'all' | 'pending' | 'in_progress' | 'resolved' | 'closed' | 'rejected';

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'rejected', label: 'Rejected' },
];

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-slate-100 text-slate-700',
  rejected: 'bg-red-100 text-red-700',
};

const statusIcon: Record<string, React.ReactNode> = {
  pending: <Clock size={12} />,
  in_progress: <Loader2 size={12} className="animate-spin" />,
  resolved: <CheckCircle2 size={12} />,
  closed: <CheckCircle2 size={12} />,
  rejected: <AlertTriangle size={12} />,
};

interface Complaint {
  _id: string;
  complaintId: string;
  title: string;
  status: string;
  priority?: string;
  department?: string;
  createdAt: string;
  aiAnalysis?: {
    summary?: string;
    department?: string;
  };
}

export default function CitizenComplaintsListPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Status>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const query: CitizenComplaintQuery = {
        page,
        limit: 20,
        sort: sortOrder === 'newest' ? '-createdAt' : 'createdAt',
      };
      if (statusFilter !== 'all') query.status = statusFilter;

      const res = await getCitizenComplaints(query);
      if (res.success && res.data) {
        setComplaints(res.data as unknown as Complaint[]);
        setTotalPages(res.meta?.totalPages ?? 1);
        setTotal(res.meta?.total ?? 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, sortOrder]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);
  useEffect(() => { setPage(1); }, [statusFilter, sortOrder]);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="citizen-page-shell max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="citizen-title text-2xl">My Grievances</h1>
          <p className="citizen-subtitle mt-0.5">
            {total > 0 ? `${total} complaint${total !== 1 ? 's' : ''} filed` : 'All your submitted complaints'}
          </p>
        </div>
        <Link
          href="/citizen/complaints/new"
          className="citizen-btn-primary"
        >
          <Plus size={16} /> New Complaint
        </Link>
      </div>

      {/* Filters */}
      <div className="citizen-card p-4 mb-4">
        <div className="flex items-center gap-2 justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-gov-blue-900"
          >
            <Filter size={14} /> Filters
            {statusFilter !== 'all' && (
              <span className="ml-1 w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-gov-blue-800 text-white rounded-full">1</span>
            )}
          </button>
          <button
            onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-gov-blue-900"
          >
            <ArrowUpDown size={14} /> {sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-gov-blue-800 text-white'
                    : 'bg-gov-neutral-50 text-slate-600 hover:bg-gov-aqua-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mr-2" size={20} /> Loading…
        </div>
      ) : complaints.length === 0 ? (
        <div className="citizen-card p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gov-aqua-50 border border-gov-aqua-200 rounded-2xl mb-4">
            <FileText size={28} className="text-gov-blue-700" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No grievances found</h3>
          <p className="text-sm text-slate-500 mb-6">
            {statusFilter !== 'all'
              ? 'No complaints match this filter.'
              : 'You haven\'t submitted any complaints yet.'}
          </p>
          {statusFilter === 'all' && (
            <Link
              href="/citizen/complaints/new"
              className="citizen-btn-primary"
            >
              <Plus size={16} /> File a Complaint
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map(c => (
            <Link
              key={c._id}
              href={`/citizen/complaints/${c._id}`}
              className="block citizen-card hover:shadow-md hover:border-gov-aqua-200 transition-all p-4 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${statusColor[c.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {statusIcon[c.status]} {c.status.replace(/_/g, ' ')}
                    </span>
                    {c.priority && (
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        c.priority === 'critical' ? 'bg-red-100 text-red-700' :
                        c.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        c.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {c.priority}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-900 truncate">{c.title}</h3>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                    <span className="font-mono">{c.complaintId}</span>
                    <span>•</span>
                    <span>{fmtDate(c.createdAt)}</span>
                    {(c.aiAnalysis?.department || c.department) && (
                      <>
                        <span>•</span>
                        <span className="truncate">{c.aiAnalysis?.department || c.department}</span>
                      </>
                    )}
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-gov-blue-700 mt-2 shrink-0 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gov-blue-100 text-slate-600 hover:bg-gov-aqua-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gov-blue-100 text-slate-600 hover:bg-gov-aqua-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Quick track link */}
      <div className="mt-8 text-center">
        <Link
          href="/citizen/track"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-gov-blue-800 transition-colors"
        >
          <Search size={14} /> Track a complaint by ID
        </Link>
      </div>
    </div>
  );
}
