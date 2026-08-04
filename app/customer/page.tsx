'use client';

import { useState } from 'react';
import { cardProgress, coupons, createCustomer, useDB } from '@/lib/db';
import { STAMP_GOAL } from '@/lib/constants';
import Btn from '@/components/ui/Btn';
import Card from '@/components/ui/Card';
import Eyebrow from '@/components/ui/Eyebrow';
import Field from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';

export default function CustomerPage() {
  const db = useDB();
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const submit = () => {
    const res = createCustomer(name, phone);
    if (!res.ok) {
      toast(res.error);
      return;
    }
    toast(`${res.value.name}님이 등록되었습니다.`);
    setName('');
    setPhone('');
  };

  const list = db ? [...db.customers].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)) : [];

  return (
    <div>
      <Eyebrow>CUSTOMER</Eyebrow>
      <h1 className="mt-1 text-2xl font-black text-deep" style={{ letterSpacing: '-0.02em' }}>
        고객 등록
      </h1>

      <Card className="mt-5 space-y-4">
        <Field
          label="이름"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="정승우"
        />
        <Field
          label="전화번호"
          type="text"
          inputMode="numeric"
          maxLength={11}
          value={phone}
          onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="01053971406"
        />
        <Btn onClick={submit} className="w-full">
          고객 등록
        </Btn>
      </Card>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-deep">
          등록된 고객 <span className="tabular-nums">{list.length}</span>명
        </h2>
        <div className="mt-2 space-y-2">
          {list.map(c => {
            const n = db ? coupons(db, c) : 0;
            return (
              <Card key={c.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">{c.name}</p>
                  <p className="mt-0.5 text-xs text-sub tabular-nums">{c.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-fair tabular-nums">
                    {db ? cardProgress(db, c.id) : 0} / {STAMP_GOAL}
                  </p>
                  {n > 0 && <p className="mt-0.5 text-xs font-bold text-flag tabular-nums">무료 {n}회</p>}
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
