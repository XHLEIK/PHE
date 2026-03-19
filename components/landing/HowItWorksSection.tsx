import { BellRing, BrainCog, ClipboardPlus, FileSearch } from 'lucide-react';
import SectionWrapper from './SectionWrapper';

const steps = [
  {
    icon: ClipboardPlus,
    title: 'Submit Water Supply Grievance',
    description: 'Citizens submit complaints for pipeline leaks, low pressure, supply gaps, or quality issues.',
  },
  {
    icon: BrainCog,
    title: 'AI Categorizes Complaint',
    description: 'The system analyzes complaint details and tags department, priority, and issue category.',
  },
  {
    icon: FileSearch,
    title: 'Department Reviews and Assigns',
    description: 'PHE officers review grievance context and assign resolution tasks to responsible teams.',
  },
  {
    icon: BellRing,
    title: 'Resolution and Citizen Notification',
    description: 'Once addressed, the complaint is updated and citizens receive status confirmation.',
  },
];

export default function HowItWorksSection() {
  return (
    <section className="bg-gov-aqua-50/60">
      <SectionWrapper>
        <div className="mb-10 text-center">
          <p className="landing-subheading mb-3">Workflow</p>
          <h2 className="landing-section-title mb-3 text-gov-blue-900">How the Resolution Process Works</h2>
          <p className="landing-body mx-auto max-w-3xl">
            A clear, accountable path from grievance submission to departmental action and final resolution.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article key={step.title} className="landing-card">
                <div className="mb-4 flex items-center justify-between">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gov-blue-100 text-sm font-semibold text-gov-blue-800">
                    {index + 1}
                  </span>
                  <Icon className="h-5 w-5 text-gov-blue-700" aria-hidden="true" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-gov-blue-900">{step.title}</h3>
                <p className="text-sm leading-6 text-slate-600">{step.description}</p>
              </article>
            );
          })}
        </div>
      </SectionWrapper>
    </section>
  );
}
