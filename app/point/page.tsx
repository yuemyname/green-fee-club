'use client';

import { useState } from 'react';
import { addStamp, coupons, findByLast4, stampDates, useDB } from '@/lib/db';
import { STAMP_GOAL } from '@/lib/constants';
import { todayStr } from '@/lib/time';
import Btn from '@/components/ui/Btn';
import Card from '@/components/ui/Card';
import Eyebrow from '@/components/ui/Eyebrow';
import StampCard from '@/components/StampCard';
import { useToast } from '@/components/ui/Toast';

export default function PointPage() {
  const db = useDB();
  const toast = useToast();
  const [last4, setLast4] = useState('');
  const [currentId, setCurrentId] = useState<number | null>(null);

  const submit = () => {
    if (last4.length !== 4) return;
    const res = addStamp(last4, todayStr());
    if (!res.ok) {
      toast(res.error);
      setCurrentId(null);
      return;
    }
    const { customer, total, progress, cardCompleted } = res.value;
    setCurrentId(customer.id);
    toast(
      cardCompleted
        ? `카드 완성! ${customer.name}님 무료 예약권 1장이 나왔습니다.`
        : `${customer.name}님 포인트 적립 ${progress}/${STAMP_GOAL}`,
    );
    void total;
  };

  const customer = db && currentId != null ? db.customers.find(c => c.id === currentId) : undefined;
  const dates = db && customer ? stampDates(db, customer.id) : [];

  // 10개 단위로 카드 분할. 마지막이 꽉 찼으면 새 빈 카드를 하나 더 붙인다.
  const cards: string[][] = [];
  for (let i = 0; i < dates.length; i += STAMP_GOAL) cards.push(dates.slice(i, i + STAMP_GOAL));
  if (cards.length === 0 || cards[cards.length - 1].length === STAMP_GOAL) cards.push([]);
  const remain = STAMP_GOAL - cards[cards.length - 1].length;

  return (
    <div>
      <Eyebrow>POINT</Eyebrow>
      <h1 className="mt-1 text-2xl font-black text-deep" style={{ letterSpacing: '-0.02em' }}>
        포인트 적립
      </h1>
      <p className="mt-2 text-sm text-sub">번호만 넣으면 무조건 도장이 1개 찍힙니다.</p>

      <div className="mt-5 flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={last4}
          onChange={e => setLast4(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="뒤 4자리"
          className="h-12 flex-1 rounded-lg border border-line bg-white px-4 text-center text-xl font-bold tracking-widest tabular-nums outline-none placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-sub focus:border-fair"
        />
        <Btn onClick={submit} disabled={last4.length !== 4} className="px-6">
          적립
        </Btn>
      </div>

      {db && customer && (
        <div className="mt-6">
          <Card className="flex items-center justify-between bg-turf">
            <div>
              <p className="text-lg font-black text-deep">{customer.name}</p>
              <p className="mt-0.5 text-sm text-sub tabular-nums">{customer.phone}</p>
            </div>
            <p className="text-sm font-black text-flag tabular-nums">
              무료 예약권 {coupons(db, customer)}회
            </p>
          </Card>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {cards.map((cardDates, i) => (
              <StampCard
                key={i}
                dates={cardDates}
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
      {db && !customer && last4.length === 4 && !findByLast4(db, last4) && (
        <p className="mt-4 text-sm font-semibold text-flag">
          등록되지 않은 번호입니다. 고객 등록에서 먼저 추가해 주세요.
        </p>
      )}
    </div>
  );
}
