'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  BarChart2, 
  Building2, 
  Settings,
  Shield
} from 'lucide-react';
import { getMe } from '@/lib/api-client';
import { getRoleLevel, canSeeSidebarItem } from '@/lib/rbac/client';

const Sidebar = () => {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string>('helpdesk');
  const [roleLevel, setRoleLevel] = useState<number>(10);

  const fetchRole = useCallback(async () => {
    try {
      const result = await getMe();
      if (result.success && result.data) {
        const role = (result.data.user as Record<string, unknown>).role as string || 'helpdesk';
        setUserRole(role);
        setRoleLevel(getRoleLevel(role));
      }
    } catch {
      // defaults
    }
  }, []);

  useEffect(() => { fetchRole(); }, [fetchRole]);

  const allMenuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, href: '/admin/dashboard' },
    { name: 'Grievances', icon: <FileText size={20} />, href: '/admin/complaints' },
    { name: 'Analytics', icon: <BarChart2 size={20} />, href: '/admin/analytics' },
    { name: 'Departments', icon: <Building2 size={20} />, href: '/admin/departments' },
    { name: 'Settings', icon: <Settings size={20} />, href: '/admin/settings' },
  ];

  const menuItems = allMenuItems.filter(item => canSeeSidebarItem(roleLevel, item.href));

  return (
    <aside className="w-64 h-screen bg-white border-r border-slate-200 flex flex-col fixed left-0 top-0 z-20 overflow-y-auto" role="complementary" aria-label="Admin sidebar">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-700 rounded-xl flex items-center justify-center shadow-lg shadow-amber-700/20">
             <Shield size={22} className="text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">Samadhan AI</h1>
            <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-widest mt-0.5">State Grievance Services</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 mt-4" aria-label="Admin navigation">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                isActive 
                  ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* System Status */}
      <div className="p-4 mt-auto">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">System Status</p>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">API</span>
            <span className="text-emerald-600 font-semibold">Online</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">AI Engine</span>
            <span className="text-emerald-600 font-semibold">Active</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
