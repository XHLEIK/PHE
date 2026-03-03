import React from 'react';
import ComplaintForm from '@/components/ComplaintForm';

export const metadata = {
  title: 'Submit Grievance | Samadhan AI — State Grievance Services',
  description: 'Register your grievance with the Arunachal Pradesh Public Service Commission. Secure, confidential, and AI-assisted routing.',
};

const ComplaintPage = () => {
  return (
    <main className="min-h-screen bg-[#faf7f0] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">

        {/* ── Page header ─────────────────────────────────────── */}
        <div className="text-center mb-10">
          {/* State emblem placeholder */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700 mb-2">
            Government of Arunachal Pradesh
          </p>
          <h1 className="text-3xl font-extrabold text-[#1e293b] tracking-tight sm:text-4xl">
            Samadhan AI
          </h1>
          <p className="mt-1 text-base font-medium text-slate-500">
            State Grievance Services — APPSC
          </p>
          <p className="mt-4 text-sm text-slate-500 max-w-lg mx-auto">
            Register your complaint securely. Our AI routing system will forward it to the correct department automatically.
            Your contact details are kept confidential and only shared with authorised officials.
          </p>
        </div>

        {/* ── Form ────────────────────────────────────────────── */}
        <ComplaintForm />

        {/* ── Footer note ─────────────────────────────────────── */}
        <div className="mt-10 text-center text-xs text-slate-400 space-y-1">
          <p>Need assistance? Contact the APPSC helpdesk at <span className="font-semibold text-slate-500">1800-XXX-XXXX</span> (toll-free)</p>
          <div className="mt-4 flex justify-center items-center gap-4 opacity-70">
            <span className="font-bold text-slate-400 tracking-wide">APPSC</span>
            <span className="h-3 w-px bg-slate-300" />
            <span className="uppercase tracking-widest font-semibold">Government of Arunachal Pradesh</span>
          </div>
        </div>

      </div>
    </main>
  );
};

export default ComplaintPage;
