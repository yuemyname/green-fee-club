import type { ReactNode } from 'react';

export default function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-mint">{children}</p>
  );
}
