'use client';

import { Menu, X, Home, Building2, BriefcaseBusiness, LocateFixed, Phone, LogIn, Send, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import SectionWrapper from './SectionWrapper';

const navItems = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'About', href: '#about', icon: Building2 },
  { label: 'Services', href: '#services', icon: BriefcaseBusiness },
  { label: 'Track Complaint', href: '/citizen/track', icon: LocateFixed },
  { label: 'Contact', href: '#contact', icon: Phone },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        isScrolled
          ? 'border-gov-blue-200 bg-white/95 shadow-md backdrop-blur'
          : 'border-transparent bg-transparent'
      }`}
    >
      <SectionWrapper className="py-3 md:py-4">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3" aria-label="Arunachal Pradesh PHE Department home">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gov-blue-200 bg-white shadow-sm">
              <ShieldCheck className="h-5 w-5 text-gov-blue-700" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gov-blue-900 md:text-base">
                Arunachal Pradesh PHE &amp; Water Supply Department
              </p>
              <p className="text-xs text-slate-500">Citizen Water Grievance Portal</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 lg:flex" aria-label="Primary navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 transition-colors hover:text-gov-blue-700"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Link href="/citizen/login" className="landing-btn-secondary" aria-label="Citizen Login">
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Citizen Login
            </Link>
            <Link href="/complaint" className="landing-btn-primary" aria-label="Submit a Grievance">
              <Send className="h-4 w-4" aria-hidden="true" />
              Submit a Grievance
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(v => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gov-blue-200 bg-white text-gov-blue-700 lg:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="mt-3 rounded-xl border border-gov-blue-100 bg-white p-4 shadow-md lg:hidden">
            <nav className="grid gap-2" aria-label="Mobile navigation">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-gov-aqua-50 hover:text-gov-blue-700"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Link href="/citizen/login" className="landing-btn-secondary justify-center" onClick={() => setMobileOpen(false)}>
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Citizen Login
              </Link>
              <Link href="/complaint" className="landing-btn-primary justify-center" onClick={() => setMobileOpen(false)}>
                <Send className="h-4 w-4" aria-hidden="true" />
                Submit a Grievance
              </Link>
            </div>
          </div>
        )}
      </SectionWrapper>
    </header>
  );
}
