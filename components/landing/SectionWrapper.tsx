import { ReactNode } from 'react';

type SectionWrapperProps = {
  children: ReactNode;
  className?: string;
};

export default function SectionWrapper({ children, className = '' }: SectionWrapperProps) {
  return (
    <div className={`landing-container py-16 md:py-20 ${className}`.trim()}>
      {children}
    </div>
  );
}
