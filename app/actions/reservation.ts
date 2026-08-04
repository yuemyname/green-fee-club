'use server';

import { pool } from '@/lib/server/db';
import { STAMP_GOAL } from '@/lib/constants';
import { needMin } from '@/lib/time';
import type { ReservationRow } from '@/lib/types';

export async function listByDate(date: string): Promise<ReservationRow[]> {
  const { rows } = await pool().query(
    `select r.id, r.date, r.room_id, r.start_min, r.end_min, r.customer_id,
            r.people, r.is_free, r.payment, c.name as customer_name,
            ((select count(*) from stamps s where s.customer_id = c.id)::int / ${STAMP_GOAL}
              - c.used_coupons) as customer_coupons
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
): Promise<{ ok: true; customerName: string } | { ok: false; error: string }> {
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
    const c = cust.rows[0];

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

    if (input.use_free) {
      const stamps = await client.query(
        'select count(*)::int as total from stamps where customer_id = $1',
        [c.id],
      );
      if (Math.floor(stamps.rows[0].total / STAMP_GOAL) - c.used_coupons < 1) {
        await client.query('rollback');
        return { ok: false, error: '사용 가능한 무료 예약권이 없습니다.' };
      }
      await client.query('update customers set used_coupons = used_coupons + 1 where id = $1', [c.id]);
    }

    // 무료 예약권 사용은 즉시 입금 확인(point), 그 외에는 입금 대기.
    // 도장은 예약 시점이 아니라 입금 확인 시점에 적립된다.
    await client.query(
      `insert into reservations (date, room_id, start_min, end_min, customer_id, people, is_free, payment, paid_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8, case when $8 = 'pending' then null else now() end)`,
      [
        input.date, input.room_id, input.start_min, end, c.id, input.people,
        input.use_free, input.use_free ? 'point' : 'pending',
      ],
    );
    await client.query('commit');
    return { ok: true, customerName: c.name };
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export interface ConfirmResult {
  customerName: string;
  method: 'manual' | 'point';
  progress: number;       // manual 확인 시 도장 후 현재 카드 칸 수
  cardCompleted: boolean;
}

/** 입금 확인 — manual: 수기 확인 + 도장 1개 / point: 무료 예약권 1장 차감, 도장 없음 */
export async function confirmPayment(
  reservationId: number,
  method: 'manual' | 'point',
): Promise<{ ok: true; value: ConfirmResult } | { ok: false; error: string }> {
  const client = await pool().connect();
  try {
    await client.query('begin');
    const found = await client.query(
      `select r.id, r.date, r.payment, r.customer_id, c.name, c.used_coupons
       from reservations r
       join customers c on c.id = r.customer_id
       where r.id = $1
       for update of r, c`,
      [reservationId],
    );
    if (!found.rows.length) {
      await client.query('rollback');
      return { ok: false, error: '예약을 찾을 수 없습니다.' };
    }
    const r = found.rows[0];
    if (r.payment !== 'pending') {
      await client.query('rollback');
      return { ok: false, error: '이미 입금 확인된 예약입니다.' };
    }

    let progress = 0;
    let cardCompleted = false;
    if (method === 'manual') {
      await client.query(
        `update reservations set payment = 'manual', paid_at = now() where id = $1`,
        [reservationId],
      );
      await client.query('insert into stamps (customer_id, date) values ($1,$2)', [
        r.customer_id, r.date,
      ]);
      const stamps = await client.query(
        'select count(*)::int as total from stamps where customer_id = $1',
        [r.customer_id],
      );
      const total = stamps.rows[0].total;
      cardCompleted = total % STAMP_GOAL === 0;
      progress = cardCompleted ? STAMP_GOAL : total % STAMP_GOAL;
    } else {
      const stamps = await client.query(
        'select count(*)::int as total from stamps where customer_id = $1',
        [r.customer_id],
      );
      if (Math.floor(stamps.rows[0].total / STAMP_GOAL) - r.used_coupons < 1) {
        await client.query('rollback');
        return { ok: false, error: '사용 가능한 무료 예약권이 없습니다.' };
      }
      await client.query('update customers set used_coupons = used_coupons + 1 where id = $1', [
        r.customer_id,
      ]);
      await client.query(
        `update reservations set payment = 'point', paid_at = now(), is_free = true where id = $1`,
        [reservationId],
      );
    }
    await client.query('commit');
    return { ok: true, value: { customerName: r.name, method, progress, cardCompleted } };
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
