'use client';

import { useEffect, useRef } from 'react';

export const WHEEL_ROW = 40;      // 한 줄 높이(px)
export const WHEEL_VISIBLE = 5;   // 보이는 줄 수 — 가운데 줄이 선택된 값

/**
 * 스크롤로 값을 고르는 휠 한 칸.
 * 가운데로 스냅되며, 멈추면 그 줄의 값을 알린다. 줄을 눌러서 고를 수도 있다.
 * 부모가 값을 다른 값으로 바꾸거나(예약 불가 → 보정) 그대로 두면
 * 스크롤 위치를 항상 값에 다시 맞춘다.
 */
export default function Wheel({
  items, value, onChange, label,
}: {
  items: { value: number; label: string }[];
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moving = useRef(false);   // 프로그램이 옮기는 중 — 그 사이 스크롤은 값으로 읽지 않는다
  const unlock = useRef<ReturnType<typeof setTimeout> | null>(null);

  const index = Math.max(0, items.findIndex(i => i.value === value));
  const indexRef = useRef(index);
  indexRef.current = index;

  const scrollToIndex = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = i * WHEEL_ROW;
    if (Math.abs(el.scrollTop - top) <= 1) return;
    moving.current = true;
    if (unlock.current) clearTimeout(unlock.current);
    unlock.current = setTimeout(() => { moving.current = false; }, 700);
    el.scrollTo({ top, behavior: 'smooth' });
  };

  // 값이 바뀌면 그 줄을 가운데로 맞춘다
  useEffect(() => {
    scrollToIndex(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items.length]);

  // 스크롤이 멈춘 뒤 가운데 줄을 값으로 확정한다
  const settle = () => {
    const el = ref.current;
    if (!el) return;
    if (moving.current) {
      // 목표 줄에 닿았으면 다시 사용자 스크롤을 받는다
      if (Math.abs(el.scrollTop - indexRef.current * WHEEL_ROW) <= 1) moving.current = false;
      return;
    }
    const i = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / WHEEL_ROW)));
    const v = items[i]?.value;
    if (v !== undefined && v !== value) onChange(v);
    // 부모가 값을 그대로 뒀다면(같은 시각으로 되돌린 경우) 스크롤도 되돌린다
    setTimeout(() => scrollToIndex(indexRef.current), 60);
  };

  return (
    <div
      ref={ref}
      aria-label={label}
      onScroll={() => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(settle, 120);
      }}
      className="no-scrollbar snap-y snap-mandatory overflow-y-auto overscroll-contain"
      style={{ height: WHEEL_ROW * WHEEL_VISIBLE }}
    >
      <div
        style={{
          paddingTop: WHEEL_ROW * Math.floor(WHEEL_VISIBLE / 2),
          paddingBottom: WHEEL_ROW * Math.floor(WHEEL_VISIBLE / 2),
        }}
      >
        {items.map(it => {
          const active = it.value === value;
          return (
            <button
              key={it.value}
              type="button"
              aria-label={`${label} ${it.label}`}
              aria-current={active}
              // 클릭으로 포커스가 잡히면 브라우저가 그 줄을 스스로 스크롤해
              // 우리가 맞춰둔 위치를 덮어쓴다. 마우스 포커스만 막는다.
              onMouseDown={e => e.preventDefault()}
              onClick={() => onChange(it.value)}
              className={`flex w-full snap-center items-center justify-center text-xl tabular-nums transition-colors ${
                active ? 'font-black text-fair' : 'font-semibold text-sub/50'
              }`}
              style={{ height: WHEEL_ROW }}
            >
              {it.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
