'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  BarChart2, 
  Building2, 
  Settings,
  CircleDot,
  ShieldCheck
} from 'lucide-react';

const Sidebar = () => {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, href: '/admin/dashboard' },
    { name: 'IT Complaints', icon: <FileText size={20} />, href: '/admin/complaints' },
    { name: 'Exam Analytics', icon: <BarChart2 size={20} />, href: '/admin/analytics' },
    { name: 'IT Departments', icon: <Building2 size={20} />, href: '/admin/departments' },
    { name: 'Control Panel', icon: <Settings size={20} />, href: '/admin/settings' },
  ];

  return (
    <aside className="w-64 h-screen bg-[#020617] border-r border-white/5 flex flex-col fixed left-0 top-0 z-20 overflow-y-auto">
      <div className="p-8 border-b border-white/5 bg-[#020617]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
             <ShieldCheck size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight leading-none italic">SAMADHAN</h1>
            <p className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest mt-1">Smart IT Governance</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1.5 mt-6">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${
                isActive 
                  ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/10' 
                  : 'text-slate-500 hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* System Status Box */}
      <div className="p-4 mt-auto">
        <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 space-y-3 backdrop-blur-md">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
            <CircleDot size={10} className="text-emerald-500 animate-pulse" />
            Core Infrastructure
          </p>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-[11px] font-bold">
              <span className="text-slate-400">Database</span>
              <span className="text-emerald-500 uppercase tracking-tighter">SECURED</span>
            </div>
            <div className="flex justify-between items-center text-[11px] font-bold">
              <span className="text-slate-400">Samadhan AI</span>
              <span className="text-emerald-500 uppercase tracking-tighter">READY</span>
            </div>
            <div className="flex justify-between items-center text-[11px] font-bold">
              <span className="text-slate-400">Latency</span>
              <span className="text-emerald-500 uppercase tracking-tighter">42ms</span>
            </div>
            
            <div className="pt-2">
               <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                 <span>System Health</span>
                 <span>98%</span>
               </div>
               <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                 <div className="h-full bg-emerald-500 rounded-full" style={{ width: '98%' }}></div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
