'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

/** Readable labels for known route segments */
const LABELS: Record<string, string> = {
  admin: 'Admin',
  citizen: 'Citizen',
  dashboard: 'Dashboard',
  complaints: 'Grievances',
  new: 'New Complaint',
  analytics: 'Analytics',
  departments: 'Departments',
  settings: 'Settings',
  notifications: 'Notifications',
  track: 'Track',
  profile: 'Profile',
  login: 'Login',
  register: 'Register',
  transparency: 'Transparency',
  chat: 'AI Chat',
};

function labelFor(segment: string) {
  return LABELS[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length <= 1) return null; // don't show on root or single-segment routes

  const crumbs = segments.map((seg, i) => ({
    label: labelFor(seg),
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-slate-500">
      <Link href="/" className="transition-colors hover:text-gov-blue-800" aria-label="Home">
        <Home size={14} />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight size={12} className="text-slate-300" aria-hidden="true" />
          {crumb.isLast ? (
            <span className="text-slate-800 font-medium" aria-current="page">
              {crumb.label}
            </span>
          ) : (
            <Link href={crumb.href} className="transition-colors hover:text-gov-blue-800">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
