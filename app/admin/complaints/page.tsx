'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/admin/dashboard/Sidebar';
import Topbar from '@/components/admin/dashboard/Topbar';
import { Clock, Terminal, BrainCircuit, ChevronRight, Activity } from 'lucide-react';
import { getComplaints, updateComplaint } from '@/lib/api-client';
import { getDevComplaints } from '@/lib/dev-fixtures';

interface ComplaintItem {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  time: string;
  department: string;
}

const ComplaintsPage = () => {
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
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
          status: ((c.status as string) || 'pending').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          time: c.createdAt ? new Date(c.createdAt as string).toLocaleString() : '',
          department: (c.department as string) || 'General',
        }));
        setComplaints(mapped);
        setTotalCount(result.meta?.total ?? mapped.length);
      } else {
        const dev = getDevComplaints();
        setComplaints(dev.map(d => ({
          id: d.id, title: d.title, description: d.description,
          priority: d.priority, status: d.status, time: d.time, department: d.department,
        })));
        setTotalCount(dev.length);
      }
    } catch {
      const dev = getDevComplaints();
      setComplaints(dev.map(d => ({
        id: d.id, title: d.title, description: d.description,
        priority: d.priority, status: d.status, time: d.time, department: d.department,
      })));
      setTotalCount(dev.length);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="min-h-screen bg-[#0F172A] flex font-sans">
      <Sidebar />
      
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen overflow-x-hidden">
        <Topbar />
        
        <main className="p-8 space-y-8">
          {/* Page Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight uppercase italic">Active_Grievance_Feed</h1>
              <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-[0.2em] mt-2">Kernel monitoring active • {totalCount} IT-related packets found</p>
            </div>
            
            <div className="flex items-center gap-4">
               <select
                 value={statusFilter}
                 onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                 className="px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 focus:outline-none focus:border-emerald-500/50"
               >
                 <option value="">All Status</option>
                 <option value="pending">Pending</option>
                 <option value="triage">Triage</option>
                 <option value="in_progress">In Progress</option>
                 <option value="resolved">Resolved</option>
                 <option value="closed">Closed</option>
               </select>
               <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest italic">Live Monitor</span>
               </div>
            </div>
          </div>

          {/* List of Complaints */}
          <div className="space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-slate-900/40 p-8 rounded-[2rem] border border-white/5 animate-pulse h-48" />
              ))
            ) : complaints.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-sm font-bold uppercase tracking-widest">
                No grievances match your filters
              </div>
            ) : (
              complaints.map((item) => (
              <div key={item.id} className="bg-slate-900/40 p-8 rounded-[2rem] border border-white/5 backdrop-blur-md group hover:border-emerald-500/30 transition-all duration-300">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-4">
                       <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded border border-white/5 ${
                         item.priority === 'CRITICAL' ? 'text-rose-500 bg-rose-500/10' : 'text-amber-500 bg-amber-500/10'
                       }`}>
                         {item.priority}
                       </span>
                       <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Node: {item.id}</span>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-black text-white tracking-tight group-hover:text-emerald-500 transition-colors mb-2">
                        {item.title}
                      </h3>
                      <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-3xl">
                        {item.description}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-6 pt-2">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest italic">
                        <Clock size={12} />
                        {item.time}
                      </span>
                      <div className="h-1 w-1 bg-slate-800 rounded-full"></div>
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest border-b border-emerald-500/20 pb-0.5">
                        {item.department}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-6 min-w-[240px]">
                    <div className="flex items-center gap-4 w-full">
                      <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 shadow-xl shadow-emerald-500/10 transition-all active:scale-[0.98]">
                        <BrainCircuit size={16} />
                        AI_DEBUG
                      </button>
                      <button className="flex items-center justify-center p-3 bg-slate-800 text-slate-400 rounded-xl hover:text-white transition-all border border-white/5">
                        <Terminal size={18} />
                      </button>
                    </div>
                    
                    <button className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">
                      Open_Full_Trace
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
            )}
          </div>
          {!loading && totalCount > 10 && (
            <div className="flex justify-center gap-4 pt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-6 py-3 bg-slate-900 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white disabled:opacity-30 transition-all"
              >
                Previous
              </button>
              <span className="flex items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Page {page} of {Math.ceil(totalCount / 10)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(totalCount / 10)}
                className="px-6 py-3 bg-slate-900 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white disabled:opacity-30 transition-all"
              >
                Next
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ComplaintsPage;
