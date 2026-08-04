import { OPEN, CLOSE } from './constants';
import type { Block, Reservation } from './types';

export type Segment<R extends Reservation = Reservation> =
  | { type: 'open'; start: number; end: number }
  | { type: 'busy'; start: number; end: number; res: R }
  | { type: 'blocked'; start: number; end: number; label: string };

export interface TimelineOptions {
  open?: number;   // 방 운영 시작 (기본 OPEN)
  close?: number;  // 방 운영 종료 (기본 CLOSE)
  blocks?: Pick<Block, 'room_id' | 'label' | 'date' | 'start_min' | 'end_min'>[];
}

/**
 * 하루 운영시간을 빈 구간/예약 구간/예약 불가 구간 세그먼트로 빈틈없이 채운다.
 * 운영시간 밖이나 앞 구간과 겹치는 부분은 잘라서 표시한다.
 */
export function buildTimeline<R extends Reservation>(
  reservations: R[],
  roomId: number,
  date: string,
  opts: TimelineOptions = {},
): Segment<R>[] {
  const open = opts.open ?? OPEN;
  const close = opts.close ?? CLOSE;

  const items: { start: number; end: number; seg: Segment<R> }[] = [];
  for (const r of reservations) {
    if (r.room_id !== roomId || r.date !== date) continue;
    items.push({
      start: r.start_min,
      end: r.end_min,
      seg: { type: 'busy', start: r.start_min, end: r.end_min, res: r },
    });
  }
  for (const b of opts.blocks ?? []) {
    if (b.room_id !== null && b.room_id !== roomId) continue;
    if (b.date !== null && b.date !== date) continue;
    items.push({
      start: b.start_min,
      end: b.end_min,
      seg: { type: 'blocked', start: b.start_min, end: b.end_min, label: b.label },
    });
  }
  items.sort((a, b) => a.start - b.start);

  const segs: Segment<R>[] = [];
  let cur = open;
  for (const it of items) {
    const s = Math.max(it.start, cur);
    const e = Math.min(it.end, close);
    if (e <= s) continue;
    if (s > cur) segs.push({ type: 'open', start: cur, end: s });
    segs.push({ ...it.seg, start: s, end: e });
    cur = e;
  }
  if (cur < close) segs.push({ type: 'open', start: cur, end: close });
  return segs;
}

/** 필요 시간이 들어가는 시작 가능 시각 목록 — 30분 단위, 구간 전체 */
export function slotsFor(timeline: Segment[], need: number): number[] {
  const out: number[] = [];
  for (const g of timeline) {
    if (g.type !== 'open' || g.end - g.start < need) continue;
    let s = Math.ceil(g.start / 30) * 30;
    for (; s + need <= g.end; s += 30) out.push(s);
  }
  return out;
}
