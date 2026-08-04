'use client';

import { todayStr } from '@/lib/time';

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 월 달력 — 예약이 있는 날짜는 초록 동그라미(marked), 선택한 날짜는 진한 테두리.
 */
export default function MonthCalendar({
  month,                    // yyyymm
  value,                    // 선택된 yyyymmdd
  marked = new Set<string>(), // 예약이 있는 yyyymmdd 집합 (없으면 순수 날짜 선택기)
  onSelect,
  onMonthChange,
}: {
  month: string;
  value: string;
  marked?: Set<string>;
  onSelect: (date: string) => void;
  onMonthChange: (month: string) => void;
}) {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(4, 6));
  const startDow = new Date(y, m - 1, 1).getDay();
  const days = new Date(y, m, 0).getDate();
  const today = todayStr();

  const nav = (delta: number) => {
    const d = new Date(y, m - 1 + delta, 1);
    onMonthChange(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="이전 달"
          onClick={() => nav(-1)}
          className="flex size-11 items-center justify-center rounded-lg text-lg text-sub active:bg-turf"
        >
          ‹
        </button>
        <p className="text-base font-black text-deep tabular-nums">
          {y}년 {m}월
        </p>
        <button
          type="button"
          aria-label="다음 달"
          onClick={() => nav(1)}
          className="flex size-11 items-center justify-center rounded-lg text-lg text-sub active:bg-turf"
        >
          ›
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 text-center">
        {DOW.map(d => (
          <span key={d} className="py-1 text-xs font-semibold text-sub">{d}</span>
        ))}
        {Array.from({ length: startDow }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const ds = `${month}${String(i + 1).padStart(2, '0')}`;
          const isMarked = marked.has(ds);
          const isSel = value === ds;
          const isToday = ds === today;
          return (
            <button
              key={ds}
              type="button"
              onClick={() => onSelect(ds)}
              aria-label={`${m}월 ${i + 1}일${isMarked ? ' 예약 있음' : ''}`}
              className={`mx-auto my-0.5 flex size-11 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-opacity active:opacity-80 ${
                isMarked
                  ? 'bg-fair text-white'
                  : isToday
                    ? 'bg-turf text-fair'
                    : 'text-ink'
              } ${isSel ? 'ring-2 ring-deep' : ''}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {marked.size > 0 && (
        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-sub">
          <span className="inline-block size-2.5 rounded-full bg-fair" /> 예약 있는 날 — 누르면 아래에 상세가 열립니다
        </p>
      )}
    </div>
  );
}
