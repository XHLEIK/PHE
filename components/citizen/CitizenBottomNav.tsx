'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  PlusCircle,
  Search,
  User,
  MessageSquare,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Home', icon: FileText, href: '/citizen/complaints' },
  { name: 'New', icon: PlusCircle, href: '/citizen/complaints/new' },
  { name: 'Chats', icon: MessageSquare, href: '/citizen/chats' },
  { name: 'Track', icon: Search, href: '/citizen/track' },
  { name: 'Profile', icon: User, href: '/citizen/profile' },
];

const CitizenBottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-gov-blue-100 md:hidden safe-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[60px] py-1.5 rounded-lg transition-colors ${
                isActive
                  ? 'text-gov-blue-800 bg-gov-aqua-50'
                  : 'text-slate-500 hover:text-gov-blue-800'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={`text-[10px] font-semibold ${isActive ? 'text-gov-blue-800' : 'text-slate-500'}`}>
                {item.name}
              </span>
              {isActive && (
                <div className="absolute bottom-1 w-5 h-0.5 bg-gov-blue-800 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default CitizenBottomNav;
