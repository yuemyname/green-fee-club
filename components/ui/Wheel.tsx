'use client';

import { useEffect, useRef } from 'react';

export const WHEEL_ROW = 40;      // 한 줄 높이(px)
export const WHEEL_VISIBLE = 5;   // 보이는 줄 수 — 가운데 줄이 선택된 값

/**
 * 스크롤로 값을 고르는 휠 한 칸.
 * 가운데로 스냅되며, 멈추면 그 줄의 값을 알린다. 줄을 눌러서 고를 수도 있다.
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
  const index = Math.max(0, items.findIndex(i => i.value === value));

  // 값이 바뀌면 그 줄을 가운데로 맞춘다
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const top = index * WHEEL_ROW;
    if (Math.abs(el.scrollTop - top) > 1) el.scrollTo({ top });
  }, [index, items.length]);

  // 스크롤이 멈춘 뒤 가운데 줄을 값으로 확정한다
  const settle = () => {
    const el = ref.current;
    if (!el) return;
    const i = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / WHEEL_ROW)));
    const v = items[i]?.value;
    if (v !== undefined && v !== value) onChange(v);
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
