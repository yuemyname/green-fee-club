'use client';

import { useState } from 'react';
import {
  addStamp, findCustomersByLast4, getCustomerDetailById, type CustomerDetail,
} from '@/app/actions/customer';
import type { CustomerOverview } from '@/lib/types';
import CustomerPicker from '@/components/CustomerPicker';
import { STAMP_GOAL } from '@/lib/constants';
import { fmtDate, toHM, todayStr } from '@/lib/time';
import type { CouponState } from '@/components/StampCard';
import Btn from '@/components/ui/Btn';
import Card from '@/components/ui/Card';
import Eyebrow from '@/components/ui/Eyebrow';
import StampCard from '@/components/StampCard';
import { useToast } from '@/components/ui/Toast';

export default function PointPage() {
  const toast = useToast();
  const [last4, setLast4] = useState('');
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [looked, setLooked] = useState(false); // 현재 번호로 조회를 마쳤는지
  const [picker, setPicker] = useState<CustomerOverview[] | null>(null);

  const changeLast4 = (v: string) => {
    setLast4(v.replace(/\D/g, ''));
    setDetail(null);
    setNotFound(false);
    setLooked(false);
    setPicker(null);
  };

  const loadDetail = async (id: number) => {
    const d = await getCustomerDetailById(id);
    setDetail(d);
    setNotFound(d === null);
    setLooked(true);
  };

  // 조회 — 도장을 찍지 않고 현재 포인트만 보여준다.
  // 같은 뒤 4자리 고객이 여러 명이면 선택 팝업을 띄운다.
  const lookup = async () => {
    if (last4.length !== 4 || looked || busy) return;
    setBusy(true);
    try {
      const list = await findCustomersByLast4(last4);
      if (list.length === 0) {
        setNotFound(true);
        setLooked(true);
      } else if (list.length === 1) {
        await loadDetail(list[0].id);
      } else {
        setPicker(list);
      }
    } finally {
      setBusy(false);
    }
  };

  const stamp = async () => {
    if (!detail || busy) return;
    setBusy(true);
    try {
      const res = await addStamp(detail.customer.id, todayStr());
      if (!res.ok) {
        toast(res.error);
        return;
      }
      const { customer, stampDates, couponUses, progress, cardCompleted } = res.value;
      setDetail({ customer, stampDates, couponUses });
      toast(
        cardCompleted
          ? `카드 완성! ${customer.name}님 무료 예약권 1장이 나왔습니다.`
          : `${customer.name}님 포인트 적립 ${progress}/${STAMP_GOAL}`,
      );
    } finally {
      setBusy(false);
    }
  };

  // 10개 단위로 카드 분할. 마지막이 꽉 찼으면 새 빈 카드를 하나 더 붙인다.
  const cards: string[][] = [];
  if (detail) {
    for (let i = 0; i < detail.stampDates.length; i += STAMP_GOAL) {
      cards.push(detail.stampDates.slice(i, i + STAMP_GOAL));
    }
    if (cards.length === 0 || cards[cards.length - 1].length === STAMP_GOAL) cards.push([]);
  }
  const remain = cards.length ? STAMP_GOAL - cards[cards.length - 1].length : 0;

  const usedCount = detail
    ? Math.floor(detail.customer.totalStamps / STAMP_GOAL) - detail.customer.coupons
    : 0;
  const couponState = (i: number): CouponState => {
    if (i >= usedCount) return { used: false };
    const u = detail?.couponUses[i];
    return {
      used: true,
      info: u
        ? `${fmtDate(u.date)} · ${u.room_name ?? ''} ${toHM(u.start_min)}–${toHM(u.end_min)} 예약에 사용`
        : '',
    };
  };

  return (
    <div>
      <Eyebrow>POINT</Eyebrow>
      <h1 className="mt-1 text-2xl font-black text-deep" style={{ letterSpacing: '-0.02em' }}>
        포인트 적립
      </h1>
      <p className="mt-2 text-sm text-sub">
        번호 입력 → 조회로 현재 포인트를 확인한 뒤 → 적립을 눌러야 도장이 찍힙니다.
      </p>

      <div className="mt-5 flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={last4}
          onChange={e => changeLast4(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (detail ? stamp() : lookup())}
          placeholder="뒤 4자리"
          className="h-12 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-center text-xl font-bold tracking-widest tabular-nums outline-none placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-sub focus:border-fair"
        />
        <Btn tone="ghost" onClick={lookup} disabled={last4.length !== 4 || looked || busy}>
          조회
        </Btn>
        <Btn onClick={stamp} disabled={!detail || busy}>
          적립
        </Btn>
      </div>

      {detail && (
        <div className="mt-6">
          <Card className="flex items-center justify-between bg-turf">
            <div>
              <p className="text-lg font-black text-deep">{detail.customer.name}</p>
              <p className="mt-0.5 text-sm text-sub tabular-nums">{detail.customer.phone}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-fair tabular-nums">
                도장 {detail.customer.progress}/{STAMP_GOAL}
              </p>
              <p className="mt-0.5 text-sm font-black text-flag tabular-nums">
                무료 예약권 {detail.customer.coupons}회
              </p>
            </div>
          </Card>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
        </div>
      )}
      {picker && (
        <CustomerPicker
          candidates={picker}
          onPick={c => {
            setPicker(null);
            setBusy(true);
            loadDetail(c.id).finally(() => setBusy(false));
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {notFound && (
        <p className="mt-4 text-sm font-semibold text-flag">
          등록되지 않은 번호입니다. 고객 관리에서 먼저 추가해 주세요.
        </p>
      )}
    </div>
  );
}
