'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Bell, ShieldCheck } from 'lucide-react';
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
    <header className="sticky top-0 z-30 border-b border-gov-blue-100 bg-white/90 backdrop-blur-lg">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="w-8 h-8 rounded-lg bg-gov-blue-800 flex items-center justify-center">
            <ShieldCheck size={16} className="text-white" />
          </div>
          <span className="text-sm font-bold text-gov-blue-900">PHE Citizen</span>
        </div>

        {/* Desktop breadcrumb area */}
        <div className="hidden md:block">
          <p className="text-xs text-gov-blue-700 font-semibold uppercase tracking-widest">
            Citizen Portal
          </p>
          <p className="text-[11px] text-slate-500">Water Supply Grievance Dashboard</p>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Link
            href="/citizen/notifications"
            className="relative p-2 rounded-lg text-slate-500 hover:text-gov-blue-800 hover:bg-gov-aqua-50 transition-colors"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-gov-blue-800 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {citizenName && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gov-aqua-50 border border-gov-aqua-200">
              <div className="w-6 h-6 bg-gov-blue-800 text-white rounded-full flex items-center justify-center text-xs font-bold">
                {citizenName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-gov-blue-900 max-w-[120px] truncate">
                {citizenName}
              </span>
            </div>
          )}

          {/* Mobile logout */}
          <button
            onClick={handleLogout}
            className="md:hidden p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default CitizenTopbar;
