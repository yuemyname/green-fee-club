'use client';

const COOKIE = 'gr_session';
const WEEK = 60 * 60 * 24 * 7;

/** 사장님 뒤 4자리 확인 후 세션 쿠키(7일) 발급 */
export function login(code: string): boolean {
  const owner = process.env.NEXT_PUBLIC_OWNER_CODE ?? '1406';
  if (code !== owner) return false;
  document.cookie = `${COOKIE}=owner; max-age=${WEEK}; path=/; samesite=lax`;
  return true;
}

export function logout(): void {
  document.cookie = `${COOKIE}=; max-age=0; path=/`;
}

export function isAuthed(): boolean {
  return document.cookie.split('; ').some(c => c === `${COOKIE}=owner`);
}
