'use client';

import { useEffect, useState } from 'react';
import {
  createBlock, createRoom, deleteBlock, deleteRoom, listBlocks, listRooms,
  setRoomActive, updateRoom, type BlockRow, type NewRoomBlock,
} from '@/app/actions/room';
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

  const toggleActive = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await setRoomActive(room.id, !room.active);
      toast(
        !res.ok ? res.error
          : room.active
            ? `${room.name} 운영을 중지했습니다. 예약 화면에 보이지 않습니다.`
            : `${room.name} 운영을 다시 시작했습니다.`,
      );
      if (res.ok) onSaved();
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await updateRoom(room.id, name, open, close);
      toast(res.ok ? `${name.trim()}이(가) 변경되었습니다.` : res.error);
      if (res.ok) onSaved();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (busy || !window.confirm(`${room.name}을 삭제할까요?`)) return;
    setBusy(true);
    try {
      const res = await deleteRoom(room.id, todayStr());
      toast(res.ok ? `${room.name}이(가) 삭제되었습니다.` : res.error);
      if (res.ok) onDeleted();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={`space-y-3 ${room.active ? '' : 'bg-line/30'}`}>
      <div className="flex items-center gap-2">
        <input
          aria-label="방 이름"
          value={name}
          onChange={e => setName(e.target.value)}
          className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-base font-bold outline-none focus:border-fair"
        />
        {!room.active && (
          <span className="rounded-md bg-sub px-1.5 py-0.5 text-[11px] font-bold text-white whitespace-nowrap">
            운영 중지
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-sub">운영시간</span>
        <TimeSel label={`${room.name} 운영 시작`} value={open} onChange={setOpen} />
        <span className="text-sub">–</span>
        <TimeSel label={`${room.name} 운영 종료`} value={close} onChange={setClose} />
      </div>
      <div className="flex gap-2">
        <Btn tone="ghost" onClick={toggleActive} disabled={busy} className="flex-1">
          {room.active ? '운영 중지' : '운영 재개'}
        </Btn>
        <Btn onClick={save} disabled={busy} className="flex-1">변경</Btn>
      </div>
      <Btn tone="ghost" onClick={remove} disabled={busy} className="w-full">삭제</Btn>
    </Card>
  );
}

/**
 * 등록된 방 이름을 보고 다음 방 이름을 제안한다.
 * 'N번방' 패턴으로 일관되면 다음 번호를, 아니면 안내 문구를 반환한다.
 */
function nextRoomHint(rooms: Room[] | null): string {
  if (!rooms) return '방 이름을 등록하세요';
  if (rooms.length === 0) return '1번방';
  const nums = rooms.map(r => /^(\d+)번방$/.exec(r.name.trim())?.[1]);
  if (nums.some(n => n === undefined)) return '방 이름을 등록하세요';
  return `${Math.max(...nums.map(n => Number(n))) + 1}번방`;
}

export default function RoomsPage() {
  const toast = useToast();
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [blocks, setBlocks] = useState<BlockRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  // 신규 방 등록 폼
  const [newName, setNewName] = useState('');
  const [newOpen, setNewOpen] = useState(480);
  const [newClose, setNewClose] = useState(1440);
  const [newBlocks, setNewBlocks] = useState<NewRoomBlock[]>([]);
  const [nbLabel, setNbLabel] = useState('');
  const [nbStart, setNbStart] = useState(720);
  const [nbEnd, setNbEnd] = useState(780);

  // 예약 불가 시간 추가 폼 (기존 방 대상)
  const [blLabel, setBlLabel] = useState('');
  const [blRoom, setBlRoom] = useState<'all' | number>('all');
  const [blDaily, setBlDaily] = useState(true);
  const [blDate, setBlDate] = useState(todayStr());
  const [blStart, setBlStart] = useState(720);
  const [blEnd, setBlEnd] = useState(780);

  const nameHint = nextRoomHint(rooms);

  const refresh = () => {
    listRooms().then(setRooms).catch(() => setRooms([]));
    listBlocks().then(setBlocks).catch(() => setBlocks([]));
  };
  useEffect(refresh, []);

  const stageBlock = () => {
    if (!(nbStart < nbEnd)) {
      toast('시간이 올바르지 않습니다. 시작이 종료보다 빨라야 합니다.');
      return;
    }
    setNewBlocks(list => [
      ...list,
      { label: nbLabel.trim() || '예약 불가', start_min: nbStart, end_min: nbEnd },
    ]);
    setNbLabel('');
  };

  const addRoom = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await createRoom(newName, newOpen, newClose, newBlocks);
      toast(res.ok ? `${newName.trim()}이(가) 추가되었습니다.` : res.error);
      if (res.ok) {
        setNewName('');
        setNewBlocks([]);
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

  return (
    <div>
      <Eyebrow>SETTINGS</Eyebrow>
      <h1 className="mt-1 text-2xl font-black text-deep" style={{ letterSpacing: '-0.02em' }}>
        방 관리
      </h1>

      {/* 1. 신규 방 등록 — 운영시간과 이 방 전용 예약 불가 시간을 함께 설정 */}
      <section className="mt-5">
        <h2 className="text-sm font-bold text-deep">신규 방 등록</h2>
        <Card className="mt-2 space-y-4 bg-turf">
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-sub">방 이름</span>
            <input
              aria-label="새 방 이름"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder={nameHint}
              className="h-11 w-full rounded-lg border border-line bg-white px-3 text-base outline-none placeholder:text-sub focus:border-fair"
            />
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-sub">운영 시간</span>
            <div className="flex items-center gap-2">
              <TimeSel label="새 방 운영 시작" value={newOpen} onChange={setNewOpen} />
              <span className="text-sub">–</span>
              <TimeSel label="새 방 운영 종료" value={newClose} onChange={setNewClose} />
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-sub">
              예약 불가 시간 <span className="font-normal">(이 방에 매일 적용)</span>
            </span>
            {newBlocks.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {newBlocks.map((b, i) => (
                  <div
                    key={i}
                    className="flex min-h-11 items-center justify-between rounded-lg border border-line bg-white px-3"
                  >
                    <span className="text-sm font-semibold tabular-nums">
                      {b.label} · {toHM(b.start_min)} – {toHM(b.end_min)}
                    </span>
                    <button
                      type="button"
                      aria-label={`${b.label} 제거`}
                      onClick={() => setNewBlocks(list => list.filter((_, j) => j !== i))}
                      className="px-2 text-sm font-bold text-sub"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              aria-label="새 방 예약 불가 라벨"
              value={nbLabel}
              onChange={e => setNbLabel(e.target.value)}
              placeholder="점심시간"
              className="h-11 w-full rounded-lg border border-line bg-white px-3 text-base outline-none placeholder:text-sub focus:border-fair"
            />
            <div className="mt-2 flex items-center gap-2">
              <TimeSel label="새 방 불가 시작" value={nbStart} onChange={setNbStart} />
              <span className="text-sub">–</span>
              <TimeSel label="새 방 불가 종료" value={nbEnd} onChange={setNbEnd} />
              <Btn tone="ghost" onClick={stageBlock} className="ml-auto">
                + 추가
              </Btn>
            </div>
          </div>

          <Btn onClick={addRoom} disabled={busy || !newName.trim()} className="w-full">
            방 등록
          </Btn>
        </Card>
      </section>

      {/* 2. 예약 불가 시간 — 전체 방/특정 방, 매일/특정 날짜 */}
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

      {/* 3. 등록된 방 목록 */}
      <section className="mt-8">
        <h2 className="text-sm font-bold text-deep">
          등록된 방 목록{rooms && <span className="tabular-nums"> {rooms.length}개</span>}
        </h2>
        <div className="mt-2 space-y-3">
          {rooms && rooms.length === 0 && (
            <Card><p className="text-sm text-sub">등록된 방이 없습니다. 위에서 방을 등록해 주세요.</p></Card>
          )}
          {rooms?.map(r => (
            <RoomEditor
              key={`${r.id}-${r.name}-${r.open_min}-${r.close_min}`}
              room={r}
              onSaved={refresh}
              onDeleted={refresh}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
