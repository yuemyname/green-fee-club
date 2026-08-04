'use client';

import type { InputHTMLAttributes } from 'react';

export default function Field({
  label,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <input
        className="h-12 w-full rounded-lg border border-line bg-white px-3 text-base text-ink tabular-nums outline-none placeholder:text-sub focus:border-fair"
        {...props}
      />
    </label>
  );
}
