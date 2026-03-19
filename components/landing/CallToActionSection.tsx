import { LogIn, Send } from 'lucide-react';
import Link from 'next/link';
import SectionWrapper from './SectionWrapper';

export default function CallToActionSection() {
  return (
    <section className="bg-gradient-to-r from-gov-blue-900 to-gov-blue-700 text-white">
      <SectionWrapper>
        <div className="rounded-2xl border border-white/20 bg-white/5 p-8 md:p-10">
          <h2 className="landing-section-title mb-3 text-white">
            Report Water Supply Issues Responsibly and Help Improve Public Services
          </h2>
          <p className="mb-6 max-w-3xl text-sm leading-7 text-blue-100 md:text-base">
            Your grievance helps the department monitor infrastructure gaps and improve supply reliability.
            Submit verified details to support faster field response and transparent resolution.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/complaint" className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-gov-blue-900 transition hover:bg-gov-aqua-100">
              <Send className="h-4 w-4" aria-hidden="true" />
              Submit a Grievance
            </Link>
            <Link href="/citizen/login" className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/60 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Citizen Login
            </Link>
          </div>
        </div>
      </SectionWrapper>
    </section>
  );
}
