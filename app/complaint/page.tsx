import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Submit Grievance | Samadhan AI — State Grievance Services',
  description:
    'Register your grievance with the Arunachal Pradesh Public Service Commission. Secure, confidential, and AI-assisted routing.',
};

/**
 * Legacy /complaint route — redirects to the citizen complaint form.
 * All new complaints should go through the authenticated citizen flow at /citizen/complaints/new.
 */
export default function ComplaintPage() {
  redirect('/citizen/complaints/new');
}
