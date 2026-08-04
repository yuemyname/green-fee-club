'use client';

import { useRouter } from 'next/navigation';
import type { Segment } from '@/lib/timeline';
import { fmtDur, toHM } from '@/lib/time';
import type { DB } from '@/lib/types';

/** 하루 타임라인을 세그먼트 리스트로. 빈 구간 클릭 시 /book 프리필 이동 */
export default function RoomTimeline({
  db,
  segments,
  roomId,
  roomName,
  date,
}: {
  db: DB;
  segments: Segment[];
  roomId: number;
  roomName: string;
  date: string;
}) {
  const router = useRouter();

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
          const customer = db.customers.find(c => c.id === seg.res.customer_id);
          return (
            <div
              key={seg.start}
              className="flex min-h-11 items-center justify-between rounded-lg border border-line bg-white px-3 py-2.5"
            >
              <span className="text-sm font-semibold tabular-nums">{range}</span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-sub tabular-nums">
                {customer?.name} {seg.res.people}명
                {seg.res.is_free && (
                  <span className="rounded-md bg-flag px-1.5 py-0.5 text-[11px] font-bold text-white">
                    무료
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
