import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#faf7f0] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full">

        {/* State emblem */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 mb-6 mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700 mb-2">
          Government of Arunachal Pradesh
        </p>
        <h1 className="text-4xl font-extrabold text-[#1e293b] tracking-tight mb-2">
          Samadhan AI
        </h1>
        <p className="text-base font-medium text-slate-500 mb-6">
          State Grievance Services — APPSC
        </p>

        <div className="bg-white rounded-2xl shadow-lg border border-amber-100 overflow-hidden mb-6">
          <div className="h-1 w-full bg-gradient-to-r from-amber-700 via-yellow-400 to-amber-700" />
          <div className="p-6">
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              Register your complaint with the Arunachal Pradesh Public Service Commission.
              Our AI-assisted system routes your grievance to the correct department automatically.
            </p>
            <Link
              href="/complaint"
              className="inline-flex items-center justify-center gap-2 w-full bg-[#b8860b] hover:bg-amber-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-md shadow-amber-100 transition-colors text-sm tracking-wide"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Submit a Grievance
            </Link>
          </div>
        </div>

        <Link
          href="/admin/login"
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium"
        >
          Official Portal Login →
        </Link>

      </div>
    </main>
  );
}
