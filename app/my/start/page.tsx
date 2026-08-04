'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startCustomerSession } from '@/app/actions/my';
import Btn from '@/components/ui/Btn';
import Eyebrow from '@/components/ui/Eyebrow';
import { useToast } from '@/components/ui/Toast';

export default function MyStartPage() {
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const submit = async () => {
    if (phone.length !== 11 || busy) return;
    setBusy(true);
    try {
      const res = await startCustomerSession(phone);
      if (!res.ok) {
        toast(res.error);
        return;
      }
      toast(res.isNew ? '환영합니다! 자동으로 등록되었습니다.' : `${res.name}님, 다시 오셨네요!`);
      router.replace('/my');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col justify-center pt-16">
      <Eyebrow>SCREEN GOLF</Eyebrow>
      <h1 className="mt-2 text-4xl font-black leading-tight text-deep" style={{ letterSpacing: '-0.03em' }}>
        그린라운드
        <br />
        예약과 포인트를 한번에
      </h1>
      <p className="mt-3 text-sm text-sub">
        휴대폰 번호만 입력하면 바로 시작됩니다.
        <br />
        처음이면 자동으로 등록되고, 다음부터는 이 기기에서 자동 로그인됩니다.
      </p>

      <div className="mt-8 space-y-2">
        <input
          type="text"
          inputMode="numeric"
          maxLength={11}
          value={phone}
          onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="01012345678"
          autoFocus
          className="h-12 w-full rounded-lg border border-line bg-white px-4 text-center text-xl font-bold tracking-widest tabular-nums outline-none placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-sub focus:border-fair"
        />
        <Btn onClick={submit} disabled={phone.length !== 11 || busy} className="w-full">
          시작하기
        </Btn>
      </div>
    </div>
  );
}
