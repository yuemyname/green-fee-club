import { MIN_PER_PERSON } from './constants';

/** 510 → '08:30' */
export function toHM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 50 → '50분', 500 → '8.3시간' (60 미만은 분, 이상은 소수 1자리 시간, .0은 제거) */
export function fmtDur(min: number): string {
  if (min < 60) return `${min}분`;
  const h = (Math.round((min / 60) * 10) / 10).toFixed(1).replace(/\.0$/, '');
  return `${h}시간`;
}

/** '20260804' → '2026.08.04' */
export function fmtDate(s: string): string {
  return `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}`;
}

/** yyyymmdd 문자열 하루 이동 */
export function shiftDate(s: string, delta: number): string {
  const d = new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/** 오늘 날짜 yyyymmdd */
export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/** 인원수 → 필요 시간(분), 10분 단위 올림 */
export function needMin(people: number): number {
  return Math.ceil((people * MIN_PER_PERSON) / 10) * 10;
}

/** '20260804' → '08/04' (스탬프 칸 표시용) */
export function toMD(s: string): string {
  return `${s.slice(4, 6)}/${s.slice(6, 8)}`;
}
