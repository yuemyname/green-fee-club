'use client';

import type { ButtonHTMLAttributes } from 'react';

type Tone = 'solid' | 'ghost' | 'flag';

const tones: Record<Tone, string> = {
  solid: 'bg-fair text-white',
  ghost: 'bg-white text-ink border border-line',
  flag: 'bg-flag text-white',
};

export default function Btn({
  tone = 'solid',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-lg px-4 text-sm font-semibold transition-opacity active:opacity-80 disabled:opacity-40 ${tones[tone]} ${className}`}
      {...props}
    />
  );
}
