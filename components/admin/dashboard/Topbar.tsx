'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronDown, LogOut, MapPin } from 'lucide-react';
import { getMe, logoutAdmin } from '@/lib/api-client';
import NotificationDropdown from './NotificationDropdown';
import { ROLE_META, type AdminRole } from '@/lib/rbac/client';

const Topbar = () => {
  const router = useRouter();
  const [userName, setUserName] = useState('Admin');
  const [userInitials, setUserInitials] = useState('AD');
  const [userRole, setUserRole] = useState('Administrator');
  const [roleBadgeColor, setRoleBadgeColor] = useState('text-amber-700 bg-amber-50 border-amber-200');
  const [scopeLabel, setScopeLabel] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const result = await getMe();
      if (result.success && result.data) {
        const user = result.data.user;
        const name = (user.name as string) || 'Admin';
        setUserName(name);
        setUserInitials(name.substring(0, 2).toUpperCase());
        const role = (user.role as string) || 'helpdesk';
        const meta = ROLE_META[role as AdminRole];
        if (meta) {
          setUserRole(meta.shortLabel);
          setRoleBadgeColor(meta.badgeColor);
        } else {
          setUserRole('Administrator');
        }
        // Build scope label from locationScope
        const ls = user.locationScope as Record<string, string> | undefined;
        if (ls) {
          const parts: string[] = [];
          if (ls.area) parts.push(ls.area);
          if (ls.block) parts.push(ls.block);
          if (ls.district) parts.push(ls.district);
          if (ls.state) parts.push(ls.state);
          setScopeLabel(parts.slice(0, 2).join(', '));
        }
      }
    } catch {
      // defaults
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const handleLogout = async () => {
    try { await logoutAdmin(); } finally { router.push('/admin/login'); }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Administration Panel</h2>
        <p className="text-xs text-slate-400">Arunachal Pradesh State Grievance Portal</p>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search grievances..." 
            className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all w-64 text-slate-700 placeholder:text-slate-400"
          />
        </div>

        <NotificationDropdown />
        
        <div className="h-6 w-px bg-slate-200"></div>
        
        <div className="relative">
          <div
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-700">{userName}</p>
              <div className="flex items-center gap-1.5 justify-end">
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${roleBadgeColor}`}>
                  {userRole}
                </span>
                {scopeLabel && (
                  <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                    <MapPin size={8} />
                    {scopeLabel}
                  </span>
                )}
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-amber-700 flex items-center justify-center text-white font-bold text-xs">
              {userInitials}
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </div>
          
          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 transition-colors font-medium"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
