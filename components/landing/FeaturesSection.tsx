import { Activity, BrainCircuit, ClipboardCheck, TimerReset } from 'lucide-react';
import SectionWrapper from './SectionWrapper';

const features = [
  {
    icon: BrainCircuit,
    title: 'AI-Assisted Complaint Categorization',
    description: 'Automatically classifies water grievances so they reach the correct department desk quickly.',
  },
  {
    icon: Activity,
    title: 'Real-Time Complaint Tracking',
    description: 'Citizens can monitor grievance status updates from submission to closure in one portal.',
  },
  {
    icon: ClipboardCheck,
    title: 'Department-Level Resolution',
    description: 'Case ownership and assignment workflows ensure accountability at every response stage.',
  },
  {
    icon: TimerReset,
    title: 'Citizen-Friendly Reporting',
    description: 'Simple complaint forms and guided input make reporting water supply issues accessible.',
  },
];

export default function FeaturesSection() {
  return (
    <section id="services" className="bg-white">
      <SectionWrapper>
        <div className="mb-10 text-center">
          <p className="landing-subheading mb-3">Services</p>
          <h2 className="landing-section-title mb-3 text-gov-blue-900">Core Platform Capabilities</h2>
          <p className="landing-body mx-auto max-w-3xl">
            Built for public utility governance, the portal combines streamlined reporting with reliable
            departmental workflows.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="landing-card group"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gov-aqua-200 bg-gov-aqua-50 text-gov-blue-700">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mb-2 text-base font-semibold text-gov-blue-900">{title}</h3>
              <p className="text-sm leading-6 text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </SectionWrapper>
    </section>
  );
}
