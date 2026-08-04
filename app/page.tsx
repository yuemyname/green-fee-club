'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listCustomers } from '@/app/actions/customer';
import type { CustomerOverview } from '@/lib/types';
import Eyebrow from '@/components/ui/Eyebrow';
import Card from '@/components/ui/Card';

const MENUS = [
  { href: '/book', title: '방 예약', desc: '인원수에 맞는 시간대를 잡습니다' },
  { href: '/point', title: '포인트 적립', desc: '번호만 넣으면 도장 1개' },
  { href: '/status', title: '예약 현황', desc: '방별 빈 시간을 한눈에' },
  { href: '/customer', title: '고객 등록', desc: '이름과 번호만 받습니다' },
  { href: '/rooms', title: '방 관리', desc: '운영시간과 예약 불가 시간 설정' },
];

export default function MenuPage() {
  const [customers, setCustomers] = useState<CustomerOverview[] | null>(null);

  useEffect(() => {
    listCustomers().then(setCustomers).catch(() => setCustomers([]));
  }, []);

  const holders = customers?.filter(c => c.coupons > 0) ?? [];

  return (
    <div>
      <Eyebrow>GREEN ROUND</Eyebrow>
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

      <section className="mt-8">
        <h2 className="text-sm font-bold text-deep">무료 예약권 보유 고객</h2>
        <div className="mt-2 space-y-2">
          {customers && holders.length === 0 && (
            <Card>
              <p className="text-sm text-sub">아직 카드를 채운 고객이 없습니다.</p>
            </Card>
          )}
          {holders.map(c => (
            <Card key={c.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">{c.name}</p>
                <p className="mt-0.5 text-xs text-sub tabular-nums">{c.phone}</p>
              </div>
              <span className="text-sm font-black text-flag tabular-nums">무료 {c.coupons}회</span>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
