'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from '@/app/actions/auth';
import { customerLogout } from '@/app/actions/my';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const clean = pathname.replace(/\/+$/, '') || '/';

  if (clean === '/login') return null;

  // 고객용 헤더
  if (clean === '/my' || clean.startsWith('/my/')) {
    return (
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
          <Link href="/my" className="text-lg font-black tracking-tight text-deep">
            그린라운드
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

  // 사장님용 헤더
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-black tracking-tight text-deep">
          그린라운드
        </Link>
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
    </header>
  );
}
