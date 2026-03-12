'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/admin/dashboard/Sidebar';
import Topbar from '@/components/admin/dashboard/Topbar';
import { getDepartmentStats } from '@/lib/api-client';
import { DEPARTMENTS } from '@/lib/constants';
import { Building2, Clock, AlertTriangle, Users, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import DepartmentEditModal from '@/components/admin/DepartmentEditModal';

interface DeptStat {
  id: string;
  label: string;
  description: string;
  sla_days: number;
  escalation_level: number;
  active: boolean;
  totalGrievances: number;
  resolvedGrievances: number;
  pendingGrievances: number;
  assignedAdmins: number;
  subcategories?: string[];
}

const fallbackDepts = (): DeptStat[] =>
  DEPARTMENTS.filter(d => d.active).map(d => ({
    ...d,
    totalGrievances: 0,
    resolvedGrievances: 0,
    pendingGrievances: 0,
    assignedAdmins: 0,
  }));

const DepartmentsPage = () => {
  const [departments, setDepartments] = useState<DeptStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<DeptStat | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const result = await getDepartmentStats();
      if (result.success && result.data && result.data.length > 0) {
        // Merge subcategories from constants
        const deptMap = new Map(DEPARTMENTS.map(d => [d.id, d]));
        const merged = result.data.map(d => ({
          ...d,
          subcategories: deptMap.get(d.id)?.subcategories || [],
        }));
        setDepartments(merged);
      } else {
        // DB not seeded — fallback to constants
        setDepartments(fallbackDepts());
      }
    } catch {
      setDepartments(fallbackDepts());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const activeDepts = departments.filter(d => d.active);
  const totalGrievances = activeDepts.reduce((s, d) => s + d.totalGrievances, 0);
  const totalAdmins = activeDepts.reduce((s, d) => s + d.assignedAdmins, 0);

  return (
    <div className="min-h-screen bg-[#faf7f0] flex font-sans">
      <Sidebar />
      
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen overflow-x-hidden">
        <Topbar />
        
        <main className="p-6 md:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Departments</h1>
              <p className="text-sm text-slate-500 mt-1">{activeDepts.length} state departments registered</p>
            </div>
            {!loading && (
              <div className="flex gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><FileText size={12} /> {totalGrievances} total grievances</span>
                <span className="flex items-center gap-1"><Users size={12} /> {totalAdmins} admins assigned</span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-amber-700" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeDepts.map(dept => {
                const resRate = dept.totalGrievances > 0 ? Math.round((dept.resolvedGrievances / dept.totalGrievances) * 100) : 0;
                return (
                  <div key={dept.id} onClick={() => setSelectedDept(dept)} className="bg-white border border-slate-200 p-5 rounded-xl hover:shadow-sm hover:border-amber-300 transition-all group cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 bg-amber-50 rounded-lg">
                        <Building2 size={18} className="text-amber-700" />
                      </div>
                      <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Active</span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-1 group-hover:text-amber-800 transition-colors">{dept.label}</h3>
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">{dept.description}</p>
                    
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-2 mb-3 p-2.5 bg-slate-50 rounded-lg">
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-900">{dept.totalGrievances}</p>
                        <p className="text-[10px] text-slate-400">Grievances</p>
                      </div>
                      <div className="text-center border-x border-slate-200">
                        <p className="text-sm font-bold text-emerald-700">{dept.resolvedGrievances}</p>
                        <p className="text-[10px] text-slate-400">Resolved</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-amber-700">{dept.pendingGrievances}</p>
                        <p className="text-[10px] text-slate-400">Pending</p>
                      </div>
                    </div>

                    {/* Admin & SLA Row */}
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                      <span className="flex items-center gap-1">
                        <Users size={12} className={dept.assignedAdmins === 0 ? 'text-rose-500' : ''} />
                        <span className={dept.assignedAdmins === 0 ? 'text-rose-600 font-medium' : ''}>
                          {dept.assignedAdmins === 0 ? '⚠ No Admin' : `${dept.assignedAdmins} admin${dept.assignedAdmins > 1 ? 's' : ''}`}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        SLA: {dept.sla_days}d
                      </span>
                      <span className="flex items-center gap-1">
                        <AlertTriangle size={12} />
                        L{dept.escalation_level}
                      </span>
                    </div>

                    {/* Resolution Progress */}
                    {dept.totalGrievances > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="text-slate-400 flex items-center gap-1"><CheckCircle2 size={10} /> Resolution</span>
                          <span className="font-semibold text-slate-600">{resRate}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${resRate}%` }}></div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1">
                      {(dept.subcategories || []).slice(0, 3).map(sub => (
                        <span key={sub} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{sub}</span>
                      ))}
                      {(dept.subcategories || []).length > 3 && (
                        <span className="text-[10px] text-slate-400">+{(dept.subcategories || []).length - 3} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {selectedDept && (
        <DepartmentEditModal
          department={selectedDept}
          onClose={() => setSelectedDept(null)}
          onSave={async () => { setSelectedDept(null); await fetchStats(); }}
        />
      )}
    </div>
  );
};

export default DepartmentsPage;
