'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Bell, Shield } from 'lucide-react';
import { getCitizenMe, logoutCitizen, getCitizenUnreadCount } from '@/lib/citizen-api-client';

const CitizenTopbar = () => {
  const router = useRouter();
  const [citizenName, setCitizenName] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchProfile = useCallback(async () => {
    try {
      const result = await getCitizenMe();
      if (result.success && result.data) {
        setCitizenName((result.data.citizen.name as string) || 'Citizen');
      }
    } catch { /* defaults */ }
  }, []);

  const fetchUnread = useCallback(async () => {
    try {
      const result = await getCitizenUnreadCount();
      if (result.success && result.data) {
        setUnreadCount(result.data.unreadCount);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchUnread();
    // Poll unread count every 30 seconds
    const interval = setInterval(fetchUnread, 30_000);
    return () => clearInterval(interval);
  }, [fetchProfile, fetchUnread]);

  const handleLogout = async () => {
    try { await logoutCitizen(); } catch { /* ignore */ }
    router.push('/citizen/login');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200">
      <div className="flex items-center justify-between h-14 px-4 md:px-6">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="w-8 h-8 bg-amber-700 rounded-lg flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <span className="text-sm font-bold text-slate-900">Samadhan AI</span>
        </div>

        {/* Desktop breadcrumb area */}
        <div className="hidden md:block">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">
            Citizen Portal
          </p>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Link
            href="/citizen/notifications"
            className="relative p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {citizenName && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-100">
              <div className="w-6 h-6 bg-amber-700 text-white rounded-full flex items-center justify-center text-xs font-bold">
                {citizenName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-amber-800 max-w-[120px] truncate">
                {citizenName}
              </span>
            </div>
          )}

          {/* Mobile logout */}
          <button
            onClick={handleLogout}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default CitizenTopbar;
