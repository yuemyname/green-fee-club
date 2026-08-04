import { STAMP_GOAL } from '@/lib/constants';
import { toMD } from '@/lib/time';
import type { ReactNode } from 'react';

/** 꽉 찬 카드(=무료 예약권 1장)의 사용 상태 */
export type CouponState = { used: false } | { used: true; info: string };

/**
 * 원형 도장 10칸 그리드. dates에는 이 카드에 찍힌 도장의 yyyymmdd(최대 10개).
 * 10칸이 다 찬 카드는 무료 예약권 1장 — 미사용이면 turf 배경 + '사용 가능',
 * 사용됐으면 회색 배경 + '사용 완료'와 사용된 예약의 날짜·시간을 표시한다.
 */
export default function StampCard({
  dates,
  footer,
  coupon,
}: {
  dates: string[];
  footer?: ReactNode;
  coupon?: CouponState;
}) {
  const full = dates.length >= STAMP_GOAL;
  const used = full && coupon?.used === true;
  const bg = full ? (used ? 'bg-line/40' : 'bg-turf') : 'bg-white';

  return (
    <div className={`rounded-xl border border-line p-4 ${bg}`}>
      <div className={`grid grid-cols-5 gap-2 ${used ? 'opacity-55' : ''}`}>
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
      {full && used && (
        <div className="mt-3">
          <p className="text-sm font-bold text-sub">사용 완료</p>
          {coupon.info && (
            <p className="mt-0.5 text-xs text-sub tabular-nums">{coupon.info}</p>
          )}
        </div>
      )}
      {full && !used && (
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm font-bold text-fair">무료 1회 적립 완료</p>
          <span className="rounded-md bg-flag px-1.5 py-0.5 text-[11px] font-bold text-white">
            사용 가능
          </span>
        </div>
      )}
      {!full && footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}
