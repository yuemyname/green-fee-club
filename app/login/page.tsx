'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/app/actions/auth';
import Btn from '@/components/ui/Btn';
import Eyebrow from '@/components/ui/Eyebrow';
import { useToast } from '@/components/ui/Toast';

export default function LoginPage() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const submit = async () => {
    if (code.length !== 4 || busy) return;
    setBusy(true);
    const res = await login(code);
    if (res.ok) {
      router.replace('/');
    } else {
      toast('번호가 맞지 않습니다. 뒤 4자리를 다시 확인해 주세요.');
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col justify-center pt-16">
      <Eyebrow>SCREEN GOLF</Eyebrow>
      <h1 className="mt-2 text-4xl font-black leading-tight text-deep" style={{ letterSpacing: '-0.03em' }}>
        트윈빌스크린
        <br />
        예약을 한방에
      </h1>
      <p className="mt-3 text-sm text-sub">사장님 전화번호 뒤 4자리로 들어갑니다.</p>

      <div className="mt-8 flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="뒤 4자리"
          autoFocus
          className="h-12 flex-1 rounded-lg border border-line bg-white px-4 text-center text-xl font-bold tracking-widest tabular-nums outline-none placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-sub focus:border-fair"
        />
        <Btn onClick={submit} disabled={code.length !== 4 || busy} className="px-6">
          로그인
        </Btn>
      </div>

      <p className="mt-6 text-center text-xs text-sub">
        체험용 번호: <span className="font-semibold tabular-nums">1406</span>
      </p>
    </div>
  );
}
