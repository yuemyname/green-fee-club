'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listBoard, type Board } from '@/app/actions/reservation';
import { fmtDate, toHM, todayStr } from '@/lib/time';
import Eyebrow from '@/components/ui/Eyebrow';
import Card from '@/components/ui/Card';

const MENUS = [
  { href: '/status', title: '예약', desc: '현황을 보고 빈 시간에 바로 예약' },
  { href: '/point', title: '포인트 적립', desc: '번호만 넣으면 도장 1개' },
  { href: '/customer', title: '고객 등록', desc: '이름과 번호만 받습니다' },
  { href: '/rooms', title: '방 관리', desc: '운영시간과 예약 불가 시간 설정' },
];

export default function MenuPage() {
  const [board, setBoard] = useState<Board | null>(null);
  const today = todayStr();

  useEffect(() => {
    listBoard(today).then(setBoard).catch(() => {});
  }, [today]);

  const roomName = (id: number) => board?.rooms.find(r => r.id === id)?.name ?? '';
  const list = board
    ? [...board.reservations].sort((a, b) =>
        a.start_min === b.start_min ? a.room_id - b.room_id : a.start_min - b.start_min,
      )
    : [];

  return (
    <div>
      <Eyebrow>TWINVILL SCREEN GOLF</Eyebrow>
      <h1 className="mt-1 text-2xl font-black text-deep" style={{ letterSpacing: '-0.02em' }}>
        무엇을 할까요?
      </h1>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {MENUS.map(m => (
          <Link
            key={m.href}
            href={m.href}
            className="rounded-xl border border-line bg-turf p-4 transition-opacity active:opacity-80"
          >
            <p className="text-lg font-black text-deep">{m.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-sub">{m.desc}</p>
          </Link>
        ))}
      </div>

      <Link
        href="/admins"
        className="mt-3 flex min-h-11 items-center justify-center rounded-xl border border-line bg-white text-sm font-semibold text-sub transition-opacity active:opacity-80"
      >
        관리자 계정 관리
      </Link>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-deep tabular-nums">
          오늘 예약 {fmtDate(today)}
          {board && <span className="text-sub"> · {list.length}건</span>}
        </h2>
        <div className="mt-2 space-y-2">
          {board && list.length === 0 && (
            <Card><p className="text-sm text-sub">오늘 예약이 없습니다.</p></Card>
          )}
          {list.map(r => (
            <Link key={r.id} href="/status" className="block">
              <Card className="flex items-center justify-between transition-opacity active:opacity-80">
                <div>
                  <p className="text-sm font-bold tabular-nums">
                    {toHM(r.start_min)} – {toHM(r.end_min)}
                  </p>
                  <p className="mt-0.5 text-xs text-sub tabular-nums">
                    {roomName(r.room_id)} · {r.customer_name} {r.people}명
                  </p>
                </div>
                <span className="flex items-center gap-1.5">
                  {r.payment === 'point' && (
                    <span className="rounded-md bg-flag px-1.5 py-0.5 text-[11px] font-bold text-white whitespace-nowrap">
                      무료
                    </span>
                  )}
                  {r.payment === 'pending' && (
                    <span className="rounded-md border border-line px-1.5 py-0.5 text-[11px] font-bold text-deep whitespace-nowrap">
                      입금 대기
                    </span>
                  )}
                  {r.payment === 'manual' && (
                    <span className="text-xs font-semibold text-fair whitespace-nowrap">입금 확인</span>
                  )}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
