import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#faf7f0] flex flex-col font-sans">
      {/* Header */}
      <header className="w-full border-b border-amber-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-slate-800 tracking-tight">Samadhan AI</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/citizen/track" className="text-xs text-slate-500 hover:text-amber-700 transition-colors font-medium">
              Track Complaint
            </Link>
            <Link href="/citizen/login" className="text-xs text-slate-500 hover:text-amber-700 transition-colors font-medium">
              Citizen Login
            </Link>
            <Link href="/admin/login" className="text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium">
              Official Portal →
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="max-w-2xl w-full">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700 mb-3">
            Government of Arunachal Pradesh
          </p>
          <h1 className="text-5xl md:text-6xl font-extrabold text-[#1e293b] tracking-tight mb-3">
            Samadhan AI
          </h1>
          <p className="text-lg font-medium text-slate-500 mb-8 max-w-lg mx-auto">
            AI-powered grievance redressal for the Arunachal Pradesh Public Service Commission.
            Submit, track, and resolve complaints transparently.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
            <Link
              href="/complaint"
              className="inline-flex items-center justify-center gap-2 bg-[#b8860b] hover:bg-amber-700 text-white font-bold py-3.5 px-8 rounded-xl shadow-md shadow-amber-100 transition-colors text-sm tracking-wide"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Submit a Grievance
            </Link>
            <Link
              href="/citizen/login"
              className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3.5 px-8 rounded-xl shadow-sm transition-colors text-sm"
            >
              Citizen Portal
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white border-t border-slate-100 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-xl font-bold text-slate-800 mb-10">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '1', icon: '📝', title: 'Submit', desc: 'File your grievance online or through the citizen portal with supporting evidence.' },
              { step: '2', icon: '🤖', title: 'AI Analysis', desc: 'Samadhan AI categorizes, prioritizes, and routes your complaint to the right department.' },
              { step: '3', icon: '🏛️', title: 'Resolution', desc: 'Dedicated department officials work on your complaint with SLA-tracked deadlines.' },
              { step: '4', icon: '✅', title: 'Updates', desc: 'Get real-time status updates and notifications until your grievance is fully resolved.' },
            ].map((s) => (
              <div key={s.step} className="text-center p-5">
                <div className="text-3xl mb-3">{s.icon}</div>
                <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold mb-2">{s.step}</div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">{s.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-xl font-bold text-slate-800 mb-10">Platform Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: '🧠', title: 'AI-Powered Routing', desc: 'Gemini AI auto-categorizes and assigns complaints to the correct department.' },
              { icon: '📊', title: 'SLA Tracking', desc: 'Every complaint has a deadline. Automated alerts on SLA breaches.' },
              { icon: '🔒', title: 'Secure & Private', desc: 'End-to-end encrypted communications. Contact details are privacy-protected.' },
              { icon: '📱', title: 'Mobile-Friendly', desc: 'Submit and track complaints from any device, anytime.' },
              { icon: '🔔', title: 'Real-time Notifications', desc: 'Email and in-app alerts at every stage of complaint resolution.' },
              { icon: '📋', title: 'Audit Trail', desc: 'Every action is logged with tamper-proof integrity hash chains.' },
            ].map((f) => (
              <div key={f.title} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-sm hover:border-amber-200 transition-all">
                <div className="text-2xl mb-2">{f.icon}</div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p className="text-xs font-bold text-slate-700">Samadhan AI — Grievance Redressal Portal</p>
            <p className="text-[10px] text-slate-400 mt-1">Arunachal Pradesh Public Service Commission © {new Date().getFullYear()}</p>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/complaint" className="text-xs text-slate-500 hover:text-amber-700 transition-colors">Submit</Link>
            <Link href="/citizen/track" className="text-xs text-slate-500 hover:text-amber-700 transition-colors">Track</Link>
            <Link href="/transparency" className="text-xs text-slate-500 hover:text-amber-700 transition-colors">Transparency</Link>
            <Link href="/citizen/login" className="text-xs text-slate-500 hover:text-amber-700 transition-colors">Citizen Portal</Link>
            <Link href="/chat" className="text-xs text-slate-500 hover:text-amber-700 transition-colors">AI Chat</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
