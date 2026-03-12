import type { Metadata } from 'next';
import Breadcrumbs from '@/components/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Samadhan AI administrative control panel — manage complaints, departments, and analytics.',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-amber-700 focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        Skip to main content
      </a>
      <div id="admin-main">
        <div className="md:ml-64 pt-4 px-4 md:px-6">
          <Breadcrumbs />
        </div>
        {children}
      </div>
    </>
  );
}
