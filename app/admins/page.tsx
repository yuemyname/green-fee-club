'use client';

import { useEffect, useState } from 'react';
import {
  changeAdminPassword, changeAdminUsername, getStore, listAdmins,
  type AdminRow, type StoreInfo,
} from '@/app/actions/auth';
import Btn from '@/components/ui/Btn';
import Card from '@/components/ui/Card';
import Eyebrow from '@/components/ui/Eyebrow';
import { useToast } from '@/components/ui/Toast';

function AdminEditor({
  admin,
  onChanged,
}: {
  admin: AdminRow;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [username, setUsername] = useState(admin.username);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwVal, setPwVal] = useState('');
  const [busy, setBusy] = useState(false);

  const nameChanged = username.trim() !== admin.username;

  const saveUsername = async () => {
    if (busy || !nameChanged) return;
    setBusy(true);
    try {
      const res = await changeAdminUsername(admin.id, username);
      toast(res.ok ? '아이디가 변경되었습니다.' : res.error);
      if (res.ok) onChanged();
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    if (busy || pwVal.length < 4) return;
    setBusy(true);
    try {
      const res = await changeAdminPassword(admin.id, pwVal);
      toast(res.ok ? '비밀번호가 변경되었습니다.' : res.error);
      if (res.ok) {
        setPwOpen(false);
        setPwVal('');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          aria-label={`${admin.username} 아이디`}
          value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && saveUsername()}
          className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-base font-bold outline-none focus:border-fair"
        />
        {admin.isMe && (
          <span className="rounded-md bg-turf px-1.5 py-0.5 text-[11px] font-bold text-fair whitespace-nowrap">
            현재 로그인
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <Btn
          tone="ghost"
          onClick={saveUsername}
          disabled={busy || !nameChanged || username.trim().length < 3}
          className="flex-1"
        >
          아이디 저장
        </Btn>
        <Btn
          tone="ghost"
          onClick={() => {
            setPwOpen(v => !v);
            setPwVal('');
          }}
          disabled={busy}
          className="flex-1"
        >
          비밀번호 변경
        </Btn>
      </div>

      {pwOpen && (
        <div className="flex gap-2">
          <input
            aria-label={`${admin.username} 새 비밀번호`}
            type="password"
            value={pwVal}
            onChange={e => setPwVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && savePassword()}
            placeholder="새 비밀번호 (4자 이상)"
            className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-base outline-none placeholder:text-sub focus:border-fair"
          />
          <Btn onClick={savePassword} disabled={busy || pwVal.length < 4}>
            변경
          </Btn>
        </div>
      )}
    </Card>
  );
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminRow[] | null>(null);
  const [store, setStore] = useState<StoreInfo | null>(null);

  const refresh = () => {
    listAdmins().then(setAdmins).catch(() => setAdmins([]));
    getStore().then(setStore).catch(() => {});
  };
  useEffect(refresh, []);

  return (
    <div>
      <Eyebrow>ADMIN</Eyebrow>
      <h1 className="mt-1 text-2xl font-black text-deep" style={{ letterSpacing: '-0.02em' }}>
        관리자 계정
      </h1>
      <p className="mt-2 text-sm text-sub">
        {store ? `${store.name} (매장번호 ${store.code})` : '매장'} 소속 관리자 계정입니다. 아이디와 비밀번호를 변경할 수 있습니다.
      </p>

      <div className="mt-5 space-y-2">
        {admins?.map(a => (
          <AdminEditor key={`${a.id}-${a.username}`} admin={a} onChanged={refresh} />
        ))}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-sub">
        비밀번호만으로 로그인하므로, 세 계정의 비밀번호를 서로 다르게 설정해 두면 누가 로그인했는지 구분할 수 있습니다.
      </p>
    </div>
  );
}
