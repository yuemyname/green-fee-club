'use client';

import { useEffect, useState } from 'react';
import {
  changeAdminPassword, getStore, listAdmins, type AdminRow, type StoreInfo,
} from '@/app/actions/auth';
import Btn from '@/components/ui/Btn';
import Card from '@/components/ui/Card';
import Eyebrow from '@/components/ui/Eyebrow';
import { useToast } from '@/components/ui/Toast';

export default function AdminsPage() {
  const toast = useToast();
  const [admins, setAdmins] = useState<AdminRow[] | null>(null);
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [busy, setBusy] = useState(false);

  // 비밀번호 변경 폼 (행 단위)
  const [pwFor, setPwFor] = useState<number | null>(null);
  const [pwVal, setPwVal] = useState('');

  const refresh = () => {
    listAdmins().then(setAdmins).catch(() => setAdmins([]));
    getStore().then(setStore).catch(() => {});
  };
  useEffect(refresh, []);

  const changePw = async (id: number) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await changeAdminPassword(id, pwVal);
      toast(res.ok ? '비밀번호가 변경되었습니다.' : res.error);
      if (res.ok) {
        setPwFor(null);
        setPwVal('');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Eyebrow>ADMIN</Eyebrow>
      <h1 className="mt-1 text-2xl font-black text-deep" style={{ letterSpacing: '-0.02em' }}>
        관리자 계정
      </h1>
      <p className="mt-2 text-sm text-sub">
        {store ? `${store.name} (매장번호 ${store.code})` : '매장'} 소속 관리자 계정입니다. 비밀번호만 변경할 수 있습니다.
      </p>

      <div className="mt-5 space-y-2">
        {admins?.map(a => (
          <Card key={a.id}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">
                {a.username}
                {a.isMe && (
                  <span className="ml-1.5 rounded-md bg-turf px-1.5 py-0.5 text-[11px] font-bold text-fair">
                    현재 로그인
                  </span>
                )}
              </p>
              <Btn
                tone="ghost"
                onClick={() => {
                  setPwFor(pwFor === a.id ? null : a.id);
                  setPwVal('');
                }}
                disabled={busy}
              >
                비밀번호 변경
              </Btn>
            </div>
            {pwFor === a.id && (
              <div className="mt-3 flex gap-2">
                <input
                  aria-label={`${a.username} 새 비밀번호`}
                  type="password"
                  value={pwVal}
                  onChange={e => setPwVal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && pwVal.length >= 4 && changePw(a.id)}
                  placeholder="새 비밀번호 (4자 이상)"
                  className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-base outline-none placeholder:text-sub focus:border-fair"
                />
                <Btn onClick={() => changePw(a.id)} disabled={busy || pwVal.length < 4}>
                  변경
                </Btn>
              </div>
            )}
          </Card>
        ))}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-sub">
        비밀번호만으로 로그인하므로, 세 계정의 비밀번호를 서로 다르게 설정해 두면 누가 로그인했는지 구분할 수 있습니다.
      </p>
    </div>
  );
}
