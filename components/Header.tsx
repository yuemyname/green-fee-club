'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout, me } from '@/app/actions/auth';
import { customerLogout } from '@/app/actions/my';

/**
 * 뒤로 갈 화면. 브라우저 기록이 아니라 화면 구조를 따라가서,
 * 주소로 바로 들어온 경우에도 항상 같은 곳으로 간다. null이면 버튼을 감춘다.
 */
function parentOf(path: string): string | null {
  if (path === '/' || path === '/my' || path === '/my/start') return null;
  if (path.startsWith('/my/')) return '/my';
  if (path.startsWith('/customer/')) return '/customer';
  return '/';
}

function BackLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="뒤로 가기"
      className="-ml-2 flex size-11 shrink-0 items-center justify-center text-2xl font-bold text-sub transition-opacity active:opacity-60"
    >
      ‹
    </Link>
  );
}

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
  const back = parentOf(clean);

  // 고객용 헤더
  if (isMy) {
    return (
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-xl items-center gap-1 px-4">
          {back && <BackLink href={back} />}
          <Link href="/my" className="truncate text-lg font-black tracking-tight text-deep">
            트윈빌스크린
          </Link>
          <span className="flex-1" />
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
      <div className="mx-auto flex h-14 max-w-xl items-center gap-1 px-4">
        {back && <BackLink href={back} />}
        <Link href="/" className="truncate text-lg font-black tracking-tight text-deep">
          트윈빌스크린
        </Link>
        <span className="flex-1" />
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
