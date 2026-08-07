import type { ReactNode } from 'react';

export default function Eyebrow({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-xs font-semibold uppercase tracking-widest text-mint ${className}`}>
      {children}
    </p>
  );
}
