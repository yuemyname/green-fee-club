'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getMyPage, myCancelReservation, myMonthReservedDates,
  type MyPage, type MyReservation,
} from '@/app/actions/my';
import { STAMP_GOAL } from '@/lib/constants';
import { fmtDate, toHM, todayStr } from '@/lib/time';
import type { CouponState } from '@/components/StampCard';
import Btn from '@/components/ui/Btn';
import Card from '@/components/ui/Card';
import Eyebrow from '@/components/ui/Eyebrow';
import MonthCalendar from '@/components/MonthCalendar';
import StampCard from '@/components/StampCard';
import { useToast } from '@/components/ui/Toast';

export default function MyHomePage() {
  const [data, setData] = useState<MyPage | null>(null);
  const [date, setDate] = useState(todayStr());
  const [month, setMonth] = useState(todayStr().slice(0, 6));
  const [marks, setMarks] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const loadMarks = useCallback((m: string) => {
    myMonthReservedDates(m).then(d => setMarks(new Set(d))).catch(() => {});
  }, []);

  const refresh = useCallback(() => {
    getMyPage().then(d => {
      if (d === null) router.replace('/my/start');
      else setData(d);
    }).catch(() => {});
  }, [router]);

  useEffect(refresh, [refresh]);
  useEffect(() => loadMarks(month), [month, loadMarks]);

  const cancel = async (id: number) => {
    if (busy || !window.confirm('이 예약을 취소할까요?')) return;
    setBusy(true);
    try {
      const res = await myCancelReservation(id);
      if (!res.ok) {
        toast(res.error);
        return;
      }
      toast(res.refunded ? '예약이 취소되고 무료 예약권이 반환되었습니다.' : '예약이 취소되었습니다.');
      refresh();
      loadMarks(month);
    } finally {
      setBusy(false);
    }
  };

  if (!data) return null;

  const ResCard = ({ r }: { r: MyReservation }) => (
    <Card>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold tabular-nums">
          {fmtDate(r.date)} · {r.room_name ?? ''} · {toHM(r.start_min)}–{toHM(r.end_min)}
        </p>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-sub tabular-nums">
          {r.people}명
          {r.payment === 'point' && (
            <span className="rounded-md bg-flag px-1.5 py-0.5 text-[11px] font-bold text-white whitespace-nowrap">무료</span>
          )}
          {r.payment === 'pending' && (
            <span className="rounded-md border border-line px-1.5 py-0.5 text-[11px] font-bold text-deep whitespace-nowrap">입금 대기</span>
          )}
        </span>
      </div>
      {r.payment !== 'manual' ? (
        <div className="mt-3 flex gap-2">
          <Btn
            tone="ghost"
            onClick={() => router.push(`/my/book?edit=${r.id}`)}
            disabled={busy}
            className="flex-1"
          >
            변경
          </Btn>
          <Btn tone="ghost" onClick={() => cancel(r.id)} disabled={busy} className="flex-1">
            취소
          </Btn>
        </div>
      ) : (
        <p className="mt-2 text-xs text-sub">입금 확인 완료 — 변경·취소는 매장에 문의해 주세요.</p>
      )}
    </Card>
  );

  const today = todayStr();
  const selectedDay = data.reservations
    .filter(r => r.date === date)
    .sort((a, b) => a.start_min - b.start_min);
  const upcoming = data.reservations
    .filter(r => r.date >= today && r.date !== date)
    .sort((a, b) => (a.date === b.date ? a.start_min - b.start_min : a.date < b.date ? -1 : 1));

  // 스탬프 카드 (10개 단위) + 사용된 쿠폰 매칭
  const cards: string[][] = [];
  for (let i = 0; i < data.stampDates.length; i += STAMP_GOAL) {
    cards.push(data.stampDates.slice(i, i + STAMP_GOAL));
  }
  if (cards.length === 0 || cards[cards.length - 1].length === STAMP_GOAL) cards.push([]);
  const remain = STAMP_GOAL - cards[cards.length - 1].length;
  const usedCount = Math.floor(data.customer.totalStamps / STAMP_GOAL) - data.customer.coupons;
  const couponState = (i: number): CouponState => {
    if (i >= usedCount) return { used: false };
    const u = data.couponUses[i];
    return {
      used: true,
      info: u
        ? `${fmtDate(u.date)} · ${u.room_name ?? ''} ${toHM(u.start_min)}–${toHM(u.end_min)} 예약에 사용`
        : '',
    };
  };

  return (
    <div>
      <Eyebrow>MY TWINVILL</Eyebrow>
      <Card className="mt-2 flex items-center justify-between bg-turf">
        <div>
          <p className="text-lg font-black text-deep">{data.customer.name}</p>
          <p className="mt-0.5 text-sm text-sub tabular-nums">{data.customer.phone}</p>
        </div>
        <p className="text-sm font-black text-flag tabular-nums">
          무료 예약권 {data.customer.coupons}회
        </p>
      </Card>

      <Link href="/my/book">
        <Btn className="mt-3 w-full">방 예약하기</Btn>
      </Link>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-deep">내 예약 달력</h2>
        <div className="mt-2">
          <MonthCalendar
            month={month}
            value={date}
            marked={marks}
            onSelect={setDate}
            onMonthChange={setMonth}
          />
        </div>

        <h3 className="mt-4 text-sm font-bold text-deep tabular-nums">{fmtDate(date)} 내 예약</h3>
        <div className="mt-2 space-y-2">
          {selectedDay.length === 0 && (
            <Card><p className="text-sm text-sub">이 날짜에는 예약이 없습니다.</p></Card>
          )}
          {selectedDay.map(r => <ResCard key={r.id} r={r} />)}
        </div>

        {upcoming.length > 0 && (
          <>
            <h3 className="mt-6 text-sm font-bold text-deep">
              다가오는 다른 예약 <span className="tabular-nums">{upcoming.length}</span>건
            </h3>
            <div className="mt-2 space-y-2">
              {upcoming.map(r => <ResCard key={r.id} r={r} />)}
            </div>
          </>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-deep">내 스탬프</h2>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {cards.map((cardDates, i) => (
            <StampCard
              key={i}
              dates={cardDates}
              coupon={cardDates.length >= STAMP_GOAL ? couponState(i) : undefined}
              footer={
                i === cards.length - 1 ? (
                  <p className="text-xs font-semibold text-sub tabular-nums">
                    {remain}회 더 이용하면 무료 예약 1회
                  </p>
                ) : undefined
              }
            />
          ))}
        </div>
      </section>
    </div>
  );
}
