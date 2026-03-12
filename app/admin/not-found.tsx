import Link from 'next/link';

export default function AdminNotFound() {
  return (
    <main className="min-h-screen bg-[#faf7f0] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md w-full">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 border border-slate-200 mb-5 mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="m15 9-6 6" />
            <path d="m9 9 6 6" />
          </svg>
        </div>

        <h1 className="text-5xl font-extrabold text-slate-300 mb-2">404</h1>
        <h2 className="text-lg font-bold text-slate-800 mb-1">Admin Page Not Found</h2>
        <p className="text-sm text-slate-500 mb-6">
          This admin page doesn&apos;t exist. Check the URL or navigate using the sidebar.
        </p>

        <Link
          href="/admin/dashboard"
          className="inline-flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-800 text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </main>
  );
}
