'use server';

import { pool } from '@/lib/server/db';
import { STAMP_GOAL } from '@/lib/constants';
import { needMin } from '@/lib/time';
import type { ReservationRow } from '@/lib/types';

export async function listByDate(date: string): Promise<ReservationRow[]> {
  const { rows } = await pool().query(
    `select r.id, r.date, r.room_id, r.start_min, r.end_min, r.customer_id,
            r.people, r.is_free, c.name as customer_name
     from reservations r
     join customers c on c.id = r.customer_id
     where r.date = $1
     order by r.room_id, r.start_min`,
    [date],
  );
  return rows;
}

export interface BookingInput {
  date: string;
  room_id: number;
  start_min: number;
  people: number;
  last4: string;
  use_free: boolean;
}

export async function createReservation(
  input: BookingInput,
): Promise<
  | { ok: true; customerName: string; cardCompleted: boolean }
  | { ok: false; error: string }
> {
  const need = needMin(input.people);
  const end = input.start_min + need;
  const client = await pool().connect();
  try {
    await client.query('begin');
    // 같은 방·날짜의 동시 예약을 직렬화 (겹침 검사 사이의 레이스 방지)
    await client.query('select pg_advisory_xact_lock(hashtext($1))', [
      `${input.date}:${input.room_id}`,
    ]);

    const cust = await client.query(
      'select id, name, used_coupons from customers where last4 = $1 for update',
      [input.last4],
    );
    if (!cust.rows.length) {
      await client.query('rollback');
      return { ok: false, error: '등록되지 않은 번호입니다. 고객 등록에서 먼저 추가해 주세요.' };
    }
    const stamps = await client.query(
      'select count(*)::int as total from stamps where customer_id = $1',
      [cust.rows[0].id],
    );
    const c = { ...cust.rows[0], total: stamps.rows[0].total };

    const overlap = await client.query(
      `select 1 from reservations
       where room_id = $1 and date = $2 and start_min < $3 and $4 < end_min
       limit 1`,
      [input.room_id, input.date, end, input.start_min],
    );
    if (overlap.rows.length) {
      await client.query('rollback');
      return { ok: false, error: '방금 다른 예약이 잡혔습니다. 시간을 다시 골라주세요.' };
    }

    if (input.use_free && Math.floor(c.total / STAMP_GOAL) - c.used_coupons < 1) {
      await client.query('rollback');
      return { ok: false, error: '사용 가능한 무료 예약권이 없습니다.' };
    }

    await client.query(
      `insert into reservations (date, room_id, start_min, end_min, customer_id, people, is_free)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [input.date, input.room_id, input.start_min, end, c.id, input.people, input.use_free],
    );

    let cardCompleted = false;
    if (input.use_free) {
      await client.query('update customers set used_coupons = used_coupons + 1 where id = $1', [c.id]);
    } else {
      await client.query('insert into stamps (customer_id, date) values ($1,$2)', [c.id, input.date]);
      cardCompleted = (c.total + 1) % STAMP_GOAL === 0;
    }
    await client.query('commit');
    return { ok: true, customerName: c.name, cardCompleted };
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
