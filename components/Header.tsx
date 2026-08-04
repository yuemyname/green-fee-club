'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from '@/app/actions/auth';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === '/login') return null;

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
