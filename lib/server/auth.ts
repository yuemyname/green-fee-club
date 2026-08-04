import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { pool } from './db';

const ADMIN_COOKIE = 'gr_session';
const CUSTOMER_COOKIE = 'gr_customer';
const WEEK = 60 * 60 * 24 * 7;
const YEAR = 60 * 60 * 24 * 365;

function secret(): string {
  return process.env.SESSION_SECRET ?? `greenround-${process.env.OWNER_CODE ?? '1406'}`;
}

function sig(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex').slice(0, 32);
}

function verifyToken(value: string | undefined, prefix: string): number | null {
  if (!value) return null;
  const dot = value.indexOf('.');
  if (dot < 1) return null;
  const id = value.slice(0, dot);
  const s = value.slice(dot + 1);
  const a = Buffer.from(s);
  const b = Buffer.from(sig(`${prefix}:${id}`));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// ---------- 비밀번호 (scrypt) ----------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const idx = stored.indexOf(':');
  if (idx < 1) return false;
  const salt = stored.slice(0, idx);
  const expect = Buffer.from(stored.slice(idx + 1), 'hex');
  const actual = scryptSync(password, salt, 32);
  return expect.length === actual.length && timingSafeEqual(expect, actual);
}

// ---------- 관리자 세션 ----------

export async function setAdminSession(id: number): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, `${id}.${sig(`admin:${id}`)}`, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: WEEK,
  });
}

export async function clearAdminSession(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}

/** 현재 관리자 세션의 admin id — 서명이 틀리면 null */
export async function adminId(): Promise<number | null> {
  return verifyToken((await cookies()).get(ADMIN_COOKIE)?.value, 'admin');
}

/** 관리자 여부 — 서명 검증 + 계정이 아직 존재하는지(삭제된 관리자 세션 무효화) */
export async function isOwner(): Promise<boolean> {
  const id = await adminId();
  if (id === null) return false;
  const { rows } = await pool().query('select 1 from admins where id = $1', [id]);
  return rows.length > 0;
}

// ---------- 고객 세션 ----------

export async function setCustomerSession(id: number): Promise<void> {
  (await cookies()).set(CUSTOMER_COOKIE, `${id}.${sig(`customer:${id}`)}`, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: YEAR,
  });
}

export async function clearCustomerSession(): Promise<void> {
  (await cookies()).delete(CUSTOMER_COOKIE);
}

/** 현재 고객 세션의 customer id — 서명이 틀리면 null */
export async function customerId(): Promise<number | null> {
  return verifyToken((await cookies()).get(CUSTOMER_COOKIE)?.value, 'customer');
}
