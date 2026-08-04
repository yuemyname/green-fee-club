'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/app/actions/auth';
import Btn from '@/components/ui/Btn';
import Eyebrow from '@/components/ui/Eyebrow';
import Field from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const submit = async () => {
    if (!username.trim() || !password || busy) return;
    setBusy(true);
    const res = await login(username, password);
    if (res.ok) {
      router.replace('/');
    } else {
      toast('아이디 또는 비밀번호가 맞지 않습니다.');
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
      <p className="mt-3 text-sm text-sub">관리자 계정으로 들어갑니다.</p>

      <div className="mt-8 space-y-3">
        <Field
          label="아이디"
          aria-label="아이디"
          value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="admin1"
          autoFocus
        />
        <Field
          label="비밀번호"
          aria-label="비밀번호"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="••••"
        />
        <Btn onClick={submit} disabled={!username.trim() || !password || busy} className="w-full">
          로그인
        </Btn>
      </div>

      <p className="mt-6 text-center text-xs text-sub">
        체험용 계정: <span className="font-semibold">admin1 / 1406</span>
      </p>
    </div>
  );
}
