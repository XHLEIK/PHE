import { Handshake, Landmark, ShieldCheck, Timer } from 'lucide-react';
import SectionWrapper from './SectionWrapper';

const points = [
  {
    icon: ShieldCheck,
    title: 'Transparency in Grievance Handling',
    text: 'Trackable updates and structured workflows improve visibility for citizens and administrators.',
  },
  {
    icon: Timer,
    title: 'Faster Resolution',
    text: 'AI-supported classification reduces delays in routing and departmental triage.',
  },
  {
    icon: Landmark,
    title: 'Technology-Driven Governance',
    text: 'Digital systems help improve service delivery standards in water infrastructure management.',
  },
  {
    icon: Handshake,
    title: 'Citizen Participation',
    text: 'Accessible reporting channels encourage responsible participation in public utility improvement.',
  },
];

export default function WhyPlatformSection() {
  return (
    <section id="about" className="bg-white">
      <SectionWrapper>
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="landing-subheading mb-3">Why This Platform</p>
            <h2 className="landing-section-title mb-4 text-gov-blue-900">
              Strengthening Public Water Service Through Transparent Digital Governance
            </h2>
            <p className="landing-body mb-8">
              The portal is designed to support accountability, reduce response time, and improve communication
              between citizens and the Public Health Engineering Department.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {points.map(({ icon: Icon, title, text }) => (
                <article key={title} className="rounded-xl border border-gov-blue-100 bg-gov-blue-50/40 p-4">
                  <Icon className="mb-2 h-5 w-5 text-gov-blue-700" aria-hidden="true" />
                  <h3 className="mb-1 text-sm font-semibold text-gov-blue-900">{title}</h3>
                  <p className="text-sm text-slate-600">{text}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gov-blue-100 bg-gradient-to-br from-gov-aqua-50 to-white p-6 shadow-lg">
            <svg
              viewBox="0 0 620 380"
              className="h-auto w-full"
              role="img"
              aria-label="Water infrastructure illustration with monitoring and distribution network"
            >
              <rect x="40" y="180" width="540" height="26" rx="13" fill="#0f4c81" />
              <rect x="120" y="90" width="34" height="100" rx="17" fill="#0a6ea8" />
              <rect x="290" y="70" width="34" height="120" rx="17" fill="#0a6ea8" />
              <rect x="450" y="110" width="34" height="80" rx="17" fill="#0a6ea8" />
              <circle cx="137" cy="72" r="34" fill="#e0f7fa" stroke="#00acc1" strokeWidth="8" />
              <circle cx="307" cy="52" r="34" fill="#e0f7fa" stroke="#00acc1" strokeWidth="8" />
              <circle cx="467" cy="92" r="34" fill="#e0f7fa" stroke="#00acc1" strokeWidth="8" />
              <path d="M95 310c40-36 80-36 120 0" fill="none" stroke="#00acc1" strokeWidth="8" />
              <path d="M255 320c40-36 80-36 120 0" fill="none" stroke="#00acc1" strokeWidth="8" />
              <path d="M415 310c40-36 80-36 120 0" fill="none" stroke="#00acc1" strokeWidth="8" />
            </svg>
          </div>
        </div>
      </SectionWrapper>
    </section>
  );
}
