'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { confirmPayment } from '@/app/actions/reservation';
import { STAMP_GOAL } from '@/lib/constants';
import type { Segment } from '@/lib/timeline';
import { fmtDur, toHM } from '@/lib/time';
import type { ReservationRow } from '@/lib/types';
import Btn from '@/components/ui/Btn';
import { useToast } from '@/components/ui/Toast';

/**
 * 하루 타임라인을 세그먼트 리스트로.
 * 빈 구간 클릭 → /book 프리필 이동, 입금 대기 예약 클릭 → 입금 확인 패널.
 */
export default function RoomTimeline({
  segments,
  roomId,
  roomName,
  date,
  onChanged,
}: {
  segments: Segment<ReservationRow>[];
  roomId: number;
  roomName: string;
  date: string;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [openId, setOpenId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = async (id: number, method: 'manual' | 'point') => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await confirmPayment(id, method);
      if (!res.ok) {
        toast(res.error);
      } else if (res.value.method === 'point') {
        toast(`${res.value.customerName}님 무료 예약권으로 입금 확인 완료`);
      } else if (res.value.cardCompleted) {
        toast(`카드 완성! ${res.value.customerName}님 무료 예약권 1장이 나왔습니다.`);
      } else {
        toast(`${res.value.customerName}님 입금 확인 완료 · 도장 ${res.value.progress}/${STAMP_GOAL}`);
      }
      setOpenId(null);
      onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-base font-black text-deep">{roomName}</p>
      <div className="mt-3 space-y-2">
        {segments.map(seg => {
          const range = `${toHM(seg.start)} – ${toHM(seg.end)}`;
          if (seg.type === 'open') {
            return (
              <button
                key={seg.start}
                type="button"
                onClick={() =>
                  router.push(`/book?date=${date}&room=${roomId}&start=${seg.start}`)
                }
                className="flex min-h-11 w-full items-center justify-between rounded-lg bg-turf px-3 py-2.5 text-left transition-opacity active:opacity-80"
              >
                <span className="text-sm font-semibold tabular-nums">{range}</span>
                <span className="text-xs font-semibold text-fair tabular-nums">
                  비어있음 {fmtDur(seg.end - seg.start)}
                </span>
              </button>
            );
          }

          const r = seg.res;
          const pending = r.payment === 'pending';
          const row = (
            <>
              <span className="text-sm font-semibold tabular-nums">{range}</span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-sub tabular-nums">
                {r.customer_name} {r.people}명
                {r.payment === 'point' && (
                  <span className="rounded-md bg-flag px-1.5 py-0.5 text-[11px] font-bold text-white">
                    무료
                  </span>
                )}
                {pending && (
                  <span className="rounded-md border border-line px-1.5 py-0.5 text-[11px] font-bold text-deep">
                    입금 대기
                  </span>
                )}
              </span>
            </>
          );

          if (!pending) {
            return (
              <div
                key={seg.start}
                className="flex min-h-11 items-center justify-between rounded-lg border border-line bg-white px-3 py-2.5"
              >
                {row}
              </div>
            );
          }

          return (
            <div key={seg.start} className="rounded-lg border border-line bg-white">
              <button
                type="button"
                onClick={() => setOpenId(openId === r.id ? null : r.id)}
                className="flex min-h-11 w-full items-center justify-between px-3 py-2.5 text-left transition-opacity active:opacity-80"
              >
                {row}
              </button>
              {openId === r.id && (
                <div className="space-y-2 border-t border-line p-3">
                  <p className="text-xs text-sub">입금을 어떻게 확인할까요?</p>
                  <div className="flex gap-2">
                    <Btn
                      onClick={() => confirm(r.id, 'manual')}
                      disabled={busy}
                      className="flex-1"
                    >
                      입금 확인
                    </Btn>
                    <Btn
                      tone="flag"
                      onClick={() => confirm(r.id, 'point')}
                      disabled={busy || r.customer_coupons < 1}
                      className="flex-1"
                    >
                      포인트 사용{r.customer_coupons > 0 ? ` (무료 ${r.customer_coupons}회)` : ' (없음)'}
                    </Btn>
                  </div>
                  <p className="text-[11px] leading-relaxed text-sub">
                    입금 확인은 도장 1개가 적립되고, 포인트 사용은 무료 예약권 1장이 차감되며 도장이 적립되지 않습니다.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
