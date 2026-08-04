'use server';

import { cookies } from 'next/headers';

const SESSION_COOKIE = 'gr_session';
const WEEK = 60 * 60 * 24 * 7;

export async function login(code: string): Promise<{ ok: boolean }> {
  const owner = process.env.OWNER_CODE ?? '1406';
  if (code !== owner) return { ok: false };
  const jar = await cookies();
  jar.set(SESSION_COOKIE, 'owner', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: WEEK,
  });
  return { ok: true };
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
