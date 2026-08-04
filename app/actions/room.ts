'use server';

import { pool } from '@/lib/server/db';
import { isOwner } from '@/lib/server/auth';
import type { Block, Room } from '@/lib/types';

type Result = { ok: true } | { ok: false; error: string };

export async function listRooms(): Promise<Room[]> {
  if (!(await isOwner())) throw new Error('UNAUTHORIZED');
  const { rows } = await pool().query(
    'select id, name, open_min, close_min from rooms order by id',
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

export async function createRoom(name: string, open_min: number, close_min: number): Promise<Result> {
  if (!(await isOwner())) return { ok: false, error: '권한이 없습니다.' };
  const err = validRoom(name, open_min, close_min);
  if (err) return { ok: false, error: err };
  await pool().query('insert into rooms (name, open_min, close_min) values ($1,$2,$3)', [
    name.trim(), open_min, close_min,
  ]);
  return { ok: true };
}

export async function updateRoom(
  id: number, name: string, open_min: number, close_min: number,
): Promise<Result> {
  if (!(await isOwner())) return { ok: false, error: '권한이 없습니다.' };
  const err = validRoom(name, open_min, close_min);
  if (err) return { ok: false, error: err };
  const res = await pool().query(
    'update rooms set name = $2, open_min = $3, close_min = $4 where id = $1',
    [id, name.trim(), open_min, close_min],
  );
  if (!res.rowCount) return { ok: false, error: '방을 찾을 수 없습니다.' };
  return { ok: true };
}

export async function deleteRoom(id: number): Promise<Result> {
  if (!(await isOwner())) return { ok: false, error: '권한이 없습니다.' };
  const used = await pool().query(
    'select count(*)::int as n from reservations where room_id = $1',
    [id],
  );
  if (used.rows[0].n > 0) {
    return { ok: false, error: '이 방에 예약 기록이 있어 삭제할 수 없습니다.' };
  }
  const res = await pool().query('delete from rooms where id = $1', [id]);
  if (!res.rowCount) return { ok: false, error: '방을 찾을 수 없습니다.' };
  return { ok: true };
}

export type BlockRow = Block & { room_name: string | null };

export async function listBlocks(): Promise<BlockRow[]> {
  if (!(await isOwner())) throw new Error('UNAUTHORIZED');
  const { rows } = await pool().query(
    `select b.id, b.room_id, b.label, b.date, b.start_min, b.end_min, r.name as room_name
     from blocks b
     left join rooms r on r.id = b.room_id
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
  const res = await pool().query('delete from blocks where id = $1', [id]);
  if (!res.rowCount) return { ok: false, error: '항목을 찾을 수 없습니다.' };
  return { ok: true };
}
