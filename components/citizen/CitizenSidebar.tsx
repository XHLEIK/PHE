'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  PlusCircle,
  Search,
  User,
  LogOut,
  ShieldCheck,
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
    <aside className="hidden md:flex w-64 h-screen bg-gradient-to-b from-gov-blue-900 via-gov-blue-800 to-gov-blue-700 text-white border-r border-gov-blue-700/40 flex-col fixed left-0 top-0 z-20 overflow-y-auto" role="complementary" aria-label="Citizen sidebar">
      {/* Branding */}
      <div className="p-6 border-b border-white/15">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center">
            <ShieldCheck size={22} className="text-gov-aqua-100" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white tracking-tight leading-none">Arunachal PHE Portal</h1>
            <p className="text-[10px] font-semibold text-gov-aqua-200 uppercase tracking-widest mt-0.5">
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
                  ? 'bg-white text-gov-blue-800 border border-white/60 shadow-lg'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.3 : 1.8} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-white/15">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-9 h-9 bg-white/15 text-white rounded-full flex items-center justify-center text-sm font-bold">
            {citizenName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{citizenName}</p>
            <p className="text-[11px] text-blue-100/90 truncate">{citizenEmail}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-2 w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-blue-100 hover:bg-red-500/20 hover:text-red-100 transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default CitizenSidebar;
