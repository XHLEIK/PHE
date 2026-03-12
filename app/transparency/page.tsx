'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3, PieChart, TrendingUp, CheckCircle2, Clock,
  AlertTriangle, Building2, Shield, ArrowLeft, Loader2,
  FileText, Users,
} from 'lucide-react';

interface PublicStats {
  overview: {
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    closed: number;
    escalated: number;
    resolutionRate: string;
    last7Days: number;
  };
  departments: Array<{ name: string; count: number }>;
  priorities: Record<string, number>;
  generatedAt: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-green-500',
};

export default function TransparencyPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/public/stats');
        const data = await res.json();
        if (data.success) setStats(data.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf7f0] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-amber-700" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-[#faf7f0] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={40} className="mx-auto text-slate-400 mb-3" />
          <p className="text-slate-600">Statistics are temporarily unavailable.</p>
          <Link href="/" className="text-amber-700 text-sm hover:underline mt-2 inline-block">← Back to Home</Link>
        </div>
      </div>
    );
  }

  const totalPriority = Object.values(stats.priorities).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="min-h-screen bg-[#faf7f0]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-700 rounded-lg flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold text-slate-900">Samadhan AI</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/complaint" className="text-xs font-medium text-slate-600 hover:text-amber-700 transition-colors">
              Submit Complaint
            </Link>
            <Link href="/citizen/login" className="text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors">
              Citizen Login
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-8">
        {/* Title */}
        <div>
          <Link href="/" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mb-3 transition-colors">
            <ArrowLeft size={12} /> Back to Home
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <BarChart3 size={28} className="text-amber-700" />
            Transparency Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time public statistics on grievance resolution across all departments.
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Last updated: {new Date(stats.generatedAt).toLocaleString('en-IN')}
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Grievances', value: stats.overview.total, icon: FileText, color: 'text-slate-700', bg: 'bg-slate-100' },
            { label: 'Pending Review', value: stats.overview.pending, icon: Clock, color: 'text-amber-700', bg: 'bg-amber-100' },
            { label: 'In Progress', value: stats.overview.inProgress, icon: TrendingUp, color: 'text-blue-700', bg: 'bg-blue-100' },
            { label: 'Resolved', value: stats.overview.resolved, icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-100' },
            { label: 'Closed', value: stats.overview.closed, icon: CheckCircle2, color: 'text-slate-500', bg: 'bg-slate-100' },
            { label: 'Escalated', value: stats.overview.escalated, icon: AlertTriangle, color: 'text-rose-700', bg: 'bg-rose-100' },
            { label: 'Resolution Rate', value: stats.overview.resolutionRate, icon: PieChart, color: 'text-indigo-700', bg: 'bg-indigo-100' },
            { label: 'Last 7 Days', value: stats.overview.last7Days, icon: Users, color: 'text-teal-700', bg: 'bg-teal-100' },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 ${card.bg} rounded-lg flex items-center justify-center`}>
                  <card.icon size={16} className={card.color} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Department Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Building2 size={18} className="text-amber-700" />
            Grievances by Department
          </h2>
          <div className="space-y-3">
            {stats.departments.map((dept) => {
              const pct = stats.overview.total > 0 ? (dept.count / stats.overview.total * 100) : 0;
              return (
                <div key={dept.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-700 font-medium">{dept.name}</span>
                    <span className="text-slate-400 text-xs">{dept.count} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-amber-600 rounded-full h-2 transition-all duration-500"
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {stats.departments.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No department data available yet.</p>
            )}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
            <PieChart size={18} className="text-amber-700" />
            Priority Distribution
          </h2>
          <div className="flex flex-wrap gap-6">
            {(['critical', 'high', 'medium', 'low'] as const).map((p) => {
              const count = stats.priorities[p] || 0;
              const pct = (count / totalPriority * 100).toFixed(1);
              return (
                <div key={p} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${PRIORITY_COLORS[p]}`} />
                  <div>
                    <p className="text-sm font-semibold text-slate-700 capitalize">{p}</p>
                    <p className="text-xs text-slate-400">{count} ({pct}%)</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer note */}
        <div className="text-center py-4">
          <p className="text-xs text-slate-400">
            This data is generated in real-time. No personal information is displayed.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Have a grievance?{' '}
            <Link href="/complaint" className="text-amber-700 hover:underline font-medium">
              Submit it here
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
