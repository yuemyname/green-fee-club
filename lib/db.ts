'use client';

import { useSyncExternalStore } from 'react';
import { STAMP_GOAL } from './constants';
import { needMin, todayStr, shiftDate } from './time';
import type { Customer, DB, Reservation } from './types';

const KEY = 'greenround:v1';

let cache: DB | null = null;
const listeners = new Set<() => void>();

function seed(): DB {
  const today = todayStr();
  const yesterday = shiftDate(today, -1);
  const db: DB = { customers: [], stamps: [], reservations: [], seq: 1 };

  const add = (name: string, phone: string, stampDates: string[], used = 0) => {
    const digits = phone.replace(/\D/g, '');
    const c: Customer = {
      id: db.seq++,
      name,
      phone: formatPhone(digits),
      last4: digits.slice(-4),
      used_coupons: used,
      created_at: new Date().toISOString(),
    };
    db.customers.push(c);
    for (const d of stampDates) {
      db.stamps.push({ id: db.seq++, customer_id: c.id, date: d, created_at: new Date().toISOString() });
    }
    return c;
  };

  const days = (n: number) => Array.from({ length: n }, (_, i) => shiftDate(today, -(n - i)));

  const c1 = add('정승우', '01053971406', days(17));          // 쿠폰 1장 + 진행 7칸
  const c2 = add('김민지', '01041127788', days(7));           // 진행 7칸
  const c3 = add('박도윤', '01098305522', days(10));          // 쿠폰 1장, 새 카드 0칸
  add('이서연', '01026743314', days(3));                      // 진행 3칸

  db.reservations.push(
    { id: db.seq++, date: today, room_id: 1, start_min: 600, end_min: 730, customer_id: c2.id, people: 2, is_free: false, created_at: new Date().toISOString() },
    { id: db.seq++, date: today, room_id: 2, start_min: 840, end_min: 1100, customer_id: c1.id, people: 4, is_free: false, created_at: new Date().toISOString() },
    { id: db.seq++, date: yesterday, room_id: 1, start_min: 1140, end_min: 1210, customer_id: c3.id, people: 1, is_free: true, created_at: new Date().toISOString() },
  );
  return db;
}

function load(): DB {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      cache = JSON.parse(raw) as DB;
      return cache;
    }
  } catch {
    // 손상된 데이터는 시드로 대체
  }
  cache = seed();
  persist();
  return cache;
}

function persist() {
  if (cache) localStorage.setItem(KEY, JSON.stringify(cache));
}

function emit() {
  persist();
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** 클라이언트 마운트 후 DB 스냅샷. SSR 중에는 null. */
export function useDB(): DB | null {
  return useSyncExternalStore(
    subscribe,
    () => load(),
    () => null,
  );
}

// ---------- 파생 값 ----------

export function totalStamps(db: DB, customerId: number): number {
  return db.stamps.filter(s => s.customer_id === customerId).length;
}

export function cardProgress(db: DB, customerId: number): number {
  return totalStamps(db, customerId) % STAMP_GOAL;
}

export function coupons(db: DB, c: Customer): number {
  return Math.floor(totalStamps(db, c.id) / STAMP_GOAL) - c.used_coupons;
}

export function findByLast4(db: DB, last4: string): Customer | undefined {
  return db.customers.find(c => c.last4 === last4);
}

export function stampDates(db: DB, customerId: number): string[] {
  return db.stamps
    .filter(s => s.customer_id === customerId)
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
    .map(s => s.date);
}

export function formatPhone(digits: string): string {
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

// ---------- 변경 ----------

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function mutate<T>(fn: (db: DB) => Result<T>): Result<T> {
  const db = load();
  const next: DB = structuredClone(db);
  const res = fn(next);
  if (res.ok) {
    cache = next;
    emit();
  }
  return res;
}

export function createCustomer(name: string, phoneDigits: string): Result<Customer> {
  return mutate(db => {
    const trimmed = name.trim();
    if (trimmed.length < 1) return { ok: false, error: '이름을 입력해 주세요.' };
    if (!/^\d{11}$/.test(phoneDigits)) return { ok: false, error: '전화번호는 숫자 11자리로 입력해 주세요.' };
    const last4 = phoneDigits.slice(-4);
    if (db.customers.some(c => c.last4 === last4)) {
      return { ok: false, error: '이미 같은 뒤 4자리 고객이 있습니다.' };
    }
    const c: Customer = {
      id: db.seq++,
      name: trimmed,
      phone: formatPhone(phoneDigits),
      last4,
      used_coupons: 0,
      created_at: new Date().toISOString(),
    };
    db.customers.push(c);
    return { ok: true, value: c };
  });
}

export interface StampResult {
  customer: Customer;
  total: number;
  progress: number;      // 도장 후 현재 카드 칸 수 (10개째면 10)
  cardCompleted: boolean;
}

export function addStamp(last4: string, date: string): Result<StampResult> {
  return mutate(db => {
    const c = findByLast4(db, last4);
    if (!c) return { ok: false, error: '등록되지 않은 번호입니다. 고객 등록에서 먼저 추가해 주세요.' };
    db.stamps.push({ id: db.seq++, customer_id: c.id, date, created_at: new Date().toISOString() });
    const total = totalStamps(db, c.id);
    const completed = total % STAMP_GOAL === 0;
    return {
      ok: true,
      value: {
        customer: c,
        total,
        progress: completed ? STAMP_GOAL : total % STAMP_GOAL,
        cardCompleted: completed,
      },
    };
  });
}

export interface BookingInput {
  date: string;
  room_id: number;
  start_min: number;
  people: number;
  last4: string;
  use_free: boolean;
}

export interface BookingResult {
  reservation: Reservation;
  customer: Customer;
  cardCompleted: boolean;
}

export function createReservation(input: BookingInput): Result<BookingResult> {
  return mutate(db => {
    const c = findByLast4(db, input.last4);
    if (!c) return { ok: false, error: '등록되지 않은 번호입니다. 고객 등록에서 먼저 추가해 주세요.' };

    const need = needMin(input.people);
    const end = input.start_min + need;
    const overlap = db.reservations.some(
      r =>
        r.room_id === input.room_id &&
        r.date === input.date &&
        r.start_min < end &&
        input.start_min < r.end_min,
    );
    if (overlap) return { ok: false, error: '방금 다른 예약이 잡혔습니다. 시간을 다시 골라주세요.' };

    if (input.use_free && coupons(db, c) < 1) {
      return { ok: false, error: '사용 가능한 무료 예약권이 없습니다.' };
    }

    const r: Reservation = {
      id: db.seq++,
      date: input.date,
      room_id: input.room_id,
      start_min: input.start_min,
      end_min: end,
      customer_id: c.id,
      people: input.people,
      is_free: input.use_free,
      created_at: new Date().toISOString(),
    };
    db.reservations.push(r);

    let cardCompleted = false;
    if (input.use_free) {
      c.used_coupons += 1;
    } else {
      db.stamps.push({ id: db.seq++, customer_id: c.id, date: input.date, created_at: new Date().toISOString() });
      cardCompleted = totalStamps(db, c.id) % STAMP_GOAL === 0;
    }
    return { ok: true, value: { reservation: r, customer: c, cardCompleted } };
  });
}
