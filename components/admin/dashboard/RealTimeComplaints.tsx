import React, { useState, useEffect, useCallback } from 'react';
import { Activity, ShieldCheck } from 'lucide-react';
import ComplaintCard, { Complaint } from './ComplaintCard';
import { getComplaints } from '@/lib/api-client';
import { getDevComplaints } from '@/lib/dev-fixtures';

const RealTimeComplaints = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchComplaints = useCallback(async () => {
    try {
      const result = await getComplaints({ limit: 10, sort: '-createdAt' });
      if (result.success && result.data) {
        const mapped: Complaint[] = (result.data as Array<Record<string, unknown>>).map((c) => ({
          id: (c.complaintId as string) || (c._id as string) || '',
          title: (c.title as string) || '',
          description: (c.description as string) || '',
          priority: ((c.priority as string) || 'MEDIUM').toUpperCase() as Complaint['priority'],
          status: ((c.status as string) || 'PENDING').toUpperCase().replace(/ /g, '_') as Complaint['status'],
          time: c.createdAt ? new Date(c.createdAt as string).toLocaleString() : '',
          department: (c.department as string) || 'General',
        }));
        setComplaints(mapped);
        setTotalCount(result.meta?.total ?? mapped.length);
      } else {
        // Fallback to dev fixtures
        const dev = getDevComplaints();
        setComplaints(dev.map(d => ({ ...d, status: d.status.toUpperCase().replace(/ /g, '_') as Complaint['status'] })));
        setTotalCount(dev.length);
      }
    } catch {
      const dev = getDevComplaints();
      setComplaints(dev.map(d => ({ ...d, status: d.status.toUpperCase().replace(/ /g, '_') as Complaint['status'] })));
      setTotalCount(dev.length);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <ShieldCheck size={20} className="text-emerald-500" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight uppercase italic leading-none">Kernel_Issue_Feed</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5 flex items-center gap-2">
              <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></span>
              Live Node Synchronization Active
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-white/5 rounded-xl">
          <Activity size={14} className="text-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{totalCount}_ACTIVE_NODES</span>
        </div>
      </div>

      <div className="space-y-5">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-slate-900/40 p-6 rounded-[2rem] border border-white/5 animate-pulse h-40" />
          ))
        ) : complaints.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm font-bold uppercase tracking-widest">
            No grievances found
          </div>
        ) : (
          complaints.map((item) => (
            <ComplaintCard key={item.id} complaint={item} />
          ))
        )}
      </div>
      
      <button className="w-full py-5 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] border border-dashed border-white/5 rounded-[2rem] hover:bg-white/5 hover:text-emerald-500 hover:border-emerald-500/20 transition-all duration-300">
        Fetch_Historical_Archives
      </button>
    </div>
  );
};

export default RealTimeComplaints;
