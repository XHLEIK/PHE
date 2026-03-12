import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Public Transparency Dashboard',
  description:
    'View real-time public statistics on grievance resolution across Arunachal Pradesh departments.',
};

export default function TransparencyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
