'use server';

import { pool } from '@/lib/server/db';
import { isOwner } from '@/lib/server/auth';
import type { Block, Room } from '@/lib/types';

type Result = { ok: true } | { ok: false; error: string };

export async function listRooms(): Promise<Room[]> {
  if (!(await isOwner())) throw new Error('UNAUTHORIZED');
  const { rows } = await pool().query(
    'select id, name, open_min, close_min, active from rooms where deleted_at is null order by id',
  );
  return rows;
}

function validRoom(name: string, open: number, close: number): string | null {
  if (!name.trim()) return '방 이름을 입력해 주세요.';
  if (!(open >= 0 && close <= 1440 && open < close)) {
    return '운영시간이 올바르지 않습니다. 시작이 종료보다 빨라야 합니다.';
  }
  return null;
}

/** 살아있는 방 중 같은 이름이 있는지 (id를 주면 자기 자신은 제외) */
async function nameTaken(name: string, exceptId?: number): Promise<boolean> {
  const { rows } = await pool().query(
    `select 1 from rooms
     where deleted_at is null and name = $1 and ($2::bigint is null or id <> $2)
     limit 1`,
    [name.trim(), exceptId ?? null],
  );
  return rows.length > 0;
}

/** 새 방 등록 시 함께 넣을 예약 불가 시간 (이 방에만 적용, 매일 반복) */
export interface NewRoomBlock {
  label: string;
  start_min: number;
  end_min: number;
}

export async function createRoom(
  name: string,
  open_min: number,
  close_min: number,
  blocks: NewRoomBlock[] = [],
): Promise<Result> {
  if (!(await isOwner())) return { ok: false, error: '권한이 없습니다.' };
  const err = validRoom(name, open_min, close_min);
  if (err) return { ok: false, error: err };
  if (await nameTaken(name)) return { ok: false, error: '같은 이름의 방이 이미 있습니다.' };
  for (const b of blocks) {
    if (!(b.start_min >= 0 && b.end_min <= 1440 && b.start_min < b.end_min)) {
      return { ok: false, error: '예약 불가 시간이 올바르지 않습니다.' };
    }
  }

  const client = await pool().connect();
  try {
    await client.query('begin');
    const res = await client.query(
      'insert into rooms (name, open_min, close_min) values ($1,$2,$3) returning id',
      [name.trim(), open_min, close_min],
    );
    const roomId = res.rows[0].id;
    for (const b of blocks) {
      await client.query(
        'insert into blocks (room_id, label, date, start_min, end_min) values ($1,$2,null,$3,$4)',
        [roomId, b.label.trim() || '예약 불가', b.start_min, b.end_min],
      );
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

export async function updateRoom(
  id: number, name: string, open_min: number, close_min: number,
): Promise<Result> {
  if (!(await isOwner())) return { ok: false, error: '권한이 없습니다.' };
  const err = validRoom(name, open_min, close_min);
  if (err) return { ok: false, error: err };
  if (await nameTaken(name, id)) return { ok: false, error: '같은 이름의 방이 이미 있습니다.' };
  const res = await pool().query(
    'update rooms set name = $2, open_min = $3, close_min = $4 where id = $1 and deleted_at is null',
    [id, name.trim(), open_min, close_min],
  );
  if (!res.rowCount) return { ok: false, error: '방을 찾을 수 없습니다.' };
  return { ok: true };
}

/** 방 일시 운영 중지 / 재개 — 중지하면 예약 화면에 노출되지 않는다 */
export async function setRoomActive(id: number, active: boolean): Promise<Result> {
  if (!(await isOwner())) return { ok: false, error: '권한이 없습니다.' };
  const res = await pool().query(
    'update rooms set active = $2 where id = $1 and deleted_at is null',
    [id, active],
  );
  if (!res.rowCount) return { ok: false, error: '방을 찾을 수 없습니다.' };
  return { ok: true };
}

/**
 * 방 삭제 — 소프트 삭제. 과거 예약이 참조하는 방 이름을 보존하기 위해
 * 행을 남기고 deleted_at 을 채운다. 이 방의 예약 불가 시간도 함께 삭제한다.
 * 앞으로 남은 예약이 있으면 실수 방지를 위해 막는다.
 */
export async function deleteRoom(id: number, today: string): Promise<Result> {
  if (!(await isOwner())) return { ok: false, error: '권한이 없습니다.' };
  const upcoming = await pool().query(
    `select count(*)::int as n from reservations
     where room_id = $1 and deleted_at is null and date >= $2`,
    [id, today],
  );
  if (upcoming.rows[0].n > 0) {
    return { ok: false, error: '앞으로 예정된 예약이 있어 삭제할 수 없습니다. 운영 중지를 사용해 주세요.' };
  }
  const client = await pool().connect();
  try {
    await client.query('begin');
    const res = await client.query(
      'update rooms set deleted_at = now(), active = false where id = $1 and deleted_at is null',
      [id],
    );
    if (!res.rowCount) {
      await client.query('rollback');
      return { ok: false, error: '방을 찾을 수 없습니다.' };
    }
    await client.query(
      'update blocks set deleted_at = now() where room_id = $1 and deleted_at is null',
      [id],
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

export type BlockRow = Block & { room_name: string | null };

export async function listBlocks(): Promise<BlockRow[]> {
  if (!(await isOwner())) throw new Error('UNAUTHORIZED');
  const { rows } = await pool().query(
    `select b.id, b.room_id, b.label, b.date, b.start_min, b.end_min, r.name as room_name
     from blocks b
     left join rooms r on r.id = b.room_id
     where b.deleted_at is null
     order by b.date nulls first, b.start_min`,
  );
  return rows;
}

export async function createBlock(input: {
  room_id: number | null;
  label: string;
  date: string | null;   // null = 매일 반복
  start_min: number;
  end_min: number;
}): Promise<Result> {
  if (!(await isOwner())) return { ok: false, error: '권한이 없습니다.' };
  if (!(input.start_min >= 0 && input.end_min <= 1440 && input.start_min < input.end_min)) {
    return { ok: false, error: '시간이 올바르지 않습니다. 시작이 종료보다 빨라야 합니다.' };
  }
  if (input.date !== null && !/^\d{8}$/.test(input.date)) {
    return { ok: false, error: '날짜가 올바르지 않습니다.' };
  }
  await pool().query(
    'insert into blocks (room_id, label, date, start_min, end_min) values ($1,$2,$3,$4,$5)',
    [input.room_id, input.label.trim() || '예약 불가', input.date, input.start_min, input.end_min],
  );
  return { ok: true };
}

export async function deleteBlock(id: number): Promise<Result> {
  if (!(await isOwner())) return { ok: false, error: '권한이 없습니다.' };
  const res = await pool().query(
    'update blocks set deleted_at = now() where id = $1 and deleted_at is null',
    [id],
  );
  if (!res.rowCount) return { ok: false, error: '항목을 찾을 수 없습니다.' };
  return { ok: true };
}
