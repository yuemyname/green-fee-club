'use server';

import { pool } from '@/lib/server/db';
import { isOwner } from '@/lib/server/auth';
import { STAMP_GOAL } from '@/lib/constants';
import type { CouponUse, CustomerOverview } from '@/lib/types';

const OVERVIEW_SQL = `
  select c.id, c.name, c.phone, c.last4, c.used_coupons,
         count(s.id)::int as total
  from customers c
  left join stamps s on s.customer_id = c.id and s.deleted_at is null
`;

function toOverview(r: {
  id: number; name: string; phone: string; last4: string; used_coupons: number; total: number;
}): CustomerOverview {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    last4: r.last4,
    totalStamps: r.total,
    progress: r.total % STAMP_GOAL,
    coupons: Math.floor(r.total / STAMP_GOAL) - r.used_coupons,
  };
}

export async function listCustomers(): Promise<CustomerOverview[]> {
  if (!(await isOwner())) throw new Error('UNAUTHORIZED');
  const { rows } = await pool().query(
    `${OVERVIEW_SQL} where c.deleted_at is null group by c.id order by c.created_at desc`,
  );
  return rows.map(toOverview);
}

/** 뒤 4자리로 고객 조회 — 같은 뒤 4자리가 여러 명일 수 있어 배열로 반환 */
export async function findCustomersByLast4(last4: string): Promise<CustomerOverview[]> {
  if (!(await isOwner())) throw new Error('UNAUTHORIZED');
  const { rows } = await pool().query(
    `${OVERVIEW_SQL} where c.deleted_at is null and c.last4 = $1 group by c.id order by c.created_at`,
    [last4],
  );
  return rows.map(toOverview);
}

export async function createCustomer(
  name: string,
  phoneDigits: string,
): Promise<{ ok: true; customer: CustomerOverview } | { ok: false; error: string }> {
  if (!(await isOwner())) return { ok: false, error: '권한이 없습니다.' };
  const trimmed = name.trim();
  if (trimmed.length < 1) return { ok: false, error: '이름을 입력해 주세요.' };
  if (!/^\d{11}$/.test(phoneDigits)) {
    return { ok: false, error: '전화번호는 숫자 11자리로 입력해 주세요.' };
  }
  const last4 = phoneDigits.slice(-4);
  const phone = `${phoneDigits.slice(0, 3)}-${phoneDigits.slice(3, 7)}-${phoneDigits.slice(7, 11)}`;
  // 뒤 4자리 중복은 허용하되, 완전히 같은 번호는 중복 등록 불가
  const dup = await pool().query(
    `select 1 from customers where deleted_at is null and replace(phone, '-', '') = $1 limit 1`,
    [phoneDigits],
  );
  if (dup.rows.length) return { ok: false, error: '이미 등록된 번호입니다.' };
  const { rows } = await pool().query(
    'insert into customers (name, phone, last4) values ($1,$2,$3) returning id',
    [trimmed, phone, last4],
  );
  return {
    ok: true,
    customer: {
      id: rows[0].id, name: trimmed, phone, last4,
      totalStamps: 0, progress: 0, coupons: 0,
    },
  };
}

export interface CustomerDetail {
  customer: CustomerOverview;
  stampDates: string[];
  couponUses: CouponUse[];
}

/** 적립 전 현재 포인트 조회 — 도장을 찍지 않는다 */
export async function getCustomerDetailById(id: number): Promise<CustomerDetail | null> {
  if (!(await isOwner())) throw new Error('UNAUTHORIZED');
  const { rows } = await pool().query(
    `${OVERVIEW_SQL} where c.deleted_at is null and c.id = $1 group by c.id`,
    [id],
  );
  if (!rows.length) return null;
  const customer = toOverview(rows[0]);
  const [dates, uses] = await Promise.all([
    pool().query(
      'select date from stamps where customer_id = $1 and deleted_at is null order by created_at, id',
      [customer.id],
    ),
    pool().query(
      `select r.date, r.start_min, r.end_min, rm.name as room_name
       from reservations r
       left join rooms rm on rm.id = r.room_id
       where r.customer_id = $1 and r.deleted_at is null and r.payment = 'point'
       order by r.paid_at nulls first, r.id`,
      [customer.id],
    ),
  ]);
  return {
    customer,
    stampDates: dates.rows.map(r => r.date),
    couponUses: uses.rows,
  };
}

export interface StampResult {
  customer: CustomerOverview;
  stampDates: string[];      // 시간순 전체 도장 날짜 (yyyymmdd)
  couponUses: CouponUse[];   // 무료 예약권 사용 내역 (사용 순)
  cardCompleted: boolean;
  progress: number;          // 도장 후 현재 카드 칸 수 (10개째면 10)
}

export async function addStamp(
  customerId: number,
  date: string,
): Promise<{ ok: true; value: StampResult } | { ok: false; error: string }> {
  if (!(await isOwner())) return { ok: false, error: '권한이 없습니다.' };
  const client = await pool().connect();
  try {
    await client.query('begin');
    const found = await client.query(
      'select id from customers where id = $1 and deleted_at is null for update',
      [customerId],
    );
    if (!found.rows.length) {
      await client.query('rollback');
      return { ok: false, error: '고객을 찾을 수 없습니다.' };
    }
    const id = found.rows[0].id;
    await client.query('insert into stamps (customer_id, date) values ($1,$2)', [id, date]);
    const { rows } = await client.query(
      `${OVERVIEW_SQL} where c.deleted_at is null and c.id = $1 group by c.id`,
      [id],
    );
    const dates = await client.query(
      'select date from stamps where customer_id = $1 and deleted_at is null order by created_at, id',
      [id],
    );
    const uses = await client.query(
      `select r.date, r.start_min, r.end_min, rm.name as room_name
       from reservations r
       left join rooms rm on rm.id = r.room_id
       where r.customer_id = $1 and r.deleted_at is null and r.payment = 'point'
       order by r.paid_at nulls first, r.id`,
      [id],
    );
    await client.query('commit');

    const customer = toOverview(rows[0]);
    const completed = customer.totalStamps % STAMP_GOAL === 0;
    return {
      ok: true,
      value: {
        customer,
        stampDates: dates.rows.map(r => r.date),
        couponUses: uses.rows,
        cardCompleted: completed,
        progress: completed ? STAMP_GOAL : customer.progress,
      },
    };
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
