import Link from 'next/link';

export const metadata = {
  title: 'Offline | Samadhan AI',
};

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#faf7f0] px-6">
      <div className="max-w-md text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#b45309"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-800">You&apos;re Offline</h1>
        <p className="text-sm text-slate-500">
          It looks like you&apos;ve lost your internet connection. Please check your
          connection and try again.
        </p>
        <Link
          href="/"
          className="inline-block mt-4 px-5 py-2 bg-amber-700 text-white text-sm font-medium rounded-lg hover:bg-amber-800 transition-colors"
        >
          Try Again
        </Link>
      </div>
    </main>
  );
}
