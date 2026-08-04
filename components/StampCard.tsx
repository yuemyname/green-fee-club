import { STAMP_GOAL } from '@/lib/constants';
import { toMD } from '@/lib/time';
import type { ReactNode } from 'react';

/**
 * 원형 도장 10칸 그리드. dates에는 이 카드에 찍힌 도장의 yyyymmdd(최대 10개).
 * 10칸이 다 차면 카드 전체가 turf 배경 + "무료 1회 적립 완료".
 */
export default function StampCard({ dates, footer }: { dates: string[]; footer?: ReactNode }) {
  const full = dates.length >= STAMP_GOAL;
  return (
    <div className={`rounded-xl border border-line p-4 ${full ? 'bg-turf' : 'bg-white'}`}>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: STAMP_GOAL }, (_, i) => {
          const d = dates[i];
          return d ? (
            <div
              key={i}
              className="flex aspect-square items-center justify-center rounded-full bg-fair text-[11px] font-bold text-white tabular-nums"
            >
              {toMD(d)}
            </div>
          ) : (
            <div
              key={i}
              className="flex aspect-square items-center justify-center rounded-full border border-line bg-white text-sm font-semibold text-sub tabular-nums"
            >
              {i + 1}
            </div>
          );
        })}
      </div>
      {full && <p className="mt-3 text-sm font-bold text-fair">무료 1회 적립 완료</p>}
      {!full && footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}
