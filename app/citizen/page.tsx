import { redirect } from 'next/navigation';

/**
 * /citizen root page — redirects to the citizen dashboard.
 * The middleware handles authentication and will redirect
 * unauthenticated users to /citizen/login.
 */
export default function CitizenIndexRedirect() {
  redirect('/citizen/dashboard');
}
