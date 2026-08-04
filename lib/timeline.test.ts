import { describe, it, expect } from 'vitest';
import { buildTimeline, slotsFor } from './timeline';
import { OPEN, CLOSE } from './constants';
import type { Reservation } from './types';

const res = (room_id: number, date: string, start_min: number, end_min: number): Reservation => ({
  id: 0,
  date,
  room_id,
  start_min,
  end_min,
  customer_id: 1,
  people: 1,
  is_free: false,
});

describe('buildTimeline', () => {
  it('예약 0건이면 하루 전체가 하나의 빈 구간이다', () => {
    const segs = buildTimeline([], 1, '20260804');
    expect(segs).toEqual([{ type: 'open', start: OPEN, end: CLOSE }]);
  });

  it('종일 예약이면 빈 구간이 없다', () => {
    const r = res(1, '20260804', OPEN, CLOSE);
    const segs = buildTimeline([r], 1, '20260804');
    expect(segs).toHaveLength(1);
    expect(segs[0].type).toBe('busy');
  });

  it('예약 사이 빈 구간을 빈틈없이 채운다', () => {
    const list = [res(1, '20260804', 600, 730), res(1, '20260804', 840, 1100)];
    const segs = buildTimeline(list, 1, '20260804');
    expect(segs.map(s => [s.type, s.start, s.end])).toEqual([
      ['open', 480, 600],
      ['busy', 600, 730],
      ['open', 730, 840],
      ['busy', 840, 1100],
      ['open', 1100, 1440],
    ]);
  });

  it('다른 방/날짜 예약은 무시한다', () => {
    const list = [res(2, '20260804', 600, 730), res(1, '20260805', 600, 730)];
    const segs = buildTimeline(list, 1, '20260804');
    expect(segs).toEqual([{ type: 'open', start: OPEN, end: CLOSE }]);
  });
});

describe('slotsFor', () => {
  it('빈 구간이 필요 시간보다 짧으면 슬롯이 없다', () => {
    const segs = buildTimeline([res(1, 'd', 480 + 60, CLOSE)], 1, 'd'); // 빈 구간 60분
    expect(slotsFor(segs, 70)).toEqual([]);
  });

  it('딱 맞는 구간은 시작 시각 1개를 준다', () => {
    // 480~550 = 70분, need 70 → 480 하나
    const segs = buildTimeline([res(1, 'd', 550, CLOSE)], 1, 'd');
    expect(slotsFor(segs, 70)).toEqual([480]);
  });

  it('시작을 30분 단위로 올림하고 30분씩 증가한다', () => {
    // 예약 480~500 → 빈 구간 500~1440, 시작 510부터
    const segs = buildTimeline([res(1, 'd', 480, 500)], 1, 'd');
    const slots = slotsFor(segs, 70);
    expect(slots[0]).toBe(510);
    expect(slots[1]).toBe(540);
  });

  it('구간당 최대 8개까지만 준다', () => {
    const segs = buildTimeline([], 1, 'd'); // 480~1440
    expect(slotsFor(segs, 70)).toHaveLength(8);
  });

  it('종일 예약이면 슬롯이 없다', () => {
    const segs = buildTimeline([res(1, 'd', OPEN, CLOSE)], 1, 'd');
    expect(slotsFor(segs, 70)).toEqual([]);
  });
});
