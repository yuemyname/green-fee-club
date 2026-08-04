import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // 고객용 화면 — gr_customer 쿠키 기준 (서명 검증은 서버 액션에서)
  if (path === '/my' || path.startsWith('/my/')) {
    const hasCustomer = Boolean(req.cookies.get('gr_customer')?.value);
    const isStart = path === '/my/start';
    if (!hasCustomer && !isStart) {
      return NextResponse.redirect(new URL('/my/start', req.url));
    }
    if (hasCustomer && isStart) {
      return NextResponse.redirect(new URL('/my', req.url));
    }
    return NextResponse.next();
  }

  // 관리자용 화면 — 쿠키 존재만 확인 (서명 검증은 서버 액션에서)
  const authed = Boolean(req.cookies.get('gr_session')?.value);
  const isLogin = path === '/login';
  if (!authed && !isLogin) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (authed && isLogin) {
    return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
