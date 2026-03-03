'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/admin/dashboard/Sidebar';
import Topbar from '@/components/admin/dashboard/Topbar';
import RealTimeComplaints from '@/components/admin/dashboard/RealTimeComplaints';
import { getDashboardStats } from '@/lib/api-client';
import { getDevDashboardStats, getDevInfraMetrics } from '@/lib/dev-fixtures';
import { 
  Zap, 
  ShieldAlert, 
  CheckCircle2, 
  History,
  Activity
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = { Zap, ShieldAlert, CheckCircle2, History };

interface StatDisplay {
  title: string;
  value: string;
  change: string;
  color: string;
}

interface InfraMetric {
  label: string;
  value: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<StatDisplay[]>([]);
  const [infraMetrics, setInfraMetrics] = useState<InfraMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const result = await getDashboardStats();
      if (result.success && result.data) {
        const overview = result.data.overview as Record<string, number>;
        setStats([
          { title: 'System_Grievances', value: String(overview.total ?? 0), change: `${overview.last24h ?? 0} today`, color: 'emerald' },
          { title: 'Critical_Alerts', value: String((result.data.priorities?.critical ?? 0) + (result.data.priorities?.high ?? 0)), change: 'ALERT', color: 'rose' },
          { title: 'Kernel_Resolved', value: String(overview.resolved ?? 0), change: `${overview.resolutionRate ?? 0}%`, color: 'blue' },
          { title: 'Uptime_Session', value: '99.9%', change: 'LIVE', color: 'emerald' },
        ]);
        setInfraMetrics(getDevInfraMetrics()); // infra metrics are client-side only for now
      } else {
        // Fallback to dev fixtures
        const devStats = getDevDashboardStats();
        setStats(devStats.map(s => ({ title: s.title, value: s.value, change: s.change, color: s.color })));
        setInfraMetrics(getDevInfraMetrics());
      }
    } catch {
      const devStats = getDevDashboardStats();
      setStats(devStats.map(s => ({ title: s.title, value: s.value, change: s.change, color: s.color })));
      setInfraMetrics(getDevInfraMetrics());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  return (
    <div className="min-h-screen bg-[#0F172A] flex font-sans">
      <Sidebar />
      
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen overflow-x-hidden">
        <Topbar />
        
        <main className="p-8 space-y-12">
          {/* Hero Header */}
          <div className="text-center space-y-4">
             <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 mb-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                <span className="text-[10px] font-black uppercase tracking-widest italic">Core_Kernel_Online</span>
             </div>
             <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase italic leading-tight">
               IT_OPERATIONS_CENTER
             </h1>
             <p className="text-slate-500 font-medium max-w-2xl mx-auto text-sm tracking-wide">
               Real-time monitoring of Arunachal Pradesh IT Exam Infrastructure & Candidate Grievance Vectors.
             </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl animate-pulse h-32" />
              ))
            ) : (
              stats.map((stat, i) => {
                const icons = [Zap, ShieldAlert, CheckCircle2, History];
                const Icon = icons[i] ?? Zap;
                return (
                  <div key={stat.title} className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl backdrop-blur-md group hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 rounded-lg bg-slate-950 border border-white/5 transition-all">
                        <Icon size={20} className={stat.color === 'emerald' ? 'text-emerald-500' : stat.color === 'rose' ? 'text-rose-500' : 'text-blue-500'} />
                      </div>
                      <span className="text-[10px] font-black text-emerald-500 uppercase italic tracking-tighter">{stat.change}</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{stat.title}</p>
                    <h3 className="text-2xl font-black text-white tracking-tighter italic">{stat.value}</h3>
                  </div>
                );
              })
            )}
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2">
              <RealTimeComplaints />
            </div>

            <div className="space-y-8 sticky top-28">
              {/* Load Monitor Refined for Dark Theme */}
              <div className="bg-slate-950 border border-emerald-500/10 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-3xl group-hover:bg-emerald-500/10 transition-all"></div>
                 <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-2 italic">
                   <Activity size={16} className="text-emerald-500" />
                   Infra_Load_Monitor
                 </h3>
                 
                 <div className="space-y-6">
                    {infraMetrics.map((metric) => (
                      <div key={metric.label} className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
                          <span>{metric.label}</span>
                          <span className="text-emerald-500">{metric.value}%</span>
                        </div>
                        <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]" style={{ width: `${metric.value}%` }}></div>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
              
              {/* Node Status Security Badge */}
              <div className="flex items-center justify-center gap-3 p-5 bg-slate-900/40 border border-white/5 rounded-[2rem] backdrop-blur-md italic">
                <ShieldAlert size={16} className="text-emerald-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">ARUNACHAL_SEC_NODE_7741</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
