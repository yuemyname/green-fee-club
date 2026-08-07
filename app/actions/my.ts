'use server';

import { pool } from '@/lib/server/db';
import {
  clearCustomerSession, customerId, setCustomerSession,
} from '@/lib/server/auth';
import { insertReservation, validateSlot } from '@/lib/server/booking';
import { STAMP_GOAL } from '@/lib/constants';
import { needMin } from '@/lib/time';
import type { Block, CouponUse, CustomerOverview, PaymentState, Room } from '@/lib/types';

type Result = { ok: true } | { ok: false; error: string };

/**
 * 고객 시작 — 전화번호 하나로 등록/로그인을 한 번에 처리한다.
 * 처음 온 번호면 '손님XXXX'라는 이름으로 자동 등록하고, 아니면 그 고객으로 로그인.
 */
export async function startCustomerSession(
  phoneDigits: string,
): Promise<{ ok: true; name: string; isNew: boolean } | { ok: false; error: string }> {
  if (!/^\d{11}$/.test(phoneDigits)) {
    return { ok: false, error: '전화번호는 숫자 11자리로 입력해 주세요.' };
  }
  const last4 = phoneDigits.slice(-4);
  const phone = `${phoneDigits.slice(0, 3)}-${phoneDigits.slice(3, 7)}-${phoneDigits.slice(7, 11)}`;

  // 전체 번호가 고유 식별자 — 뒤 4자리가 같아도 번호가 다르면 별도 고객
  const found = await pool().query(
    `select id, name from customers where deleted_at is null and replace(phone, '-', '') = $1 limit 1`,
    [phoneDigits],
  );
  if (found.rows.length) {
    const c = found.rows[0];
    await setCustomerSession(c.id);
    return { ok: true, name: c.name, isNew: false };
  }

  const created = await pool().query(
    'insert into customers (name, phone, last4) values ($1,$2,$3) returning id, name',
    [`손님${last4}`, phone, last4],
  );
  await setCustomerSession(created.rows[0].id);
  return { ok: true, name: created.rows[0].name, isNew: true };
}

export async function customerLogout(): Promise<void> {
  await clearCustomerSession();
}

export interface MyReservation {
  id: number;
  date: string;
  room_id: number;
  room_name: string | null;
  start_min: number;
  end_min: number;
  people: number;
  payment: PaymentState;
}

export interface MyPage {
  customer: CustomerOverview;
  stampDates: string[];
  couponUses: CouponUse[];
  reservations: MyReservation[]; // 최신순
}

export async function getMyPage(): Promise<MyPage | null> {
  const cid = await customerId();
  if (cid === null) return null;

  const [cust, dates, uses, resv] = await Promise.all([
    pool().query(
      `select c.id, c.name, c.phone, c.last4, c.used_coupons,
              count(s.id)::int as total
       from customers c left join stamps s on s.customer_id = c.id and s.deleted_at is null
       where c.id = $1 and c.deleted_at is null group by c.id`,
      [cid],
    ),
    pool().query(
      'select date from stamps where customer_id = $1 and deleted_at is null order by created_at, id',
      [cid],
    ),
    pool().query(
      `select r.date, r.start_min, r.end_min, rm.name as room_name
       from reservations r
       left join rooms rm on rm.id = r.room_id
       where r.customer_id = $1 and r.deleted_at is null and r.payment = 'point'
       order by r.paid_at nulls first, r.id`,
      [cid],
    ),
    pool().query(
      `select r.id, r.date, r.room_id, rm.name as room_name,
              r.start_min, r.end_min, r.people, r.payment
       from reservations r
       left join rooms rm on rm.id = r.room_id
       where r.customer_id = $1 and r.deleted_at is null
       order by r.date desc, r.start_min desc
       limit 30`,
      [cid],
    ),
  ]);
  if (!cust.rows.length) return null;

  const c = cust.rows[0];
  return {
    customer: {
      id: c.id,
      name: c.name,
      phone: c.phone,
      last4: c.last4,
      totalStamps: c.total,
      progress: c.total % STAMP_GOAL,
      coupons: Math.floor(c.total / STAMP_GOAL) - c.used_coupons,
    },
    stampDates: dates.rows.map(r => r.date),
    couponUses: uses.rows,
    reservations: resv.rows,
  };
}

/** 해당 월(yyyymm)에서 내 예약이 있는 날짜 목록 */
export async function myMonthReservedDates(month: string): Promise<string[]> {
  const cid = await customerId();
  if (cid === null || !/^\d{6}$/.test(month)) return [];
  const { rows } = await pool().query(
    `select distinct date from reservations
     where deleted_at is null and customer_id = $1
       and date >= $2 || '01' and date <= $2 || '31'`,
    [cid, month],
  );
  return rows.map(r => r.date);
}

export interface MyBoard {
  rooms: Room[];
  blocks: Block[];
  // 다른 고객 정보 없이 시간만 — mine이면 내 예약 (변경 시 겹침 제외용)
  busy: { id: number; date: string; room_id: number; start_min: number; end_min: number; mine: boolean }[];
  coupons: number;
}

export async function myBoard(date: string): Promise<MyBoard | null> {
  const cid = await customerId();
  if (cid === null) return null;

  const [rooms, blocks, resv, cust] = await Promise.all([
    pool().query(
      `select id, name, open_min, close_min, active from rooms
       where deleted_at is null and active order by id`,
    ),
    pool().query(
      `select id, room_id, label, date, start_min, end_min
       from blocks where deleted_at is null and (date is null or date = $1) order by start_min`,
      [date],
    ),
    pool().query(
      `select id, date, room_id, start_min, end_min, customer_id
       from reservations where deleted_at is null and date = $1 order by room_id, start_min`,
      [date],
    ),
    pool().query(
      `select ((select count(*) from stamps s where s.customer_id = c.id and s.deleted_at is null)::int / ${STAMP_GOAL}
               - c.used_coupons) as coupons
       from customers c where c.id = $1 and c.deleted_at is null`,
      [cid],
    ),
  ]);
  if (!cust.rows.length) return null;

  return {
    rooms: rooms.rows,
    blocks: blocks.rows,
    busy: resv.rows.map(r => ({
      id: r.id,
      date: r.date,
      room_id: r.room_id,
      start_min: r.start_min,
      end_min: r.end_min,
      mine: r.customer_id === cid,
    })),
    coupons: cust.rows[0].coupons,
  };
}

export interface MyBookingInput {
  date: string;
  room_id: number;
  start_min: number;
  people: number;
  use_free: boolean;
}

export async function myCreateReservation(input: MyBookingInput): Promise<Result> {
  const cid = await customerId();
  if (cid === null) return { ok: false, error: '로그인이 필요합니다.' };
  const client = await pool().connect();
  try {
    await client.query('begin');
    await client.query('select pg_advisory_xact_lock(hashtext($1))', [
      `${input.date}:${input.room_id}`,
    ]);
    const err = await insertReservation(client, cid, input);
    if (err) {
      await client.query('rollback');
      return { ok: false, error: err };
    }
    await client.query('commit');
    return { ok: true };
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** 내 예약 시간 변경 — 입금 확인이 끝난(manual) 예약은 매장 문의 */
export async function myUpdateReservation(
  reservationId: number,
  input: { date: string; room_id: number; start_min: number; people: number },
): Promise<Result> {
  const cid = await customerId();
  if (cid === null) return { ok: false, error: '로그인이 필요합니다.' };
  const client = await pool().connect();
  try {
    await client.query('begin');
    await client.query('select pg_advisory_xact_lock(hashtext($1))', [
      `${input.date}:${input.room_id}`,
    ]);
    const found = await client.query(
      'select customer_id, payment from reservations where id = $1 and deleted_at is null for update',
      [reservationId],
    );
    if (!found.rows.length || found.rows[0].customer_id !== cid) {
      await client.query('rollback');
      return { ok: false, error: '예약을 찾을 수 없습니다.' };
    }
    if (found.rows[0].payment === 'manual') {
      await client.query('rollback');
      return { ok: false, error: '입금 확인이 끝난 예약입니다. 변경은 매장에 문의해 주세요.' };
    }
    const err = await validateSlot(client, input, reservationId);
    if (err) {
      await client.query('rollback');
      return { ok: false, error: err };
    }
    const end = input.start_min + needMin(input.people);
    await client.query(
      `update reservations
       set date = $2, room_id = $3, start_min = $4, end_min = $5, people = $6
       where id = $1`,
      [reservationId, input.date, input.room_id, input.start_min, end, input.people],
    );
    await client.query('commit');
    return { ok: true };
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** 내 예약 취소 — 무료 예약권으로 잡은 예약은 예약권을 돌려준다 */
export async function myCancelReservation(
  reservationId: number,
): Promise<{ ok: true; refunded: boolean } | { ok: false; error: string }> {
  const cid = await customerId();
  if (cid === null) return { ok: false, error: '로그인이 필요합니다.' };
  const client = await pool().connect();
  try {
    await client.query('begin');
    const found = await client.query(
      'select customer_id, payment from reservations where id = $1 and deleted_at is null for update',
      [reservationId],
    );
    if (!found.rows.length || found.rows[0].customer_id !== cid) {
      await client.query('rollback');
      return { ok: false, error: '예약을 찾을 수 없습니다.' };
    }
    if (found.rows[0].payment === 'manual') {
      await client.query('rollback');
      return { ok: false, error: '입금 확인이 끝난 예약입니다. 취소는 매장에 문의해 주세요.' };
    }
    const refunded = found.rows[0].payment === 'point';
    if (refunded) {
      await client.query(
        'update customers set used_coupons = greatest(used_coupons - 1, 0) where id = $1',
        [cid],
      );
    }
    await client.query('update reservations set deleted_at = now() where id = $1', [reservationId]);
    await client.query('commit');
    return { ok: true, refunded };
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
