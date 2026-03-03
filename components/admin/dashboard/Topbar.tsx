'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Globe, ChevronDown, Bell, Terminal, LogOut } from 'lucide-react';
import { getMe, logoutAdmin } from '@/lib/api-client';

const Topbar = () => {
  const router = useRouter();
  const [userName, setUserName] = useState('Admin');
  const [userInitials, setUserInitials] = useState('AD');
  const [securityLevel, setSecurityLevel] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const result = await getMe();
      if (result.success && result.data) {
        const user = result.data.user;
        const name = (user.name as string) || 'Admin';
        setUserName(name);
        setUserInitials(name.substring(0, 2).toUpperCase());
        setSecurityLevel((user.securityLevel as number) || 0);
      }
    } catch {
      // Silently fail — user display will show defaults
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const handleLogout = async () => {
    try {
      await logoutAdmin();
    } finally {
      router.push('/admin/login');
    }
  };

  return (
    <header className="h-20 bg-[#0F172A]/80 backdrop-blur-md border-b border-white/5 px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
           <Terminal size={16} className="text-emerald-500" />
        </div>
        <div>
          <h2 className="text-sm font-black text-white tracking-widest uppercase">ROOT_ADMIN_TERMINAL</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-0.5 italic">Session Active: ARUNACHAL_PRADESH_SECURE_NODE</p>
        </div>
      </div>
      
      <div className="flex items-center gap-8">
        <div className="relative group hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-500 transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Search kernel logs..." 
            className="pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all w-64 text-emerald-100 placeholder:text-slate-700"
          />
        </div>

        <div className="flex items-center gap-5">
          <button className="p-2 text-slate-500 hover:text-white transition-colors">
            <Globe size={18} />
          </button>
          
          <button className="p-2 text-slate-500 hover:text-emerald-500 transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 border-2 border-[#0F172A] rounded-full"></span>
          </button>
          
          <div className="h-6 w-px bg-white/5"></div>
          
          <div className="relative">
            <div
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="text-right">
                <p className="text-[11px] font-black text-white tracking-tight group-hover:text-emerald-500 transition-colors">{userName}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Security Level {securityLevel}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-[10px] shadow-lg shadow-emerald-500/20 border border-white/10 ring-2 ring-emerald-500/20">
                {userInitials}
              </div>
              <ChevronDown size={14} className="text-slate-600 group-hover:text-white transition-colors" />
            </div>
            
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors font-bold"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
