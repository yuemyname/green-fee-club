import type { Metadata, Viewport } from 'next';
import './globals.css';
import Header from '@/components/Header';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: '그린라운드 — 스크린골프 예약',
  description: '스크린골프 예약 + 포인트 적립',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="min-h-dvh antialiased">
        <ToastProvider>
          <Header />
          <main className="mx-auto max-w-xl px-4 py-6 pb-24">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
