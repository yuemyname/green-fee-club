'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createCustomer, searchCustomers, type CustomerSearch } from '@/app/actions/customer';
import Btn from '@/components/ui/Btn';
import Card from '@/components/ui/Card';
import Eyebrow from '@/components/ui/Eyebrow';
import Field from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';

const LIMIT = 30;

export default function CustomerPage() {
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState('');
  const [result, setResult] = useState<CustomerSearch | null>(null);

  // 입력이 멈추면 조회 — 서버에서 이름/번호를 함께 찾는다
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      searchCustomers(query, LIMIT)
        .then(r => { if (alive) setResult(r); })
        .catch(() => { if (alive) setResult({ total: 0, matched: 0, customers: [] }); });
    }, query ? 200 : 0);
    return () => { alive = false; clearTimeout(t); };
  }, [query]);

  const refresh = () => {
    searchCustomers(query, LIMIT).then(setResult).catch(() => {});
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await createCustomer(name, phone);
      if (!res.ok) {
        toast(res.error);
        return;
      }
      toast(`${res.customer.name}님이 등록되었습니다.`);
      setName('');
      setPhone('');
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const searching = query.trim().length > 0;
  const list = result?.customers ?? [];

  return (
    <div>
      <Eyebrow>CUSTOMER</Eyebrow>
      <h1 className="mt-1 text-2xl font-black text-deep" style={{ letterSpacing: '-0.02em' }}>
        고객 관리
      </h1>

      {/* 1. 고객 조회 */}
      <section className="mt-5">
        <h2 className="text-sm font-bold text-deep">고객 조회</h2>
        <div className="mt-2 flex gap-2">
          <input
            aria-label="고객 검색"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="이름 또는 전화번호"
            className="h-12 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-base outline-none placeholder:text-sub focus:border-fair"
          />
          {searching && (
            <Btn tone="ghost" onClick={() => setQuery('')}>지우기</Btn>
          )}
        </div>

        <p className="mt-2 text-xs text-sub tabular-nums">
          {!result
            ? '불러오는 중…'
            : searching
              ? `검색 결과 ${result.matched}명`
              : `등록된 고객 ${result.total}명`}
          {result && result.matched > list.length && ` · 최근 ${list.length}명 표시`}
        </p>

        <div className="mt-2 space-y-2">
          {result && list.length === 0 && (
            <Card>
              <p className="text-sm text-sub">
                {searching ? '조건에 맞는 고객이 없습니다.' : '등록된 고객이 없습니다.'}
              </p>
            </Card>
          )}
          {list.map(c => (
            <Link key={c.id} href={`/customer/${c.id}`} className="block">
              <Card className="flex items-center justify-between transition-opacity active:opacity-80">
                <div>
                  <p className="text-sm font-bold">{c.name}</p>
                  <p className="mt-0.5 text-xs text-sub tabular-nums">{c.phone}</p>
                </div>
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-base font-bold text-sub"
                >
                  ›
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* 2. 신규 고객 등록 */}
      <section className="mt-8">
        <h2 className="text-sm font-bold text-deep">신규 고객 등록</h2>
        <Card className="mt-2 space-y-4 bg-turf">
          <Field
            label="이름"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="홍길동"
          />
          <Field
            label="전화번호"
            type="text"
            inputMode="numeric"
            maxLength={11}
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="01011112222"
          />
          <Btn onClick={submit} disabled={busy} className="w-full">
            고객 등록
          </Btn>
        </Card>
      </section>
    </div>
  );
}
