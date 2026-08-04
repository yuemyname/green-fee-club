'use client';

import { useEffect, useState } from 'react';
import {
  createBlock, createRoom, deleteBlock, deleteRoom, listBlocks, listRooms,
  updateRoom, type BlockRow,
} from '@/app/actions/room';
import { createAdmin, deleteAdmin, listAdmins, type AdminRow } from '@/app/actions/auth';
import { fmtDate, toHM, todayStr } from '@/lib/time';
import type { Room } from '@/lib/types';
import Btn from '@/components/ui/Btn';
import Card from '@/components/ui/Card';
import DatePicker from '@/components/ui/DatePicker';
import Eyebrow from '@/components/ui/Eyebrow';
import { useToast } from '@/components/ui/Toast';

/** 30분 단위 시간 선택 */
function TimeSel({
  value, onChange, label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const opts = [];
  for (let m = 0; m <= 1440; m += 30) opts.push(m);
  return (
    <select
      aria-label={label}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="h-11 rounded-lg border border-line bg-white px-2 text-sm font-semibold tabular-nums outline-none focus:border-fair"
    >
      {opts.map(m => (
        <option key={m} value={m}>{toHM(m)}</option>
      ))}
    </select>
  );
}

function RoomEditor({
  room, onSaved, onDeleted,
}: {
  room: Room;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(room.name);
  const [open, setOpen] = useState(room.open_min);
  const [close, setClose] = useState(room.close_min);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await updateRoom(room.id, name, open, close);
      toast(res.ok ? `${name.trim()}이(가) 저장되었습니다.` : res.error);
      if (res.ok) onSaved();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (busy || !window.confirm(`${room.name}을 삭제할까요?`)) return;
    setBusy(true);
    try {
      const res = await deleteRoom(room.id);
      toast(res.ok ? `${room.name}이(가) 삭제되었습니다.` : res.error);
      if (res.ok) onDeleted();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-3">
      <input
        aria-label="방 이름"
        value={name}
        onChange={e => setName(e.target.value)}
        className="h-11 w-full rounded-lg border border-line bg-white px-3 text-base font-bold outline-none focus:border-fair"
      />
      <div className="flex items-center gap-2">
        <span className="text-sm text-sub">운영시간</span>
        <TimeSel label={`${room.name} 운영 시작`} value={open} onChange={setOpen} />
        <span className="text-sub">–</span>
        <TimeSel label={`${room.name} 운영 종료`} value={close} onChange={setClose} />
      </div>
      <div className="flex gap-2">
        <Btn tone="ghost" onClick={remove} disabled={busy} className="flex-1">삭제</Btn>
        <Btn onClick={save} disabled={busy} className="flex-1">저장</Btn>
      </div>
    </Card>
  );
}

export default function RoomsPage() {
  const toast = useToast();
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [blocks, setBlocks] = useState<BlockRow[] | null>(null);
  const [admins, setAdmins] = useState<AdminRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  // 관리자 추가 폼
  const [adUser, setAdUser] = useState('');
  const [adPass, setAdPass] = useState('');

  // 방 추가 폼
  const [newName, setNewName] = useState('');
  const [newOpen, setNewOpen] = useState(480);
  const [newClose, setNewClose] = useState(1440);

  // 예약 불가 시간 추가 폼
  const [blLabel, setBlLabel] = useState('');
  const [blRoom, setBlRoom] = useState<'all' | number>('all');
  const [blDaily, setBlDaily] = useState(true);
  const [blDate, setBlDate] = useState(todayStr());
  const [blStart, setBlStart] = useState(720);
  const [blEnd, setBlEnd] = useState(780);

  const refresh = () => {
    listRooms().then(setRooms).catch(() => setRooms([]));
    listBlocks().then(setBlocks).catch(() => setBlocks([]));
    listAdmins().then(setAdmins).catch(() => setAdmins([]));
  };
  useEffect(refresh, []);

  const addRoom = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await createRoom(newName, newOpen, newClose);
      toast(res.ok ? `${newName.trim()}이(가) 추가되었습니다.` : res.error);
      if (res.ok) {
        setNewName('');
        refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const addBlock = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await createBlock({
        room_id: blRoom === 'all' ? null : blRoom,
        label: blLabel,
        date: blDaily ? null : blDate,
        start_min: blStart,
        end_min: blEnd,
      });
      toast(res.ok ? '예약 불가 시간이 추가되었습니다.' : res.error);
      if (res.ok) {
        setBlLabel('');
        refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const removeBlock = async (id: number) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await deleteBlock(id);
      toast(res.ok ? '삭제되었습니다.' : res.error);
      if (res.ok) refresh();
    } finally {
      setBusy(false);
    }
  };

  const addAdmin = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await createAdmin(adUser, adPass);
      toast(res.ok ? `관리자 ${adUser.trim()}이(가) 추가되었습니다.` : res.error);
      if (res.ok) {
        setAdUser('');
        setAdPass('');
        refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const removeAdmin = async (id: number, username: string) => {
    if (busy || !window.confirm(`관리자 ${username}을 삭제할까요?`)) return;
    setBusy(true);
    try {
      const res = await deleteAdmin(id);
      toast(res.ok ? '삭제되었습니다.' : res.error);
      if (res.ok) refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Eyebrow>SETTINGS</Eyebrow>
      <h1 className="mt-1 text-2xl font-black text-deep" style={{ letterSpacing: '-0.02em' }}>
        방 관리
      </h1>

      <section className="mt-5 space-y-3">
        {rooms?.map(r => (
          <RoomEditor key={`${r.id}-${r.name}-${r.open_min}-${r.close_min}`} room={r} onSaved={refresh} onDeleted={refresh} />
        ))}

        <Card className="space-y-3 bg-turf">
          <p className="text-sm font-bold text-deep">새 방 추가</p>
          <input
            aria-label="새 방 이름"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="3번방"
            className="h-11 w-full rounded-lg border border-line bg-white px-3 text-base outline-none placeholder:text-sub focus:border-fair"
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-sub">운영시간</span>
            <TimeSel label="새 방 운영 시작" value={newOpen} onChange={setNewOpen} />
            <span className="text-sub">–</span>
            <TimeSel label="새 방 운영 종료" value={newClose} onChange={setNewClose} />
          </div>
          <Btn onClick={addRoom} disabled={busy || !newName.trim()} className="w-full">방 추가</Btn>
        </Card>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-deep">예약 불가 시간</h2>
        <p className="mt-1 text-xs text-sub">점심시간, 정비 시간 등 예약을 받지 않을 시간을 등록합니다.</p>

        <div className="mt-3 space-y-2">
          {blocks && blocks.length === 0 && (
            <Card><p className="text-sm text-sub">등록된 예약 불가 시간이 없습니다.</p></Card>
          )}
          {blocks?.map(b => (
            <Card key={b.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">{b.label}</p>
                <p className="mt-0.5 text-xs text-sub tabular-nums">
                  {b.room_name ?? '모든 방'} · {b.date ? fmtDate(b.date) : '매일'} ·{' '}
                  {toHM(b.start_min)} – {toHM(b.end_min)}
                </p>
              </div>
              <Btn tone="ghost" onClick={() => removeBlock(b.id)} disabled={busy}>삭제</Btn>
            </Card>
          ))}
        </div>

        <Card className="mt-3 space-y-3 bg-turf">
          <p className="text-sm font-bold text-deep">예약 불가 시간 추가</p>
          <input
            aria-label="예약 불가 라벨"
            value={blLabel}
            onChange={e => setBlLabel(e.target.value)}
            placeholder="점심시간"
            className="h-11 w-full rounded-lg border border-line bg-white px-3 text-base outline-none placeholder:text-sub focus:border-fair"
          />
          <select
            aria-label="대상 방"
            value={blRoom === 'all' ? 'all' : String(blRoom)}
            onChange={e => setBlRoom(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="h-11 w-full rounded-lg border border-line bg-white px-2 text-sm font-semibold outline-none focus:border-fair"
          >
            <option value="all">모든 방</option>
            {rooms?.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={blDaily}
              onChange={e => setBlDaily(e.target.checked)}
              className="size-5 accent-(--color-fair)"
            />
            매일 반복
          </label>
          {!blDaily && <DatePicker value={blDate} onChange={setBlDate} />}
          <div className="flex items-center gap-2">
            <span className="text-sm text-sub">시간</span>
            <TimeSel label="불가 시작 시간" value={blStart} onChange={setBlStart} />
            <span className="text-sub">–</span>
            <TimeSel label="불가 종료 시간" value={blEnd} onChange={setBlEnd} />
          </div>
          <Btn onClick={addBlock} disabled={busy} className="w-full">추가</Btn>
        </Card>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-deep">관리자 계정</h2>
        <p className="mt-1 text-xs text-sub">관리자 화면에 로그인할 수 있는 계정을 관리합니다.</p>

        <div className="mt-3 space-y-2">
          {admins?.map(a => (
            <Card key={a.id} className="flex items-center justify-between">
              <p className="text-sm font-bold">
                {a.username}
                {a.isMe && <span className="ml-1.5 rounded-md bg-turf px-1.5 py-0.5 text-[11px] font-bold text-fair">현재 로그인</span>}
              </p>
              <Btn tone="ghost" onClick={() => removeAdmin(a.id, a.username)} disabled={busy}>
                삭제
              </Btn>
            </Card>
          ))}
        </div>

        <Card className="mt-3 space-y-3 bg-turf">
          <p className="text-sm font-bold text-deep">관리자 추가</p>
          <input
            aria-label="관리자 아이디"
            value={adUser}
            onChange={e => setAdUser(e.target.value)}
            placeholder="아이디 (3자 이상)"
            className="h-11 w-full rounded-lg border border-line bg-white px-3 text-base outline-none placeholder:text-sub focus:border-fair"
          />
          <input
            aria-label="관리자 비밀번호"
            type="password"
            value={adPass}
            onChange={e => setAdPass(e.target.value)}
            placeholder="비밀번호 (4자 이상)"
            className="h-11 w-full rounded-lg border border-line bg-white px-3 text-base outline-none placeholder:text-sub focus:border-fair"
          />
          <Btn onClick={addAdmin} disabled={busy || adUser.trim().length < 3 || adPass.length < 4} className="w-full">
            관리자 추가
          </Btn>
        </Card>
      </section>
    </div>
  );
}
