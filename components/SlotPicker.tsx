'use client';

import { toHM } from '@/lib/time';

/** 방 하나의 예약된 시간대 + 시작 가능 시간 칩 목록 */
export default function SlotPicker({
  roomName,
  slots,
  busy,
  need,
  selected,
  onSelect,
}: {
  roomName: string;
  slots: number[];
  busy: { start: number; end: number; label?: string }[];
  need: number;
  selected: number | null;
  onSelect: (start: number) => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-base font-black text-deep">{roomName}</p>

      {busy.length > 0 && (
        <>
          <p className="mt-3 text-xs font-semibold text-sub">예약할 수 없는 시간</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {busy.map(b => (
              <span
                key={b.start}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-turf px-3 text-sm font-semibold text-sub tabular-nums"
              >
                {b.label && <b className="text-xs font-bold">{b.label}</b>}
                <span className="line-through">{toHM(b.start)} – {toHM(b.end)}</span>
              </span>
            ))}
          </div>
        </>
      )}

      {slots.length === 0 ? (
        <p className="mt-3 text-sm text-sub">
          이 인원으로 들어갈 시간이 없습니다. 날짜를 바꿔보세요.
        </p>
      ) : (
        <>
          <p className="mt-3 text-xs font-semibold text-sub">
            시작 가능 시간 — 원하는 시작 시간을 <b className="text-fair">하나만</b> 고르세요
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {slots.map(s => {
              const active = selected === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSelect(s)}
                  className={`min-h-11 rounded-lg border px-3 text-sm font-semibold tabular-nums transition-opacity active:opacity-80 ${
                    active ? 'border-fair bg-fair text-white' : 'border-line bg-white text-ink'
                  }`}
                >
                  {toHM(s)} – {toHM(s + need)}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
