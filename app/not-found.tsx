import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#faf7f0] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md w-full">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 border-2 border-slate-200 mb-6 mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6" />
            <path d="m9 9 6 6" />
          </svg>
        </div>

        <h1 className="text-6xl font-extrabold text-slate-300 mb-2">404</h1>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Page Not Found</h2>
        <p className="text-sm text-slate-500 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-800 text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition-colors"
          >
            ← Back to Home
          </Link>
          <Link
            href="/citizen/track"
            className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-6 rounded-xl text-sm transition-colors"
          >
            Track Complaint
          </Link>
        </div>
      </div>
    </main>
  );
}
