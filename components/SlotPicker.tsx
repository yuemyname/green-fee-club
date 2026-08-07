'use client';

import { useState } from 'react';
import { fmtDur, toHM } from '@/lib/time';
import Btn from '@/components/ui/Btn';
import Wheel, { WHEEL_ROW, WHEEL_VISIBLE } from '@/components/ui/Wheel';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * 방 하나의 예약 카드 — 접힌 상태에서는 예약 가능 개수만,
 * 펼치면 예약 불가 시간과 시·분 휠을 보여준다.
 * 휠에는 실제로 고를 수 있는 시각만 올라간다.
 */
export default function SlotPicker({
  roomName,
  slots,
  busy,
  need,
  selected,
  onSelect,
  expanded,
  onToggle,
}: {
  roomName: string;
  slots: number[];
  busy: { start: number; end: number; label?: string }[];
  need: number;
  selected: number | null;
  onSelect: (start: number) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  // 아직 확정하지 않은 휠 값. selected가 있으면 그쪽이 우선이다.
  const [draft, setDraft] = useState<number | null>(null);
  const wanted = selected ?? draft;
  const value = wanted !== null && slots.includes(wanted) ? wanted : (slots[0] ?? null);

  const hours = [...new Set(slots.map(s => Math.floor(s / 60)))].sort((a, b) => a - b);
  const minutes = value === null
    ? []
    : slots.filter(s => Math.floor(s / 60) === Math.floor(value / 60)).map(s => s % 60);

  const pick = (start: number) => {
    setDraft(start);
    if (selected !== null) onSelect(start);  // 이미 고른 방이면 바로 반영
  };

  // 시를 바꾸면 그 시간대에서 지금 분과 가장 가까운 시각으로 옮긴다
  const pickHour = (h: number) => {
    if (value === null) return;
    const cur = value % 60;
    const cand = slots.filter(s => Math.floor(s / 60) === h);
    if (!cand.length) return;
    pick(cand.reduce((a, b) => (Math.abs((b % 60) - cur) < Math.abs((a % 60) - cur) ? b : a)));
  };

  return (
    <div className="rounded-xl border border-line bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-14 w-full items-center justify-between px-4 py-3 text-left transition-opacity active:opacity-80"
      >
        <span className="text-base font-black text-deep">{roomName}</span>
        <span className="flex items-center gap-2 text-xs font-semibold tabular-nums">
          {selected !== null ? (
            <span className="rounded-md bg-fair px-1.5 py-0.5 text-white whitespace-nowrap">
              {toHM(selected)} – {toHM(selected + need)} 선택
            </span>
          ) : slots.length > 0 ? (
            <span className="text-fair whitespace-nowrap">예약 가능 {slots.length}개</span>
          ) : (
            <span className="text-sub whitespace-nowrap">가능한 시간 없음</span>
          )}
          <span className="text-base text-sub">{expanded ? '▴' : '▾'}</span>
        </span>
      </button>

      {expanded && (
        <div className="border-t border-line px-4 pb-4">
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

          {value === null ? (
            <p className="mt-3 text-sm text-sub">
              이 인원으로 들어갈 시간이 없습니다. 날짜를 바꿔보세요.
            </p>
          ) : (
            <>
              <p className="mt-3 text-xs font-semibold text-sub">
                시작 시간 — 위아래로 굴려 <b className="text-fair">시작 시각</b>을 맞추세요
              </p>

              <div className="relative mt-1.5">
                {/* 가운데 선택 줄 */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 border-y border-line bg-turf/50"
                  style={{
                    top: WHEEL_ROW * Math.floor(WHEEL_VISIBLE / 2),
                    height: WHEEL_ROW,
                  }}
                />
                <div className="relative flex items-stretch">
                  <div className="flex-1">
                    <Wheel
                      label="시"
                      items={hours.map(h => ({ value: h, label: pad(h) }))}
                      value={Math.floor(value / 60)}
                      onChange={pickHour}
                    />
                  </div>
                  <span
                    className="shrink-0 self-start text-center text-xl font-black text-deep"
                    style={{
                      height: WHEEL_ROW,
                      lineHeight: `${WHEEL_ROW}px`,
                      marginTop: WHEEL_ROW * Math.floor(WHEEL_VISIBLE / 2),
                    }}
                  >
                    :
                  </span>
                  <div className="flex-1">
                    <Wheel
                      label="분"
                      items={minutes.map(m => ({ value: m, label: pad(m) }))}
                      value={value % 60}
                      onChange={m => pick(Math.floor(value / 60) * 60 + m)}
                    />
                  </div>
                </div>
              </div>

              <p className="mt-2 text-center text-sm font-bold text-fair tabular-nums">
                {toHM(value)} – {toHM(value + need)} · {fmtDur(need)}
              </p>

              {selected === null && (
                <Btn onClick={() => onSelect(value)} className="mt-2 w-full">
                  이 시간으로 선택
                </Btn>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
