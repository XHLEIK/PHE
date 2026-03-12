import { redirect } from 'next/navigation';

/**
 * /citizen/dashboard now redirects to /citizen/complaints.
 * Kept for backward compatibility with bookmarks and old links.
 */
export default function CitizenDashboardRedirect() {
  redirect('/citizen/complaints');
}
