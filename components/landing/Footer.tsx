import { HelpCircle, Mail, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';
import SectionWrapper from './SectionWrapper';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer id="contact" className="bg-slate-950 text-slate-200">
      <SectionWrapper className="py-12">
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
          <section>
            <h3 className="mb-3 text-base font-semibold text-white">Department Information</h3>
            <p className="text-sm leading-6 text-slate-300">
              Arunachal Pradesh Public Health Engineering
              <br />
              Water Supply &amp; Sanitation Department
            </p>
          </section>

          <section>
            <h3 className="mb-3 text-base font-semibold text-white">Quick Links</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><Link href="/" className="hover:text-white">Home</Link></li>
              <li><Link href="/complaint" className="hover:text-white">Submit Grievance</Link></li>
              <li><Link href="/citizen/track" className="hover:text-white">Track Complaint</Link></li>
              <li><Link href="/citizen/login" className="hover:text-white">Citizen Login</Link></li>
            </ul>
          </section>

          <section>
            <h3 className="mb-3 text-base font-semibold text-white">Citizen Help</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="inline-flex items-center gap-2"><HelpCircle className="h-4 w-4" aria-hidden="true" />FAQ</li>
              <li>Support</li>
              <li>Contact</li>
            </ul>
          </section>

          <section>
            <h3 className="mb-3 text-base font-semibold text-white">Contact Information</h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="inline-flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4" aria-hidden="true" />
                PHE&amp;WS Department Office, Itanagar, Arunachal Pradesh
              </li>
              <li className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4" aria-hidden="true" />
                +91-360-000-0000
              </li>
              <li className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4" aria-hidden="true" />
                support.phews@arunachal.gov.in
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-10 border-t border-slate-800 pt-4 text-xs text-slate-400">
          © {year} Arunachal Pradesh PHE &amp; Water Supply Department. All rights reserved.
        </div>
      </SectionWrapper>
    </footer>
  );
}
