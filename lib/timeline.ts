import { OPEN, CLOSE } from './constants';
import type { Reservation } from './types';

export type Segment<R extends Reservation = Reservation> =
  | { type: 'open'; start: number; end: number }
  | { type: 'busy'; start: number; end: number; res: R };

/** 하루(08:00~24:00)를 빈 구간/예약 구간 세그먼트로 빈틈없이 채운다 */
export function buildTimeline<R extends Reservation>(
  reservations: R[],
  roomId: number,
  date: string,
): Segment<R>[] {
  const list = reservations
    .filter(r => r.room_id === roomId && r.date === date)
    .sort((a, b) => a.start_min - b.start_min);

  const segs: Segment<R>[] = [];
  let cur = OPEN;
  for (const r of list) {
    if (r.start_min > cur) segs.push({ type: 'open', start: cur, end: r.start_min });
    segs.push({ type: 'busy', start: r.start_min, end: r.end_min, res: r });
    cur = Math.max(cur, r.end_min);
  }
  if (cur < CLOSE) segs.push({ type: 'open', start: cur, end: CLOSE });
  return segs;
}

/** 필요 시간이 들어가는 시작 가능 시각 목록 — 30분 단위, 구간당 최대 8개 */
export function slotsFor(timeline: Segment[], need: number): number[] {
  const out: number[] = [];
  for (const g of timeline) {
    if (g.type !== 'open' || g.end - g.start < need) continue;
    let s = Math.ceil(g.start / 30) * 30;
    for (let n = 0; s + need <= g.end && n < 8; n++, s += 30) out.push(s);
  }
  return out;
}
