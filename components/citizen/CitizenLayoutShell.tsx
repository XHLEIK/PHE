'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import CitizenSidebar from '@/components/citizen/CitizenSidebar';
import CitizenTopbar from '@/components/citizen/CitizenTopbar';
import CitizenBottomNav from '@/components/citizen/CitizenBottomNav';
import Breadcrumbs from '@/components/Breadcrumbs';

/** Pages that should render WITHOUT the sidebar / topbar / bottom-nav */
const PUBLIC_PATHS = ['/citizen/login', '/citizen/register'];

export default function CitizenLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

  if (isPublicPage) {
    return (
      <div className="min-h-screen bg-[#faf7f0] font-sans">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf7f0] font-sans">
      {/* Desktop sidebar */}
      <CitizenSidebar />

      {/* Main content area */}
      <div className="md:ml-64 min-h-screen flex flex-col">
        {/* Top bar */}
        <CitizenTopbar />

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          <Breadcrumbs />
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <CitizenBottomNav />
    </div>
  );
}
