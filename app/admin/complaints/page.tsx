'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/admin/dashboard/Sidebar';
import Topbar from '@/components/admin/dashboard/Topbar';
import { Clock, ChevronRight, Search, ChevronLeft, BrainCircuit, Loader2 } from 'lucide-react';
import { getComplaints } from '@/lib/api-client';
import { getDevComplaints } from '@/lib/dev-fixtures';

interface ComplaintItem {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  time: string;
  department: string;
  aiSummary?: string | null;
  aiConfidence?: number | null;
  analysisStatus?: string | null;
}

const priorityColors: Record<string, string> = {
  CRITICAL: 'text-rose-700 bg-rose-50 border-rose-200',
  HIGH: 'text-amber-700 bg-amber-50 border-amber-200',
  MEDIUM: 'text-blue-700 bg-blue-50 border-blue-200',
  LOW: 'text-emerald-700 bg-emerald-50 border-emerald-200',
};

const statusColors: Record<string, string> = {
  PENDING: 'text-slate-600 bg-slate-100 border-slate-200',
  TRIAGE: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  IN_PROGRESS: 'text-blue-700 bg-blue-50 border-blue-200',
  RESOLVED: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  CLOSED: 'text-slate-500 bg-slate-50 border-slate-200',
  ESCALATED: 'text-rose-700 bg-rose-50 border-rose-200',
};

const ComplaintsPage = () => {
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const query: Record<string, string | number> = { page, limit: 10, sort: '-createdAt' };
      if (statusFilter) query.status = statusFilter;
      if (searchQuery) query.search = searchQuery;

      const result = await getComplaints(query);
      if (result.success && result.data) {
        const mapped: ComplaintItem[] = (result.data as Array<Record<string, unknown>>).map((c) => ({
          id: (c.complaintId as string) || (c._id as string) || '',
          title: (c.title as string) || '',
          description: (c.description as string) || '',
          priority: ((c.priority as string) || 'medium').toUpperCase(),
          status: ((c.status as string) || 'pending').toUpperCase().replace(/ /g, '_'),
          time: c.createdAt ? new Date(c.createdAt as string).toLocaleString() : '',
          department: (c.department as string) || 'General',
          aiSummary: (c.aiSummary as string) || null,
          aiConfidence: (c.aiConfidence as number) || null,
          analysisStatus: (c.analysisStatus as string) || null,
        }));
        setComplaints(mapped);
        setTotalCount(result.meta?.total ?? mapped.length);
      } else {
        const dev = getDevComplaints();
        setComplaints(dev.map(d => ({
          id: d.id, title: d.title, description: d.description,
          priority: d.priority, status: d.status.toUpperCase().replace(/ /g, '_'), time: d.time, department: d.department,
        })));
        setTotalCount(dev.length);
      }
    } catch {
      const dev = getDevComplaints();
      setComplaints(dev.map(d => ({
        id: d.id, title: d.title, description: d.description,
        priority: d.priority, status: d.status.toUpperCase().replace(/ /g, '_'), time: d.time, department: d.department,
      })));
      setTotalCount(dev.length);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / 10);

  return (
    <div className="min-h-screen bg-[#faf7f0] flex font-sans">
      <Sidebar />
      
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen overflow-x-hidden">
        <Topbar />
        
        <main className="p-6 md:p-8 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">All Grievances</h1>
            <p className="text-sm text-slate-500 mt-1">{totalCount} grievances found</p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by title, ID, or description..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 text-slate-700 placeholder:text-slate-400"
              />
            </form>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-amber-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="triage">Triage</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="escalated">Escalated</option>
            </select>
          </div>

          {/* Complaints List */}
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 animate-pulse h-28" />
              ))
            ) : complaints.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                <p className="text-slate-400">No grievances match your filters</p>
              </div>
            ) : (
              complaints.map((item) => {
                const isAnalyzing = item.analysisStatus === 'queued' || item.analysisStatus === 'processing';
                const isDeferred = item.analysisStatus === 'deferred';
                const displayText = item.aiSummary || item.description;
                return (
                <Link key={item.id} href={`/admin/complaints/${item.id}`}>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer group mb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${priorityColors[item.priority] || 'text-slate-600 bg-slate-100 border-slate-200'}`}>
                            {item.priority}
                          </span>
                          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${statusColors[item.status] || 'text-slate-600 bg-slate-100 border-slate-200'}`}>
                            {item.status.replace(/_/g, ' ')}
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
                          {item.aiConfidence != null && item.aiConfidence > 0 && !isAnalyzing && !isDeferred && (
                            <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                              <BrainCircuit size={10} /> {Math.round(item.aiConfidence * 100)}%
                            </span>
                          )}
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock size={12} />
                            {item.time}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-slate-800 group-hover:text-amber-800 transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-sm text-slate-500 line-clamp-2">
                          {item.aiSummary ? (
                            <span className="inline-flex items-center gap-1">
                              <BrainCircuit size={12} className="text-amber-600 shrink-0" />
                              {displayText}
                            </span>
                          ) : displayText}
                        </p>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400">{item.id}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                            item.department === 'Unassigned'
                              ? 'text-rose-600 bg-rose-50'
                              : 'text-amber-700 bg-amber-50'
                          }`}>
                            {item.department === 'Unassigned' ? '⚠ Unassigned' : item.department}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-slate-300 group-hover:text-amber-600 transition-colors mt-1 shrink-0" />
                    </div>
                  </div>
                </Link>
              );})
            )}
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <span className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ComplaintsPage;
