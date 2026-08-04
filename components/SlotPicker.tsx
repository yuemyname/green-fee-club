'use client';

import { toHM } from '@/lib/time';

/** 방 하나의 시작 가능 시간 칩 목록 */
export default function SlotPicker({
  roomName,
  slots,
  need,
  selected,
  onSelect,
}: {
  roomName: string;
  slots: number[];
  need: number;
  selected: number | null;
  onSelect: (start: number) => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-base font-black text-deep">{roomName}</p>
      {slots.length === 0 ? (
        <p className="mt-3 text-sm text-sub">
          이 인원으로 들어갈 시간이 없습니다. 날짜를 바꿔보세요.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
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
      )}
    </div>
  );
}
