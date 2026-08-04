import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const CUSTOMER_COOKIE = 'gr_customer';
const YEAR = 60 * 60 * 24 * 365;

function secret(): string {
  return process.env.SESSION_SECRET ?? `greenround-${process.env.OWNER_CODE ?? '1406'}`;
}

function sig(id: string): string {
  return createHmac('sha256', secret()).update(id).digest('hex').slice(0, 32);
}

/** 사장님 세션 여부 — 사장님 전용 서버 액션은 반드시 이걸로 확인한다 */
export async function isOwner(): Promise<boolean> {
  return (await cookies()).get('gr_session')?.value === 'owner';
}

/** 고객 세션 발급 (서명 쿠키, 1년) */
export async function setCustomerSession(id: number): Promise<void> {
  (await cookies()).set(CUSTOMER_COOKIE, `${id}.${sig(String(id))}`, {
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
  const v = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  if (!v) return null;
  const dot = v.indexOf('.');
  if (dot < 1) return null;
  const id = v.slice(0, dot);
  const s = v.slice(dot + 1);
  const expect = sig(id);
  const a = Buffer.from(s);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}
