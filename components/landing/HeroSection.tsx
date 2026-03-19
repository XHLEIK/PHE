import { ArrowRight, Droplets, MapPinned, Waves } from 'lucide-react';
import Link from 'next/link';
import SectionWrapper from './SectionWrapper';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-gov-aqua-50 via-white to-white">
      <div className="pointer-events-none absolute inset-0 hero-water-pattern" aria-hidden="true" />
      <SectionWrapper>
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="landing-subheading mb-4 inline-flex items-center gap-2 rounded-full border border-gov-aqua-200 bg-white px-4 py-2">
              <Droplets className="h-4 w-4 text-gov-aqua-700" aria-hidden="true" />
              Government of Arunachal Pradesh
            </p>
            <h1 className="landing-hero-title mb-5 text-balance text-gov-blue-900">
              Water Supply Grievance Management for Faster Public Service Response
            </h1>
            <p className="landing-body mb-8 max-w-2xl">
              Report water supply, pipeline, and distribution issues through a secure citizen portal.
              AI-assisted routing helps the Public Health Engineering Department assign and resolve grievances
              transparently with timely updates.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/complaint" className="landing-btn-primary" aria-label="Submit a Grievance">
                Submit a Grievance
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/citizen/track" className="landing-btn-secondary" aria-label="Track Your Complaint">
                Track Your Complaint
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-gov-blue-100 bg-white/90 p-6 shadow-xl">
              <div className="mb-4 grid grid-cols-3 gap-3 text-gov-blue-700">
                <div className="rounded-lg border border-gov-aqua-100 bg-gov-aqua-50 p-3"><Waves className="h-5 w-5" /></div>
                <div className="rounded-lg border border-gov-aqua-100 bg-gov-aqua-50 p-3"><Droplets className="h-5 w-5" /></div>
                <div className="rounded-lg border border-gov-aqua-100 bg-gov-aqua-50 p-3"><MapPinned className="h-5 w-5" /></div>
              </div>
              <svg
                viewBox="0 0 640 360"
                className="h-auto w-full"
                role="img"
                aria-label="Illustration of water supply infrastructure with pipelines and monitoring nodes"
              >
                <defs>
                  <linearGradient id="pipeGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#0f4c81" />
                    <stop offset="100%" stopColor="#00acc1" />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="640" height="360" rx="20" fill="#f8fcff" />
                <rect x="70" y="220" width="500" height="22" rx="11" fill="url(#pipeGrad)" />
                <rect x="140" y="120" width="26" height="110" rx="13" fill="#1570a6" />
                <rect x="300" y="90" width="26" height="140" rx="13" fill="#1570a6" />
                <rect x="470" y="145" width="26" height="85" rx="13" fill="#1570a6" />
                <circle cx="153" cy="105" r="30" fill="#e0f7fa" stroke="#00acc1" strokeWidth="6" />
                <circle cx="313" cy="75" r="30" fill="#e0f7fa" stroke="#00acc1" strokeWidth="6" />
                <circle cx="483" cy="130" r="30" fill="#e0f7fa" stroke="#00acc1" strokeWidth="6" />
                <path d="M123 105c15-25 45-25 60 0" fill="none" stroke="#0f4c81" strokeWidth="5" />
                <path d="M283 75c15-25 45-25 60 0" fill="none" stroke="#0f4c81" strokeWidth="5" />
                <path d="M453 130c15-25 45-25 60 0" fill="none" stroke="#0f4c81" strokeWidth="5" />
              </svg>
            </div>
          </div>
        </div>
      </SectionWrapper>
    </section>
  );
}
