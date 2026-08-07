'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getCustomerProfile, type CustomerProfile } from '@/app/actions/customer';
import { STAMP_GOAL } from '@/lib/constants';
import { fmtDate, toHM, todayStr } from '@/lib/time';
import StampCard, { type CouponState } from '@/components/StampCard';
import Card from '@/components/ui/Card';
import Eyebrow from '@/components/ui/Eyebrow';

const PAYMENT_LABEL = {
  pending: '입금 대기',
  manual: '입금 확인',
  point: '무료',
} as const;

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(id)) {
      setLoaded(true);
      return;
    }
    getCustomerProfile(id)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoaded(true));
  }, [id]);

  const back = (
    <Link href="/customer" className="text-sm font-semibold text-sub">
      ‹ 고객 목록
    </Link>
  );

  if (!loaded) {
    return (
      <div>
        {back}
        <p className="mt-4 text-sm text-sub">불러오는 중…</p>
      </div>
    );
  }
  if (!profile) {
    return (
      <div>
        {back}
        <p className="mt-4 text-sm font-semibold text-flag">고객을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const { customer, stampDates, couponUses, reservations } = profile;
  const today = todayStr();

  // 10개 단위로 카드 분할 — 마지막이 꽉 찼으면 빈 카드를 하나 더 붙인다
  const cards: string[][] = [];
  for (let i = 0; i < stampDates.length; i += STAMP_GOAL) {
    cards.push(stampDates.slice(i, i + STAMP_GOAL));
  }
  if (cards.length === 0 || cards[cards.length - 1].length === STAMP_GOAL) cards.push([]);
  const remain = STAMP_GOAL - cards[cards.length - 1].length;

  const usedCount = Math.floor(customer.totalStamps / STAMP_GOAL) - customer.coupons;
  const couponState = (i: number): CouponState => {
    if (i >= usedCount) return { used: false };
    const u = couponUses[i];
    return {
      used: true,
      info: u
        ? `${fmtDate(u.date)} · ${u.room_name ?? ''} ${toHM(u.start_min)}–${toHM(u.end_min)} 예약에 사용`
        : '',
    };
  };

  // 예약은 최근순 — 오늘 이전(포함)의 첫 건이 마지막 이용일
  const lastVisit = reservations.find(r => r.date <= today)?.date ?? null;

  return (
    <div>
      {back}
      <Eyebrow className="mt-3">CUSTOMER</Eyebrow>
      <h1 className="mt-1 text-2xl font-black text-deep" style={{ letterSpacing: '-0.02em' }}>
        {customer.name}
      </h1>

      {/* 1. 손님 정보 */}
      <section className="mt-5">
        <h2 className="text-sm font-bold text-deep">손님 정보</h2>
        <Card className="mt-2 space-y-2 bg-turf">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sub">전화번호</span>
            <span className="text-sm font-bold tabular-nums">{customer.phone}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sub">등록일</span>
            <span className="text-sm font-bold tabular-nums">
              {profile.joinedAt ? fmtDate(profile.joinedAt) : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sub">마지막 이용 일자</span>
            <span className="text-sm font-bold tabular-nums">
              {lastVisit ? fmtDate(lastVisit) : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sub">총 예약 건수</span>
            <span className="text-sm font-bold tabular-nums">{reservations.length}건</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sub">누적 도장</span>
            <span className="text-sm font-bold tabular-nums">{customer.totalStamps}개</span>
          </div>
        </Card>
      </section>

      {/* 2. 예약 내역 */}
      <section className="mt-8">
        <h2 className="text-sm font-bold text-deep">
          예약 내역{' '}
          <span className="tabular-nums text-sub">{reservations.length}건</span>
        </h2>
        <div className="mt-2 space-y-2">
          {reservations.length === 0 && (
            <Card><p className="text-sm text-sub">예약 내역이 없습니다.</p></Card>
          )}
          {reservations.map(r => (
            <Card
              key={r.id}
              className={`flex items-center justify-between ${r.date >= today ? 'bg-turf' : ''}`}
            >
              <div>
                <p className="text-sm font-bold tabular-nums">
                  {fmtDate(r.date)} {toHM(r.start_min)} – {toHM(r.end_min)}
                </p>
                <p className="mt-0.5 text-xs text-sub tabular-nums">
                  {r.room_name ?? '삭제된 방'} · {r.people}명
                </p>
              </div>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${
                  r.payment === 'point'
                    ? 'bg-flag text-white'
                    : r.payment === 'manual'
                      ? 'border border-line text-fair'
                      : 'border border-line text-deep'
                }`}
              >
                {PAYMENT_LABEL[r.payment]}
              </span>
            </Card>
          ))}
        </div>
      </section>

      {/* 3. 포인트 현황 */}
      <section className="mt-8">
        <h2 className="text-sm font-bold text-deep">포인트 현황</h2>
        <p className="mt-1 text-xs text-sub tabular-nums">{remain}회 더 이용하면 무료 예약 1회</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {cards.map((cardDates, i) => (
            <StampCard
              key={i}
              dates={cardDates}
              coupon={cardDates.length >= STAMP_GOAL ? couponState(i) : undefined}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
