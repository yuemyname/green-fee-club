import { describe, it, expect } from 'vitest';
import { toHM, fmtDur, fmtDate, shiftDate, needMin } from './time';

describe('toHM', () => {
  it('분을 HH:MM으로 변환한다', () => {
    expect(toHM(510)).toBe('08:30');
    expect(toHM(480)).toBe('08:00');
    expect(toHM(1440)).toBe('24:00');
    expect(toHM(605)).toBe('10:05');
  });
});

describe('fmtDur', () => {
  it('60분 미만은 분으로 표시한다', () => {
    expect(fmtDur(50)).toBe('50분');
    expect(fmtDur(59)).toBe('59분');
  });
  it('60분 이상은 소수 1자리 시간, .0은 제거한다', () => {
    expect(fmtDur(500)).toBe('8.3시간');
    expect(fmtDur(60)).toBe('1시간');
    expect(fmtDur(120)).toBe('2시간');
    expect(fmtDur(260)).toBe('4.3시간');
    expect(fmtDur(70)).toBe('1.2시간');
  });
});

describe('fmtDate / shiftDate', () => {
  it('yyyymmdd를 점 표기로 바꾼다', () => {
    expect(fmtDate('20260804')).toBe('2026.08.04');
  });
  it('하루 이동, 월/년 경계를 넘는다', () => {
    expect(shiftDate('20260804', 1)).toBe('20260805');
    expect(shiftDate('20260804', -1)).toBe('20260803');
    expect(shiftDate('20260831', 1)).toBe('20260901');
    expect(shiftDate('20261231', 1)).toBe('20270101');
    expect(shiftDate('20260301', -1)).toBe('20260228');
  });
});

describe('needMin', () => {
  it('1인 63분 기준 10분 단위 올림', () => {
    expect(needMin(1)).toBe(70);
    expect(needMin(2)).toBe(130);
    expect(needMin(3)).toBe(190);
    expect(needMin(4)).toBe(260);
    expect(needMin(5)).toBe(320);
    expect(needMin(6)).toBe(380);
  });
});
