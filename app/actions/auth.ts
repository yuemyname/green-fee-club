'use server';

import { pool } from '@/lib/server/db';
import {
  adminId, clearAdminSession, hashPassword, isOwner, setAdminSession, verifyPassword,
} from '@/lib/server/auth';

/** 비밀번호만으로 로그인 — 매장 관리자 3개 중 일치하는 계정으로 세션 발급 */
export async function login(password: string): Promise<{ ok: boolean }> {
  const { rows } = await pool().query(
    'select id, password_hash from admins order by id',
  );
  for (const r of rows) {
    if (verifyPassword(password, r.password_hash)) {
      await setAdminSession(r.id);
      return { ok: true };
    }
  }
  return { ok: false };
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

/** 관리자 비밀번호 변경 — 로그인한 관리자는 매장 계정 3개 모두 변경 가능 */
export async function changeAdminPassword(id: number, newPassword: string): Promise<Result> {
  if (!(await isOwner())) return { ok: false, error: '권한이 없습니다.' };
  if (newPassword.length < 4) return { ok: false, error: '비밀번호는 4자 이상으로 해주세요.' };
  const res = await pool().query('update admins set password_hash = $2 where id = $1', [
    id, hashPassword(newPassword),
  ]);
  if (!res.rowCount) return { ok: false, error: '관리자를 찾을 수 없습니다.' };
  return { ok: true };
}

export interface StoreInfo {
  code: string;
  name: string;
}

export async function getStore(): Promise<StoreInfo | null> {
  if (!(await isOwner())) throw new Error('UNAUTHORIZED');
  const { rows } = await pool().query('select code, name from stores order by id limit 1');
  return rows.length ? rows[0] : null;
}
