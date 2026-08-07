'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** 플로팅 메뉴에서 이동할 수 있는 화면 — 홈 + 메인 메뉴 5개 */
const ITEMS = [
  { href: '/', label: '홈' },
  { href: '/status', label: '예약' },
  { href: '/point', label: '포인트 적립' },
  { href: '/customer', label: '고객 등록' },
  { href: '/rooms', label: '방 관리' },
  { href: '/admins', label: '관리자 계정 관리' },
];

export default function FloatingNav() {
  const pathname = usePathname();
  const clean = pathname.replace(/\/+$/, '') || '/';
  const [open, setOpen] = useState(false);

  // 화면을 옮기면 닫는다
  useEffect(() => setOpen(false), [clean]);

  // 로그인 화면과 고객용 화면에는 노출하지 않는다
  if (clean === '/login' || clean === '/my' || clean.startsWith('/my/')) return null;

  return (
    <>
      {open && (
        <div
          aria-hidden
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-deep/30"
        />
      )}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
        {open &&
          ITEMS.map(m => (
            <Link
              key={m.href}
              href={m.href}
              onClick={() => setOpen(false)}
              className={`flex min-h-11 items-center rounded-full border px-4 text-sm font-bold shadow-sm transition-opacity active:opacity-80 ${
                clean === m.href
                  ? 'border-fair bg-fair text-white'
                  : 'border-line bg-white text-ink'
              }`}
            >
              {m.label}
            </Link>
          ))}
        <button
          type="button"
          aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
          className="flex size-14 items-center justify-center rounded-full bg-fair text-3xl font-light leading-none text-white shadow-lg transition-transform active:opacity-80"
          style={{ transform: open ? 'rotate(45deg)' : 'none' }}
        >
          +
        </button>
      </div>
    </>
  );
}
