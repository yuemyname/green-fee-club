'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout, me } from '@/app/actions/auth';
import { customerLogout } from '@/app/actions/my';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const clean = pathname.replace(/\/+$/, '') || '/';
  const isMy = clean === '/my' || clean.startsWith('/my/');
  const [adminName, setAdminName] = useState<string | null>(null);

  // 관리자 화면에서만 현재 로그인한 아이디를 조회해 표시
  useEffect(() => {
    if (isMy || clean === '/login') return;
    me().then(setAdminName).catch(() => {});
  }, [isMy, clean]);

  if (clean === '/login') return null;

  // 고객용 헤더
  if (isMy) {
    return (
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
          <Link href="/my" className="text-lg font-black tracking-tight text-deep">
            트윈빌스크린
          </Link>
          {clean !== '/my/start' && (
            <button
              type="button"
              onClick={async () => {
                await customerLogout();
                router.replace('/my/start');
              }}
              className="flex min-h-11 items-center rounded-lg border border-line bg-white px-3 text-sm font-semibold text-sub"
            >
              로그아웃
            </button>
          )}
        </div>
      </header>
    );
  }

  // 관리자용 헤더
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-black tracking-tight text-deep">
          트윈빌스크린
        </Link>
        <div className="flex items-center gap-2">
          {adminName && (
            <span className="text-sm font-semibold text-sub">{adminName}</span>
          )}
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.replace('/login');
            }}
            className="flex min-h-11 items-center rounded-lg border border-line bg-white px-3 text-sm font-semibold text-sub"
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
