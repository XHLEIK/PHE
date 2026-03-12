import React from 'react';
import CitizenLayoutShell from '@/components/citizen/CitizenLayoutShell';

export const metadata = {
  title: 'Citizen Portal | Samadhan AI',
  description: 'Your personal grievance dashboard — submit, track, and manage complaints.',
};

export default function CitizenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CitizenLayoutShell>{children}</CitizenLayoutShell>;
}
