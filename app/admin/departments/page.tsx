'use client';

import React from 'react';
import Sidebar from '@/components/admin/dashboard/Sidebar';
import Topbar from '@/components/admin/dashboard/Topbar';
import { CreditCard, FileUp, Cpu, Scale, Activity, Timer, ArrowRight, Server } from 'lucide-react';

const DepartmentsPage = () => {
  const departments = [
    {
      name: 'Payment Gateway',
      role: 'Transaction Integrity',
      workload: 85,
      avgResponse: '0.4s',
      status: 'High Traffic',
      icon: CreditCard,
      color: 'emerald'
    },
    {
      name: 'Digital Documentation',
      role: 'Upload & Verification',
      workload: 62,
      avgResponse: '2.1s',
      status: 'Stable',
      icon: FileUp,
      color: 'blue'
    },
    {
      name: 'Portal Infrastructure',
      role: 'Server & Latency',
      workload: 34,
      avgResponse: '12ms',
      status: 'Optimal',
      icon: Cpu,
      color: 'purple'
    },
    {
      name: 'RTI & Legal Compliance',
      role: 'Information Requests',
      workload: 92,
      avgResponse: '4.5h',
      status: 'Critical',
      icon: Scale,
      color: 'rose'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0F172A] flex font-sans">
      <Sidebar />
      
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen overflow-x-hidden">
        <Topbar />
        
        <main className="p-6 md:p-10 space-y-10">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Server size={20} className="text-emerald-500" />
                <h1 className="text-3xl font-black text-white tracking-tight uppercase italic">Nodes_Cluster</h1>
              </div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">Operational Infrastructure Hierarchy</p>
            </div>
            
            <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-2xl border border-white/5 backdrop-blur-sm">
               <div className="px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">Global Node: ONLINE</span>
               </div>
               <button className="px-4 py-2 bg-white text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all">
                 System_Reboot
               </button>
            </div>
          </div>

          {/* Department Grid */}
          <div className="grid grid-cols-1 gap-6">
            {departments.map((dept) => (
              <div key={dept.name} className="glass-card p-8 rounded-[2.5rem] group hover:border-emerald-500/30 transition-all duration-500 relative overflow-hidden">
                {/* Background Accent */}
                <div className={`absolute top-0 left-0 w-1 h-full bg-${dept.color}-500 opacity-50 shadow-[0_0_20px_rgba(16,185,129,0.5)]`}></div>
                
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-center">
                  
                  {/* Column 1: Info (3/12) */}
                  <div className="xl:col-span-3 flex items-center gap-5">
                    <div className="w-16 h-16 bg-slate-950 rounded-[1.25rem] flex items-center justify-center text-emerald-500 border border-white/5 shadow-inner group-hover:scale-110 transition-transform duration-500">
                      <dept.icon size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white tracking-tight group-hover:text-emerald-400 transition-colors">{dept.name}</h3>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{dept.role}</p>
                    </div>
                  </div>

                  {/* Column 2: Workload (4/12) */}
                  <div className="xl:col-span-4 space-y-3 px-0 xl:px-8 border-l border-white/5">
                    <div className="flex justify-between items-end">
                       <div className="flex items-center gap-2 text-slate-500">
                         <Activity size={14} />
                         <span className="text-[10px] font-black uppercase tracking-widest">Load Factor</span>
                       </div>
                       <span className="text-sm font-black text-emerald-400 tabular-nums">{dept.workload}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
                       <div 
                         className={`h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all duration-[1.5s] ease-out`} 
                         style={{ width: `${dept.workload}%` }}
                       ></div>
                    </div>
                  </div>

                  {/* Column 3: Metrics (2/12) */}
                  <div className="xl:col-span-2 flex flex-col items-center justify-center border-l border-white/5 px-4 text-center">
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                       <Timer size={14} />
                       <span className="text-[9px] font-black uppercase tracking-widest">Latency</span>
                    </div>
                    <p className="text-2xl font-black text-white tracking-tighter italic">{dept.avgResponse}</p>
                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] mt-1 ${
                      dept.status === 'Critical' ? 'text-rose-500 animate-pulse' : 'text-emerald-500'
                    }`}>{dept.status}</span>
                  </div>

                  {/* Column 4: Actions (3/12) - FIXED POSITIONING */}
                  <div className="xl:col-span-3 flex flex-row xl:flex-col gap-3 justify-end">
                    <button className="flex-1 xl:w-full bg-emerald-600 text-white font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-2xl hover:bg-emerald-500 shadow-xl shadow-emerald-900/20 transition-all active:scale-[0.98] border border-white/10">
                      Launch_Terminal
                    </button>
                    <button className="flex-1 xl:w-full bg-slate-950 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-2xl border border-white/5 hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2">
                      Full_Diagnostics
                      <ArrowRight size={14} />
                    </button>
                  </div>

                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DepartmentsPage;
