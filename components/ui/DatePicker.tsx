'use client';

import { fmtDate, shiftDate, todayStr } from '@/lib/time';

export default function DatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const isToday = value === todayStr();
  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-white px-2 py-1.5">
      <button
        type="button"
        aria-label="이전 날짜"
        onClick={() => onChange(shiftDate(value, -1))}
        className="flex size-11 items-center justify-center rounded-lg text-lg text-sub active:bg-turf"
      >
        ‹
      </button>
      <div className="flex items-center gap-2">
        <span className="text-base font-bold tabular-nums">{fmtDate(value)}</span>
        {isToday && (
          <span className="rounded-md bg-turf px-1.5 py-0.5 text-xs font-semibold text-fair">오늘</span>
        )}
      </div>
      <button
        type="button"
        aria-label="다음 날짜"
        onClick={() => onChange(shiftDate(value, 1))}
        className="flex size-11 items-center justify-center rounded-lg text-lg text-sub active:bg-turf"
      >
        ›
      </button>
    </div>
  );
}
