'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/app/actions/auth';
import Btn from '@/components/ui/Btn';
import Eyebrow from '@/components/ui/Eyebrow';
import { useToast } from '@/components/ui/Toast';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const submit = async () => {
    if (!password || busy) return;
    setBusy(true);
    const res = await login(password);
    if (res.ok) {
      router.replace('/');
    } else {
      toast('비밀번호가 맞지 않습니다.');
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col justify-center pt-16">
      <Eyebrow>SCREEN GOLF (GOLD ZONE)</Eyebrow>
      <h1 className="mt-2 text-4xl font-black leading-tight text-deep" style={{ letterSpacing: '-0.03em' }}>
        트윈빌스크린
        <br />
        예약을 한방에
      </h1>
      <p className="mt-3 text-sm text-sub">관리자 비밀번호로 들어갑니다.</p>

      <div className="mt-8 flex gap-2">
        <input
          aria-label="비밀번호"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="비밀번호"
          autoFocus
          className="h-12 min-w-0 flex-1 rounded-lg border border-line bg-white px-4 text-center text-xl font-bold tracking-widest outline-none placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-sub focus:border-fair"
        />
        <Btn onClick={submit} disabled={!password || busy} className="px-6">
          로그인
        </Btn>
      </div>

      <p className="mt-6 text-center text-xs text-sub">
        체험용 비밀번호: <span className="font-semibold tabular-nums">1406</span>
      </p>
    </div>
  );
}
