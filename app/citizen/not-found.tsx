import Link from 'next/link';

export default function CitizenNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 border border-slate-200 mb-5">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="m15 9-6 6" />
          <path d="m9 9 6 6" />
        </svg>
      </div>

      <h1 className="text-5xl font-extrabold text-slate-300 mb-2">404</h1>
      <h2 className="text-lg font-bold text-slate-800 mb-1">Page Not Found</h2>
      <p className="text-sm text-slate-500 mb-6">
        This page doesn&apos;t exist. Use the navigation to find what you need.
      </p>

      <Link
        href="/citizen/complaints"
        className="inline-flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-800 text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition-colors"
      >
        ← Back to Dashboard
      </Link>
    </div>
  );
}
