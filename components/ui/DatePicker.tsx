'use client';

import { useState } from 'react';
import { fmtDate, shiftDate, todayStr } from '@/lib/time';
import MonthCalendar from '@/components/MonthCalendar';

/** ‹ 날짜 › 이동 + 가운데 날짜를 누르면 달력 팝업에서 선택 */
export default function DatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(value.slice(0, 6));
  const isToday = value === todayStr();

  return (
    <>
      <div className="flex items-center justify-between rounded-xl border border-line bg-white px-2 py-1.5">
        <button
          type="button"
          aria-label="이전 날짜"
          onClick={() => onChange(shiftDate(value, -1))}
          className="flex size-11 items-center justify-center rounded-lg text-lg text-sub active:bg-turf"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="달력에서 날짜 선택"
          onClick={() => {
            setMonth(value.slice(0, 6));
            setOpen(true);
          }}
          className="flex min-h-11 items-center gap-2 rounded-lg px-2 transition-opacity active:opacity-80"
        >
          <span className="text-base font-bold tabular-nums">{fmtDate(value)}</span>
          {isToday && (
            <span className="rounded-md bg-turf px-1.5 py-0.5 text-xs font-semibold text-fair">오늘</span>
          )}
          <span className="text-xs text-sub">▾</span>
        </button>
        <button
          type="button"
          aria-label="다음 날짜"
          onClick={() => onChange(shiftDate(value, 1))}
          className="flex size-11 items-center justify-center rounded-lg text-lg text-sub active:bg-turf"
        >
          ›
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-deep/40 px-4"
          onClick={() => setOpen(false)}
        >
          <div className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <MonthCalendar
              month={month}
              value={value}
              onSelect={d => {
                onChange(d);
                setOpen(false);
              }}
              onMonthChange={setMonth}
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-2 flex min-h-11 w-full items-center justify-center rounded-lg border border-line bg-white text-sm font-semibold text-sub"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}
