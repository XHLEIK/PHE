'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/admin/dashboard/Sidebar';
import Topbar from '@/components/admin/dashboard/Topbar';
import { getDashboardStats } from '@/lib/api-client';
import { getDevAnalyticsStats, getDevBarChartValues, getDevDepartmentLoads, getDevTimeline } from '@/lib/dev-fixtures';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Calendar, 
  Terminal, 
  BrainCircuit, 
  ArrowUpRight, 
  ArrowDownRight,
  CheckCircle2,
  Clock,
  Search,
  ChevronRight
} from 'lucide-react';

interface AnalyticsStat {
  label: string;
  value: string;
  trend: string;
  color: string;
}

interface DeptLoad {
  label: string;
  color: string;
  val: string;
}

interface TimelineEntry {
  id: string;
  node: string;
  time: string;
  status: string;
}

const AnalyticsPage = () => {
  const [stats, setStats] = useState<AnalyticsStat[]>([]);
  const [barValues, setBarValues] = useState<number[]>([]);
  const [deptLoads, setDeptLoads] = useState<DeptLoad[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      const result = await getDashboardStats();
      if (result.success && result.data) {
        const overview = result.data.overview as Record<string, number>;
        setStats([
          { label: 'Issues Resolved', value: String(overview.resolved ?? 0), trend: `${overview.resolutionRate ?? 0}%`, color: 'emerald' },
          { label: 'Avg Triage Time', value: '—', trend: 'N/A', color: 'blue' },
          { label: 'AI Accuracy', value: '—', trend: 'N/A', color: 'purple' },
          { label: 'Network Uptime', value: '99.9%', trend: 'STABLE', color: 'emerald' },
        ]);
        // Department loads from real data
        if (result.data.departments && result.data.departments.length > 0) {
          const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-slate-700', 'bg-purple-500', 'bg-rose-500'];
          const total = result.data.departments.reduce((s, d) => s + d.count, 0);
          setDeptLoads(result.data.departments.slice(0, 4).map((d, i) => ({
            label: d.department || 'Other',
            color: colors[i % colors.length],
            val: total > 0 ? `${Math.round((d.count / total) * 100)}%` : '0%',
          })));
        } else {
          setDeptLoads(getDevDepartmentLoads());
        }
      } else {
        setStats(getDevAnalyticsStats());
        setDeptLoads(getDevDepartmentLoads());
      }
    } catch {
      setStats(getDevAnalyticsStats());
      setDeptLoads(getDevDepartmentLoads());
    } finally {
      setBarValues(getDevBarChartValues());
      setTimeline(getDevTimeline());
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);
  return (
    <div className="min-h-screen bg-[#0F172A] flex font-sans">
      <Sidebar />
      
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen overflow-x-hidden">
        <Topbar />
        
        <main className="p-6 md:p-10 space-y-10">
          {/* Header Section */}
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight uppercase italic">Kernel_Analytics</h1>
              <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-[0.2em] mt-2">IT Grievance Vector Analysis & Node Performance</p>
            </div>
            
            <div className="flex items-center gap-3">
               <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                  <input type="text" placeholder="Search Metrics..." className="pl-9 pr-4 py-2 bg-slate-900 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-500 focus:outline-none focus:border-emerald-500/50 transition-all w-48" />
               </div>
               <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 border border-white/5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all text-slate-400 shadow-xl">
                 <Calendar size={14} className="text-emerald-500" />
                 T-30 Days Range
               </button>
            </div>
          </div>

          {/* TOP ROW: IMPACT STATS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-card p-6 rounded-[2rem] animate-pulse h-32" />
              ))
            ) : (
              stats.map((stat, i) => {
                const icons = [CheckCircle2, Clock, BrainCircuit, Terminal];
                const Icon = icons[i] ?? CheckCircle2;
                return (
                  <div key={stat.label} className="glass-card p-6 rounded-[2rem] group hover:scale-[1.02] transition-all duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-slate-950 rounded-2xl border border-white/5 transition-all">
                        <Icon size={20} className={stat.color === 'emerald' ? 'text-emerald-500' : stat.color === 'blue' ? 'text-blue-500' : 'text-purple-500'} />
                      </div>
                      <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${stat.trend.startsWith('+') ? 'text-emerald-400 bg-emerald-500/5' : stat.trend.startsWith('-') ? 'text-rose-400 bg-rose-500/5' : 'text-emerald-400 bg-emerald-500/5'}`}>
                        {stat.trend}
                      </span>
                    </div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                    <h3 className="text-2xl font-black text-white tracking-tighter italic">{stat.value}</h3>
                  </div>
                );
              })
            )}
          </div>

          {/* MAIN GRID: CHARTS */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* Animated Bar Chart (2/3) */}
            <div className="xl:col-span-2 glass-card p-8 rounded-[2.5rem] relative overflow-hidden group">
               <div className="flex items-center justify-between mb-10">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-3">
                    <TrendingUp size={18} className="text-emerald-500" />
                    Node Grievance Volume
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Successful</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-slate-700 rounded-full"></div>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pending</span>
                    </div>
                  </div>
               </div>
               
               <div className="h-72 w-full flex items-end justify-between px-4 pb-2 relative">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-[0.03]">
                    {[1,2,3,4,5].map(i => <div key={i} className="w-full h-px bg-white"></div>)}
                  </div>
                  
                  {barValues.map((h, i) => (
                    <div key={i} className="relative group/bar flex flex-col items-center w-full max-w-[40px]">
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-slate-900 text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-all pointer-events-none z-10">
                        {h}k
                      </div>
                      <div 
                        className="w-full bg-slate-800 rounded-t-lg transition-all duration-[1.5s] ease-out relative overflow-hidden"
                        style={{ height: `${h}%`, transitionDelay: `${i * 50}ms` }}
                      >
                        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-emerald-600 to-emerald-400 opacity-80" style={{ height: '70%' }}></div>
                      </div>
                    </div>
                  ))}
               </div>
               <div className="mt-6 flex justify-between text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] px-2">
                  <span>JAN</span><span>MAR</span><span>MAY</span><span>JUL</span><span>SEP</span><span>NOV</span>
               </div>
            </div>

            {/* Animated Pie Chart (1/3) */}
            <div className="glass-card p-8 rounded-[2.5rem] flex flex-col justify-between">
               <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-3 mb-10">
                 <PieChart size={18} className="text-blue-500" />
                 Department Load
               </h3>
               
               <div className="relative flex items-center justify-center py-10">
                  <svg width="200" height="200" viewBox="0 0 100 100" className="transform -rotate-90">
                    {/* Circle 1: Background */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-slate-900" />
                    {/* Segment 1: Exam (45%) */}
                    <circle 
                      cx="50" cy="50" r="40" fill="transparent" 
                      stroke="rgb(16 185 129)" strokeWidth="10" 
                      strokeDasharray="251.2" 
                      strokeDashoffset={251.2 - (251.2 * 0.45)} 
                      className="transition-all duration-[2s] ease-in-out hover:stroke-emerald-400 cursor-pointer"
                    />
                    {/* Segment 2: Finance (25%) - offset starts after 45% */}
                    <circle 
                      cx="50" cy="50" r="40" fill="transparent" 
                      stroke="rgb(59 130 246)" strokeWidth="10" 
                      strokeDasharray="251.2" 
                      strokeDashoffset={251.2 - (251.2 * 0.25)} 
                      style={{ transformOrigin: 'center', transform: `rotate(${360 * 0.45}deg)` }}
                      className="transition-all duration-[2s] ease-in-out hover:stroke-blue-400 cursor-pointer"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <p className="text-3xl font-black text-white tracking-tighter">84%</p>
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Active_Cap</p>
                  </div>
               </div>

               <div className="space-y-3 mt-10">
                  {deptLoads.map(item => (
                    <div key={item.label} className="flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${item.color} group-hover:scale-125 transition-transform`}></div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
                      </div>
                      <span className="text-[10px] font-black text-white tabular-nums">{item.val}</span>
                    </div>
                  ))}
               </div>
            </div>

          </div>

          {/* LOWER GRID: TRENDS & RESOLUTION LOG */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* AI Advisory Panel */}
            <div className="bg-emerald-600 p-10 rounded-[2.5rem] text-white shadow-2xl shadow-emerald-500/20 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-1000"></div>
               <div className="relative z-10 flex flex-col h-full justify-between">
                 <div>
                   <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 border border-white/20">
                      <BrainCircuit size={28} className="text-white" />
                   </div>
                   <h3 className="text-3xl font-black tracking-tighter italic mb-4 leading-tight">AI_STRATEGIC_LOG</h3>
                   <p className="text-white/80 text-base font-medium leading-relaxed mb-10 italic max-w-md">
                     "Significant cluster of 403_FORBIDDEN errors detected in DOC_UPLOAD_NODE. Root cause: Expired IAM policy tokens. Auto-renewal script suggested."
                   </p>
                 </div>
                 <button className="w-fit px-10 py-4 bg-white text-emerald-700 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:shadow-2xl transition-all active:scale-[0.98]">
                   EXECUTE_PATCH_V2.1
                 </button>
               </div>
            </div>

            {/* Recent Resolution Timeline */}
            <div className="glass-card p-8 rounded-[2.5rem]">
               <h3 className="text-xs font-black text-white uppercase tracking-widest mb-10 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <BarChart3 size={18} className="text-emerald-500" />
                   Resolution Timeline
                 </div>
                 <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10 italic">SYNC_LIVE</span>
               </h3>
               
               <div className="space-y-6">
                  {timeline.map((log, i) => (
                    <div key={log.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-emerald-500/20 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center font-black text-[10px] text-slate-500 border border-white/5">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-white tracking-widest">{log.node}</p>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{log.id} • {log.time}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${log.status === 'ESCALATED' ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {log.status}
                        </span>
                        <ChevronRight size={14} className="text-slate-700 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  ))}
               </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default AnalyticsPage;
