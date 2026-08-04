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

describe('buildTimeline — 운영시간·예약 불가', () => {
  const lunch = { room_id: null, label: '점심시간', date: null, start_min: 720, end_min: 780 };

  it('방별 운영시간을 반영한다', () => {
    const segs = buildTimeline([], 1, 'd', { open: 540, close: 1320 });
    expect(segs).toEqual([{ type: 'open', start: 540, end: 1320 }]);
  });

  it('매일 반복 예약 불가 구간을 끼워 넣는다', () => {
    const segs = buildTimeline([], 1, 'd', { blocks: [lunch] });
    expect(segs.map(s => [s.type, s.start, s.end])).toEqual([
      ['open', 480, 720],
      ['blocked', 720, 780],
      ['open', 780, 1440],
    ]);
  });

  it('특정 날짜 예약 불가는 그 날짜에만 적용된다', () => {
    const oneOff = { ...lunch, date: '20260805', label: '정비' };
    expect(buildTimeline([], 1, '20260804', { blocks: [oneOff] })).toEqual([
      { type: 'open', start: 480, end: 1440 },
    ]);
    const applied = buildTimeline([], 1, '20260805', { blocks: [oneOff] });
    expect(applied.some(s => s.type === 'blocked')).toBe(true);
  });

  it('특정 방 예약 불가는 다른 방에 적용되지 않는다', () => {
    const room2Only = { ...lunch, room_id: 2 };
    expect(buildTimeline([], 1, 'd', { blocks: [room2Only] })).toEqual([
      { type: 'open', start: 480, end: 1440 },
    ]);
    expect(buildTimeline([], 2, 'd', { blocks: [room2Only] }).some(s => s.type === 'blocked')).toBe(true);
  });

  it('예약과 겹치는 불가 구간은 잘려서 표시된다', () => {
    const segs = buildTimeline([res(1, 'd', 700, 750)], 1, 'd', { blocks: [lunch] });
    expect(segs.map(s => [s.type, s.start, s.end])).toEqual([
      ['open', 480, 700],
      ['busy', 700, 750],
      ['blocked', 750, 780],
      ['open', 780, 1440],
    ]);
  });

  it('운영시간 밖 구간은 잘라낸다', () => {
    const segs = buildTimeline([res(1, 'd', 480, 600)], 1, 'd', { open: 540, close: 1320 });
    expect(segs[0]).toEqual(expect.objectContaining({ type: 'busy', start: 540, end: 600 }));
  });

  it('slotsFor는 불가 구간을 피해서 시작 시각을 준다', () => {
    const segs = buildTimeline([], 1, 'd', { blocks: [lunch] });
    const slots = slotsFor(segs, 70);
    expect(slots.every(s => s + 70 <= 720 || s >= 780)).toBe(true);
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
