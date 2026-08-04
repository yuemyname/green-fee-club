'use client';

import { useEffect, useState } from 'react';
import { createCustomer, listCustomers } from '@/app/actions/customer';
import { STAMP_GOAL } from '@/lib/constants';
import type { CustomerOverview } from '@/lib/types';
import Btn from '@/components/ui/Btn';
import Card from '@/components/ui/Card';
import Eyebrow from '@/components/ui/Eyebrow';
import Field from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';

export default function CustomerPage() {
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<CustomerOverview[] | null>(null);

  const refresh = () => listCustomers().then(setList).catch(() => setList([]));
  useEffect(() => {
    refresh();
  }, []);

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

      <section className="mt-8">
        <h2 className="text-sm font-bold text-deep">
          등록된 고객 <span className="tabular-nums">{list?.length ?? 0}</span>명
        </h2>
        <div className="mt-2 space-y-2">
          {list?.map(c => (
            <Card key={c.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">{c.name}</p>
                <p className="mt-0.5 text-xs text-sub tabular-nums">{c.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-fair tabular-nums">
                  {c.progress} / {STAMP_GOAL}
                </p>
                {c.coupons > 0 && (
                  <p className="mt-0.5 text-xs font-bold text-flag tabular-nums">무료 {c.coupons}회</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
