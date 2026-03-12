'use client';

import { useEffect } from 'react';

export default function CitizenError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[CITIZEN ERROR BOUNDARY]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-50 border border-rose-200 mb-5">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      </div>

      <h1 className="text-lg font-bold text-slate-800 mb-2">Something went wrong</h1>
      <p className="text-sm text-slate-500 mb-2">
        We encountered an error. Please try again.
      </p>
      {error.digest && (
        <p className="text-xs text-slate-400 mb-6 font-mono">Ref: {error.digest}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-800 text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition-colors"
        >
          Try Again
        </button>
        <a
          href="/citizen/complaints"
          className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-6 rounded-xl text-sm transition-colors"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
