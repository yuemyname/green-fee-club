import type { PoolClient } from 'pg';
import { STAMP_GOAL } from '@/lib/constants';
import { needMin } from '@/lib/time';

export interface SlotInput {
  date: string;
  room_id: number;
  start_min: number;
  people: number;
}

/**
 * 방 존재·운영시간·예약 불가 시간·겹침 검사. 트랜잭션 안에서 호출한다.
 * excludeReservationId는 예약 변경 시 자기 자신을 겹침 검사에서 제외할 때 사용.
 * 문제가 있으면 에러 메시지, 없으면 null.
 */
export async function validateSlot(
  client: PoolClient,
  input: SlotInput,
  excludeReservationId?: number,
): Promise<string | null> {
  const end = input.start_min + needMin(input.people);

  const room = await client.query('select open_min, close_min from rooms where id = $1', [
    input.room_id,
  ]);
  if (!room.rows.length) return '방을 찾을 수 없습니다.';
  if (input.start_min < room.rows[0].open_min || end > room.rows[0].close_min) {
    return '운영시간을 벗어난 시간입니다. 시간을 다시 골라주세요.';
  }

  const blocked = await client.query(
    `select 1 from blocks
     where (room_id is null or room_id = $1)
       and (date is null or date = $2)
       and start_min < $3 and $4 < end_min
     limit 1`,
    [input.room_id, input.date, end, input.start_min],
  );
  if (blocked.rows.length) return '예약 불가 시간과 겹칩니다. 시간을 다시 골라주세요.';

  const overlap = await client.query(
    `select 1 from reservations
     where room_id = $1 and date = $2 and start_min < $3 and $4 < end_min
       and ($5::bigint is null or id <> $5)
     limit 1`,
    [input.room_id, input.date, end, input.start_min, excludeReservationId ?? null],
  );
  if (overlap.rows.length) return '방금 다른 예약이 잡혔습니다. 시간을 다시 골라주세요.';

  return null;
}

/**
 * 고객 id 기준 예약 생성. 트랜잭션 안에서 호출하며, 호출 전에
 * `pg_advisory_xact_lock(hashtext(date:room))`으로 직렬화되어 있어야 한다.
 * use_free면 무료 예약권을 차감하고 즉시 입금 확인(point) 처리한다.
 */
export async function insertReservation(
  client: PoolClient,
  customerId: number,
  input: SlotInput & { use_free: boolean },
): Promise<string | null> {
  const err = await validateSlot(client, input);
  if (err) return err;

  if (input.use_free) {
    const c = await client.query(
      'select used_coupons from customers where id = $1 for update',
      [customerId],
    );
    if (!c.rows.length) return '고객 정보를 찾을 수 없습니다.';
    const stamps = await client.query(
      'select count(*)::int as total from stamps where customer_id = $1',
      [customerId],
    );
    if (Math.floor(stamps.rows[0].total / STAMP_GOAL) - c.rows[0].used_coupons < 1) {
      return '사용 가능한 무료 예약권이 없습니다.';
    }
    await client.query('update customers set used_coupons = used_coupons + 1 where id = $1', [
      customerId,
    ]);
  }

  const end = input.start_min + needMin(input.people);
  await client.query(
    `insert into reservations (date, room_id, start_min, end_min, customer_id, people, is_free, payment, paid_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8, case when $8 = 'pending' then null else now() end)`,
    [
      input.date, input.room_id, input.start_min, end, customerId, input.people,
      input.use_free, input.use_free ? 'point' : 'pending',
    ],
  );
  return null;
}
