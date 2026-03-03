import React, { useState, useEffect, useCallback } from 'react';
import { FileText } from 'lucide-react';
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
          department: (c.department as string) || 'Unassigned',
          aiSummary: (c.aiSummary as string) || null,
          aiConfidence: (c.aiConfidence as number) || null,
          analysisStatus: (c.analysisStatus as string) || null,
        }));
        setComplaints(mapped);
        setTotalCount(result.meta?.total ?? mapped.length);
      } else {
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

  useEffect(() => {
    fetchComplaints();
    // Poll every 10s so AI analysis results appear automatically
    const interval = setInterval(fetchComplaints, 10_000);
    return () => clearInterval(interval);
  }, [fetchComplaints]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText size={20} className="text-amber-700" />
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Recent Grievances</h3>
            <p className="text-xs text-slate-400">{totalCount} total grievances</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 animate-pulse h-32" />
          ))
        ) : complaints.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No grievances found
          </div>
        ) : (
          complaints.map((item) => (
            <ComplaintCard key={item.id} complaint={item} />
          ))
        )}
      </div>
    </div>
  );
};

export default RealTimeComplaints;
