'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isAuthed } from '@/lib/auth';

/**
 * 정적 배포(GitHub Pages)에서는 미들웨어가 없으므로 클라이언트에서 세션을 검사한다.
 * 서버 배포에서는 middleware.ts가 먼저 리다이렉트하므로 통과만 한다.
 */
export default function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const authed = isAuthed();
    const isLogin = pathname.replace(/\/+$/, '') === '/login'; // trailingSlash 배포 대응
    if (!authed && !isLogin) {
      router.replace('/login');
      return;
    }
    if (authed && isLogin) {
      router.replace('/');
      return;
    }
    setReady(true);
  }, [pathname, router]);

  if (!ready) return null;
  return <>{children}</>;
}
