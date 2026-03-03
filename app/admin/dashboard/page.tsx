'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/admin/dashboard/Sidebar';
import Topbar from '@/components/admin/dashboard/Topbar';
import RealTimeComplaints from '@/components/admin/dashboard/RealTimeComplaints';
import { getDashboardStats } from '@/lib/api-client';
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

interface StatDisplay {
  title: string;
  value: string;
  change: string;
  icon: React.ElementType;
  color: string;
}

const colorMap: Record<string, { text: string; iconBg: string }> = {
  amber: { text: 'text-amber-700', iconBg: 'bg-amber-100' },
  rose: { text: 'text-rose-700', iconBg: 'bg-rose-100' },
  emerald: { text: 'text-emerald-700', iconBg: 'bg-emerald-100' },
  blue: { text: 'text-blue-700', iconBg: 'bg-blue-100' },
};

const AdminDashboard = () => {
  const [stats, setStats] = useState<StatDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const result = await getDashboardStats();
      if (result.success && result.data) {
        const overview = result.data.overview as Record<string, number>;
        setStats([
          { title: 'Total Grievances', value: String(overview.total ?? 0), change: `${overview.last24h ?? 0} today`, icon: FileText, color: 'amber' },
          { title: 'High Priority', value: String((result.data.priorities?.critical ?? 0) + (result.data.priorities?.high ?? 0)), change: 'Needs attention', icon: AlertTriangle, color: 'rose' },
          { title: 'Resolved', value: String(overview.resolved ?? 0), change: `${overview.resolutionRate ?? 0}% rate`, icon: CheckCircle2, color: 'emerald' },
          { title: 'In Progress', value: String(overview.inProgress ?? overview.triage ?? 0), change: 'Being handled', icon: TrendingUp, color: 'blue' },
        ]);
      } else {
        setStats([
          { title: 'Total Grievances', value: '0', change: 'No data', icon: FileText, color: 'amber' },
          { title: 'High Priority', value: '0', change: 'No data', icon: AlertTriangle, color: 'rose' },
          { title: 'Resolved', value: '0', change: '0% rate', icon: CheckCircle2, color: 'emerald' },
          { title: 'In Progress', value: '0', change: 'No data', icon: TrendingUp, color: 'blue' },
        ]);
      }
    } catch {
      setStats([
        { title: 'Total Grievances', value: '—', change: 'Error', icon: FileText, color: 'amber' },
        { title: 'High Priority', value: '—', change: 'Error', icon: AlertTriangle, color: 'rose' },
        { title: 'Resolved', value: '—', change: 'Error', icon: CheckCircle2, color: 'emerald' },
        { title: 'In Progress', value: '—', change: 'Error', icon: TrendingUp, color: 'blue' },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  return (
    <div className="min-h-screen bg-[#faf7f0] flex font-sans">
      <Sidebar />
      
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen overflow-x-hidden">
        <Topbar />
        
        <main className="p-6 md:p-8 space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Grievance Overview</h1>
            <p className="text-sm text-slate-500 mt-1">Monitor and manage citizen grievances across Arunachal Pradesh</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white border border-slate-200 p-5 rounded-xl animate-pulse h-28" />
              ))
            ) : (
              stats.map((stat) => {
                const colors = colorMap[stat.color] || colorMap.amber;
                const Icon = stat.icon;
                return (
                  <div key={stat.title} className="bg-white border border-slate-200 p-5 rounded-xl hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2 rounded-lg ${colors.iconBg}`}>
                        <Icon size={18} className={colors.text} />
                      </div>
                      <span className={`text-xs font-medium ${colors.text}`}>{stat.change}</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-1">{stat.title}</p>
                    <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
                  </div>
                );
              })
            )}
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2">
              <RealTimeComplaints />
            </div>

            <div className="space-y-4">
              {/* Quick Actions */}
              <div className="bg-white border border-slate-200 p-5 rounded-xl">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <Link href="/admin/complaints" className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-amber-50 transition-colors group">
                    <span className="text-sm text-slate-600 group-hover:text-amber-800">View All Grievances</span>
                    <ArrowRight size={16} className="text-slate-400 group-hover:text-amber-700" />
                  </Link>
                  <Link href="/admin/analytics" className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-amber-50 transition-colors group">
                    <span className="text-sm text-slate-600 group-hover:text-amber-800">View Analytics</span>
                    <ArrowRight size={16} className="text-slate-400 group-hover:text-amber-700" />
                  </Link>
                  <Link href="/admin/departments" className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-amber-50 transition-colors group">
                    <span className="text-sm text-slate-600 group-hover:text-amber-800">Manage Departments</span>
                    <ArrowRight size={16} className="text-slate-400 group-hover:text-amber-700" />
                  </Link>
                </div>
              </div>

              {/* AI Status */}
              <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl">
                <h3 className="text-sm font-semibold text-amber-800 mb-2">Samadhan AI Engine</h3>
                <p className="text-xs text-amber-700 mb-3">Auto-classification and priority assignment active</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-emerald-700">Online & Processing</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
