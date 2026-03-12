'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  PlusCircle,
  Search,
  User,
  LogOut,
  Shield,
  FileText,
  Bell,
  MessageSquare,
} from 'lucide-react';
import { getCitizenMe, logoutCitizen } from '@/lib/citizen-api-client';

const NAV_ITEMS = [
  { name: 'My Grievances', icon: FileText, href: '/citizen/complaints' },
  { name: 'New Complaint', icon: PlusCircle, href: '/citizen/complaints/new' },
  { name: 'AI Chats', icon: MessageSquare, href: '/citizen/chats' },
  { name: 'Notifications', icon: Bell, href: '/citizen/notifications' },
  { name: 'Track Complaint', icon: Search, href: '/citizen/track' },
  { name: 'Profile', icon: User, href: '/citizen/profile' },
];

const CitizenSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [citizenName, setCitizenName] = useState('Citizen');
  const [citizenEmail, setCitizenEmail] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      const result = await getCitizenMe();
      if (result.success && result.data) {
        const c = result.data.citizen;
        setCitizenName((c.name as string) || 'Citizen');
        setCitizenEmail((c.email as string) || '');
      }
    } catch {
      // defaults
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleLogout = async () => {
    try {
      await logoutCitizen();
    } catch { /* ignore */ }
    router.push('/citizen/login');
  };

  return (
    <aside className="hidden md:flex w-64 h-screen bg-white border-r border-slate-200 flex-col fixed left-0 top-0 z-20 overflow-y-auto" role="complementary" aria-label="Citizen sidebar">
      {/* Branding */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-700 rounded-xl flex items-center justify-center shadow-lg shadow-amber-700/20">
            <Shield size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">Samadhan AI</h1>
            <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-widest mt-0.5">
              Citizen Portal
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 mt-4" aria-label="Citizen navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.3 : 1.8} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-9 h-9 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-sm font-bold">
            {citizenName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{citizenName}</p>
            <p className="text-[11px] text-slate-400 truncate">{citizenEmail}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-2 w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default CitizenSidebar;
