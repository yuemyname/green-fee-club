'use server';

import { pool } from '@/lib/server/db';
import {
  adminId, clearAdminSession, hashPassword, isOwner, setAdminSession, verifyPassword,
} from '@/lib/server/auth';

export async function login(
  username: string,
  password: string,
): Promise<{ ok: boolean }> {
  const { rows } = await pool().query(
    'select id, password_hash from admins where username = $1',
    [username.trim()],
  );
  if (!rows.length || !verifyPassword(password, rows[0].password_hash)) {
    return { ok: false };
  }
  await setAdminSession(rows[0].id);
  return { ok: true };
}

export async function logout(): Promise<void> {
  await clearAdminSession();
}

type Result = { ok: true } | { ok: false; error: string };

export interface AdminRow {
  id: number;
  username: string;
  isMe: boolean;
}

export async function listAdmins(): Promise<AdminRow[]> {
  const me = await adminId();
  if (me === null) throw new Error('UNAUTHORIZED');
  const { rows } = await pool().query('select id, username from admins order by id');
  return rows.map(r => ({ id: r.id, username: r.username, isMe: r.id === me }));
}

export async function createAdmin(username: string, password: string): Promise<Result> {
  if (!(await isOwner())) return { ok: false, error: '권한이 없습니다.' };
  const name = username.trim();
  if (name.length < 3) return { ok: false, error: '아이디는 3자 이상으로 해주세요.' };
  if (password.length < 4) return { ok: false, error: '비밀번호는 4자 이상으로 해주세요.' };
  try {
    await pool().query('insert into admins (username, password_hash) values ($1,$2)', [
      name, hashPassword(password),
    ]);
    return { ok: true };
  } catch (e: unknown) {
    if (typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505') {
      return { ok: false, error: '이미 있는 아이디입니다.' };
    }
    throw e;
  }
}

export async function deleteAdmin(id: number): Promise<Result> {
  if (!(await isOwner())) return { ok: false, error: '권한이 없습니다.' };
  const count = await pool().query('select count(*)::int as n from admins');
  if (count.rows[0].n <= 1) return { ok: false, error: '마지막 관리자는 삭제할 수 없습니다.' };
  const res = await pool().query('delete from admins where id = $1', [id]);
  if (!res.rowCount) return { ok: false, error: '관리자를 찾을 수 없습니다.' };
  return { ok: true };
}
