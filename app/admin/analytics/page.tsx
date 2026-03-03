'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/admin/dashboard/Sidebar';
import Topbar from '@/components/admin/dashboard/Topbar';
import { getDashboardStats, getMe } from '@/lib/api-client';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  CheckCircle2,
  Clock,
  BrainCircuit,
  AlertTriangle,
  FileText,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

interface OverviewData {
  total: number;
  pending: number;
  triage: number;
  inProgress: number;
  resolved: number;
  closed: number;
  escalated: number;
  deferred: number;
  recentLast24h: number;
  resolutionRate: string;
}

interface DeptStat {
  id: string;
  label: string;
  total: number;
  pending: number;
  resolved: number;
  deferred: number;
}

interface AnalysisData {
  queued: number;
  processing: number;
  completed: number;
  deferred: number;
}

interface Priorities {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

const PIE_COLORS = ['#b45309', '#3b82f6', '#10b981', '#6366f1', '#f43f5e', '#eab308'];
const BAR_COLORS = ['#b45309', '#d97706', '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7'];

const AnalyticsPage = () => {
  const router = useRouter();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [depts, setDepts] = useState<DeptStat[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [priorities, setPriorities] = useState<Priorities | null>(null);
  const [loading, setLoading] = useState(true);
  const [animated, setAnimated] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      // Check role first
      const meResult = await getMe();
      if (meResult.success && meResult.data) {
        const role = (meResult.data.user as Record<string, unknown>).role as string;
        if (role === 'staff') {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
      }

      const result = await getDashboardStats();
      if (result.success && result.data) {
        setOverview(result.data.overview as unknown as OverviewData);
        setDepts((result.data.departments || []) as unknown as DeptStat[]);
        setAnalysis(result.data.analysis as unknown as AnalysisData);
        setPriorities(result.data.priorities as unknown as Priorities);
      }
    } catch {
      // Stats unavailable
    } finally {
      setLoading(false);
      // Trigger animation after data loads
      setTimeout(() => setAnimated(true), 100);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  // Status pie data
  const statusData = overview ? [
    { label: 'Pending', value: overview.pending, color: PIE_COLORS[0] },
    { label: 'In Progress', value: overview.inProgress + overview.triage, color: PIE_COLORS[1] },
    { label: 'Resolved', value: overview.resolved, color: PIE_COLORS[2] },
    { label: 'Closed', value: overview.closed, color: PIE_COLORS[3] },
    { label: 'Escalated', value: overview.escalated, color: PIE_COLORS[4] },
    { label: 'Deferred', value: overview.deferred, color: PIE_COLORS[5] },
  ].filter(s => s.value > 0) : [];

  const statusTotal = statusData.reduce((s, d) => s + d.value, 0);

  // Compute pie chart offsets
  let cumulativePercent = 0;
  const pieSlices = statusData.map(s => {
    const percent = statusTotal > 0 ? s.value / statusTotal : 0;
    const startAngle = cumulativePercent * 360;
    cumulativePercent += percent;
    return { ...s, percent, startAngle };
  });

  // Department bar chart — top 10 sorted by total
  const topDepts = [...depts].sort((a, b) => b.total - a.total).slice(0, 10);
  const maxDeptCount = topDepts.length > 0 ? Math.max(...topDepts.map(d => d.total)) : 1;

  // Priority data
  const priorityData = priorities ? [
    { label: 'Critical', value: priorities.critical, color: 'bg-rose-500' },
    { label: 'High', value: priorities.high, color: 'bg-amber-500' },
    { label: 'Medium', value: priorities.medium, color: 'bg-blue-500' },
    { label: 'Low', value: priorities.low, color: 'bg-emerald-500' },
  ] : [];

  const totalPriority = priorityData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="min-h-screen bg-[#faf7f0] flex font-sans">
      <Sidebar />
      
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen overflow-x-hidden">
        <Topbar />
        
        <main className="p-6 md:p-8 space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
            <p className="text-sm text-slate-500 mt-1">Real-time grievance analytics and performance metrics</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-amber-700" />
            </div>
          ) : accessDenied ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <ShieldAlert size={48} className="text-rose-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-slate-800 mb-2">Access Restricted</h2>
              <p className="text-sm text-slate-500 mb-4">Analytics is only available to Head Administrators and Department Admins.</p>
              <button onClick={() => router.push('/admin/dashboard')} className="text-sm text-amber-700 hover:underline">← Back to Dashboard</button>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Total', value: overview?.total ?? 0, icon: FileText, color: 'text-amber-700', bg: 'bg-amber-100' },
                  { label: 'Pending', value: overview?.pending ?? 0, icon: Clock, color: 'text-blue-700', bg: 'bg-blue-100' },
                  { label: 'Resolved', value: overview?.resolved ?? 0, icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-100' },
                  { label: 'Escalated', value: overview?.escalated ?? 0, icon: AlertTriangle, color: 'text-rose-700', bg: 'bg-rose-100' },
                  { label: 'Deferred', value: overview?.deferred ?? 0, icon: BrainCircuit, color: 'text-amber-700', bg: 'bg-amber-100' },
                  { label: 'Last 24h', value: overview?.recentLast24h ?? 0, icon: TrendingUp, color: 'text-purple-700', bg: 'bg-purple-100' },
                ].map(card => (
                  <div key={card.label} className="bg-white border border-slate-200 p-4 rounded-xl">
                    <div className={`p-1.5 rounded-lg ${card.bg} w-fit mb-2`}>
                      <card.icon size={14} className={card.color} />
                    </div>
                    <p className="text-xs text-slate-500">{card.label}</p>
                    <h3 className="text-xl font-bold text-slate-900">{card.value}</h3>
                  </div>
                ))}
              </div>

              {/* Resolution Rate Banner */}
              <div className="bg-amber-700 text-white p-6 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-amber-100">Overall Resolution Rate</p>
                    <h3 className="text-3xl font-bold">{overview?.resolutionRate || '0%'}</h3>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-amber-100">AI Completion</p>
                  <h3 className="text-2xl font-bold">
                    {analysis ? Math.round(((analysis.completed) / Math.max(analysis.completed + analysis.deferred + analysis.queued + analysis.processing, 1)) * 100) : 0}%
                  </h3>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Status Pie Chart */}
                <div className="bg-white border border-slate-200 p-6 rounded-xl">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-6">
                    <PieChart size={16} className="text-blue-600" />
                    Complaint Status Distribution
                  </h3>
                  
                  {statusTotal === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">No data available</div>
                  ) : (
                    <div className="flex items-center gap-8">
                      <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
                        <svg width="180" height="180" viewBox="0 0 100 100" className="transform -rotate-90">
                          {pieSlices.map((slice, i) => {
                            const circumference = 2 * Math.PI * 38;
                            const dashLen = slice.percent * circumference;
                            const dashOffset = -(pieSlices.slice(0, i).reduce((s, p) => s + p.percent, 0)) * circumference;
                            return (
                              <circle
                                key={slice.label}
                                cx="50" cy="50" r="38"
                                fill="transparent"
                                stroke={slice.color}
                                strokeWidth="12"
                                strokeDasharray={`${animated ? dashLen : 0} ${circumference}`}
                                strokeDashoffset={dashOffset}
                                style={{ transition: 'stroke-dasharray 1s ease-out' }}
                              />
                            );
                          })}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <p className="text-2xl font-bold text-slate-900">{statusTotal}</p>
                          <p className="text-[10px] text-slate-400">Total</p>
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        {pieSlices.map(s => (
                          <div key={s.label} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }}></div>
                              <span className="text-xs text-slate-600">{s.label}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-semibold text-slate-900">{s.value}</span>
                              <span className="text-[10px] text-slate-400 ml-1">({Math.round(s.percent * 100)}%)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Priority Distribution */}
                <div className="bg-white border border-slate-200 p-6 rounded-xl">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-6">
                    <AlertTriangle size={16} className="text-amber-700" />
                    Priority Distribution
                  </h3>
                  
                  {totalPriority === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">No data available</div>
                  ) : (
                    <div className="space-y-4">
                      {priorityData.map(p => {
                        const pct = totalPriority > 0 ? Math.round((p.value / totalPriority) * 100) : 0;
                        return (
                          <div key={p.label}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-sm text-slate-700 font-medium">{p.label}</span>
                              <span className="text-sm font-semibold text-slate-900">{p.value} <span className="text-xs text-slate-400">({pct}%)</span></span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${p.color} rounded-full transition-all duration-1000 ease-out`}
                                style={{ width: animated ? `${pct}%` : '0%' }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* AI Analysis Stats */}
                  {analysis && (
                    <div className="mt-6 pt-6 border-t border-slate-100">
                      <h4 className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1">
                        <BrainCircuit size={12} /> AI Analysis Status
                      </h4>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: 'Completed', value: analysis.completed, color: 'text-emerald-700' },
                          { label: 'Queued', value: analysis.queued, color: 'text-blue-700' },
                          { label: 'Processing', value: analysis.processing, color: 'text-amber-700' },
                          { label: 'Deferred', value: analysis.deferred, color: 'text-rose-700' },
                        ].map(a => (
                          <div key={a.label} className="text-center">
                            <p className={`text-lg font-bold ${a.color}`}>{a.value}</p>
                            <p className="text-[10px] text-slate-400">{a.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Department Bar Chart — Full Width */}
              <div className="bg-white border border-slate-200 p-6 rounded-xl">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-6">
                  <BarChart3 size={16} className="text-amber-700" />
                  Complaints by Department
                  <span className="text-xs text-slate-400 font-normal ml-2">(Top {topDepts.length})</span>
                </h3>
                
                {topDepts.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">No department data available</div>
                ) : (
                  <div className="space-y-3">
                    {topDepts.map((dept, i) => {
                      const pct = maxDeptCount > 0 ? (dept.total / maxDeptCount) * 100 : 0;
                      const resolvedPct = dept.total > 0 ? (dept.resolved / dept.total) * 100 : 0;
                      return (
                        <div key={dept.id} className="group">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] text-slate-400 w-5 text-right shrink-0">#{i + 1}</span>
                              <span className="text-sm text-slate-700 truncate">{dept.label || dept.id}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-2">
                              <span className="text-xs text-slate-400">{dept.resolved} resolved</span>
                              <span className="text-sm font-semibold text-slate-900">{dept.total}</span>
                            </div>
                          </div>
                          <div className="h-6 w-full bg-slate-50 rounded-lg overflow-hidden relative">
                            <div
                              className="h-full bg-amber-200 rounded-lg transition-all duration-1000 ease-out relative"
                              style={{ width: animated ? `${pct}%` : '0%' }}
                            >
                              <div
                                className="absolute top-0 left-0 h-full bg-amber-500 rounded-lg transition-all duration-1000 ease-out"
                                style={{ width: `${resolvedPct}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-400">
                      <div className="flex items-center gap-1.5"><div className="w-3 h-2 bg-amber-500 rounded-sm"></div> Resolved</div>
                      <div className="flex items-center gap-1.5"><div className="w-3 h-2 bg-amber-200 rounded-sm"></div> Total</div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default AnalyticsPage;
