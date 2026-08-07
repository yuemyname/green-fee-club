'use client';

import { useEffect, useState } from 'react';
import {
  applyBlocksToAllRooms, applyHoursToAllRooms, createBlock, createRoom, deleteBlock,
  deleteRoom, listBlocks, listRooms, setRoomActive, updateRoom,
  type BlockRow, type NewRoomBlock,
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
  value, onChange, label, compact = false,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  compact?: boolean;
}) {
  const opts = [];
  for (let m = 0; m <= 1440; m += 30) opts.push(m);
  return (
    <select
      aria-label={label}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className={`h-11 rounded-lg border border-line bg-white text-sm font-semibold tabular-nums outline-none focus:border-fair ${
        compact ? 'shrink-0 px-0.5' : 'px-2'
      }`}
    >
      {opts.map(m => (
        <option key={m} value={m}>{toHM(m)}</option>
      ))}
    </select>
  );
}

function Labeled({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold text-sub">
        {label}
        {hint && <span className="font-normal"> {hint}</span>}
      </span>
      {children}
    </div>
  );
}

/** 예약 불가 시간 블록 — 신규 방 카드와 기존 방 카드가 같은 모양을 쓴다 */
function BlockEditor({
  items, onRemove, onAdd, onApplyAll, idPrefix,
}: {
  items: { key: string; label: string; start_min: number; end_min: number }[];
  onRemove: (key: string) => void;
  onAdd: (b: NewRoomBlock) => void;
  onApplyAll?: () => void;   // 있으면 '모든 방에 적용' 버튼 노출
  idPrefix: string;
}) {
  const toast = useToast();
  const [label, setLabel] = useState('');
  const [start, setStart] = useState(720);
  const [end, setEnd] = useState(780);

  const add = () => {
    if (!(start < end)) {
      toast('시간이 올바르지 않습니다. 시작이 종료보다 빨라야 합니다.');
      return;
    }
    onAdd({ label: label.trim() || '예약 불가', start_min: start, end_min: end });
    setLabel('');
  };

  return (
    <Labeled label="예약 불가 시간" hint="(이 방에 매일 적용)">
      {items.length > 0 && (
        <div className="mb-2 space-y-1.5">
          {items.map(b => (
            <div
              key={b.key}
              className="flex min-h-11 items-center justify-between rounded-lg border border-line bg-white px-3"
            >
              <span className="text-sm font-semibold tabular-nums">
                {b.label} · {toHM(b.start_min)} – {toHM(b.end_min)}
              </span>
              <button
                type="button"
                aria-label={`${b.label} 제거`}
                onClick={() => onRemove(b.key)}
                className="px-2 text-sm font-bold text-sub"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1">
        <input
          aria-label={`${idPrefix} 예약 불가 라벨`}
          value={label}
          onChange={e => setLabel(e.target.value)}
          maxLength={10}
          placeholder="점심시간"
          className="h-11 w-28 shrink-0 rounded-lg border border-line bg-white px-1.5 text-sm outline-none placeholder:text-sub focus:border-fair"
        />
        <TimeSel label={`${idPrefix} 불가 시작`} value={start} onChange={setStart} compact />
        <span className="shrink-0 text-xs text-sub">–</span>
        <TimeSel label={`${idPrefix} 불가 종료`} value={end} onChange={setEnd} compact />
        <Btn tone="ghost" onClick={add} className="ml-auto shrink-0 px-2.5">추가</Btn>
      </div>
      {onApplyAll && (
        <div className="mt-2 flex justify-end">
          <Btn tone="ghost" onClick={onApplyAll}>모든 방에 적용</Btn>
        </div>
      )}
    </Labeled>
  );
}

/** 예약 불가 시간 일괄 적용 미리보기 팝업 */
function BulkBlocksDialog({
  sourceName, sourceBlocks, targets, onApply, onClose,
}: {
  sourceName: string;
  sourceBlocks: { label: string; start_min: number; end_min: number }[];
  targets: { room: Room; blocks: BlockRow[] }[];
  onApply: () => void;
  onClose: () => void;
}) {
  const sig = (bs: { label: string; start_min: number; end_min: number }[]) =>
    bs.map(b => `${b.label}|${b.start_min}|${b.end_min}`).sort().join(',');
  const srcSig = sig(sourceBlocks);
  const changing = targets.filter(t => sig(t.blocks) !== srcSig);
  const srcText = sourceBlocks.length
    ? sourceBlocks.map(b => `${b.label} ${toHM(b.start_min)}–${toHM(b.end_min)}`).join(', ')
    : '없음';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-deep/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-line bg-white p-4"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-sm font-bold text-deep">
          {sourceName}의 예약 불가 시간을 모든 방에 적용할까요?
        </p>
        <p className="mt-1 text-xs text-sub tabular-nums">적용할 내용: {srcText}</p>
        <div className="mt-3 space-y-1.5">
          {changing.length === 0 && (
            <p className="text-sm text-sub">이미 모든 방이 같은 예약 불가 시간입니다.</p>
          )}
          {changing.map(t => (
            <p key={t.room.id} className="text-xs text-sub tabular-nums">
              <b className="text-ink">{t.room.name}</b>{' '}
              {t.blocks.length
                ? t.blocks.map(b => `${b.label} ${toHM(b.start_min)}–${toHM(b.end_min)}`).join(', ')
                : '없음'}{' '}
              → <b className="text-fair">{srcText}</b>
            </p>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-sub">
          각 방에 매일 적용되는 항목만 바뀝니다. &lsquo;모든 방&rsquo; 대상이나 특정 날짜 항목은 그대로 유지됩니다.
        </p>
        <div className="mt-4 flex gap-2">
          <Btn tone="ghost" onClick={onClose} className="flex-1">취소</Btn>
          <Btn onClick={onApply} disabled={changing.length === 0} className="flex-1">적용</Btn>
        </div>
      </div>
    </div>
  );
}

/** 운영시간 일괄 적용 미리보기 팝업 */
function BulkHoursDialog({
  rooms, open_min, close_min, onApply, onClose,
}: {
  rooms: Room[];
  open_min: number;
  close_min: number;
  onApply: () => void;
  onClose: () => void;
}) {
  const changing = rooms.filter(r => r.open_min !== open_min || r.close_min !== close_min);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-deep/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-line bg-white p-4"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-sm font-bold text-deep tabular-nums">
          운영시간 {toHM(open_min)} – {toHM(close_min)} 을 모든 방에 적용할까요?
        </p>
        <div className="mt-3 space-y-1.5">
          {changing.length === 0 && (
            <p className="text-sm text-sub">이미 모든 방이 같은 운영시간입니다.</p>
          )}
          {changing.map(r => (
            <p key={r.id} className="text-xs text-sub tabular-nums">
              <b className="text-ink">{r.name}</b> {toHM(r.open_min)}–{toHM(r.close_min)} →{' '}
              <b className="text-fair">{toHM(open_min)}–{toHM(close_min)}</b>
            </p>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Btn tone="ghost" onClick={onClose} className="flex-1">취소</Btn>
          <Btn onClick={onApply} disabled={changing.length === 0} className="flex-1">적용</Btn>
        </div>
      </div>
    </div>
  );
}

function RoomEditor({
  room, rooms, blocks, allBlocks, onChanged,
}: {
  room: Room;
  rooms: Room[];
  blocks: BlockRow[];      // 이 방 전용(매일) 예약 불가 시간
  allBlocks: BlockRow[];   // 전체 — 일괄 적용 미리보기용
  onChanged: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(room.name);
  const [open, setOpen] = useState(room.open_min);
  const [close, setClose] = useState(room.close_min);
  const [busy, setBusy] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBlocksOpen, setBulkBlocksOpen] = useState(false);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await updateRoom(room.id, name, open, close);
      toast(res.ok ? `${name.trim()}이(가) 변경되었습니다.` : res.error);
      if (res.ok) onChanged();
    } finally {
      setBusy(false);
    }
  };

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
      if (res.ok) onChanged();
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
      if (res.ok) onChanged();
    } finally {
      setBusy(false);
    }
  };

  const addBlock = async (b: NewRoomBlock) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await createBlock({
        room_id: room.id, label: b.label, date: null,
        start_min: b.start_min, end_min: b.end_min,
      });
      toast(res.ok ? '예약 불가 시간이 추가되었습니다.' : res.error);
      if (res.ok) onChanged();
    } finally {
      setBusy(false);
    }
  };

  const removeBlock = async (key: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await deleteBlock(Number(key));
      toast(res.ok ? '삭제되었습니다.' : res.error);
      if (res.ok) onChanged();
    } finally {
      setBusy(false);
    }
  };

  const applyAll = async () => {
    setBulkOpen(false);
    setBusy(true);
    try {
      const res = await applyHoursToAllRooms(open, close);
      toast(res.ok ? `${res.changed}개 방의 운영시간을 변경했습니다.` : res.error);
      if (res.ok) onChanged();
    } finally {
      setBusy(false);
    }
  };

  const applyBlocksAll = async () => {
    setBulkBlocksOpen(false);
    setBusy(true);
    try {
      const res = await applyBlocksToAllRooms(room.id);
      toast(res.ok ? `${res.changed}개 방의 예약 불가 시간을 맞췄습니다.` : res.error);
      if (res.ok) onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={`space-y-4 ${room.active ? '' : 'bg-line/30'}`}>
      <Labeled label="방 이름">
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
      </Labeled>

      <Labeled label="운영 시간">
        <div className="flex items-center gap-2">
          <TimeSel label={`${room.name} 운영 시작`} value={open} onChange={setOpen} />
          <span className="text-sub">–</span>
          <TimeSel label={`${room.name} 운영 종료`} value={close} onChange={setClose} />
          <Btn tone="ghost" onClick={() => setBulkOpen(true)} disabled={busy} className="ml-auto">
            모든 방에 적용
          </Btn>
        </div>
      </Labeled>

      <BlockEditor
        idPrefix={room.name}
        items={blocks.map(b => ({
          key: String(b.id), label: b.label, start_min: b.start_min, end_min: b.end_min,
        }))}
        onRemove={removeBlock}
        onAdd={addBlock}
        onApplyAll={rooms.length > 1 ? () => setBulkBlocksOpen(true) : undefined}
      />

      <div className="flex gap-2">
        <Btn tone="ghost" onClick={toggleActive} disabled={busy} className="flex-1">
          {room.active ? '운영 중지' : '운영 재개'}
        </Btn>
        <Btn onClick={save} disabled={busy} className="flex-1">변경</Btn>
      </div>
      <Btn tone="ghost" onClick={remove} disabled={busy} className="w-full">삭제</Btn>

      {bulkOpen && (
        <BulkHoursDialog
          rooms={rooms}
          open_min={open}
          close_min={close}
          onApply={applyAll}
          onClose={() => setBulkOpen(false)}
        />
      )}
      {bulkBlocksOpen && (
        <BulkBlocksDialog
          sourceName={room.name}
          sourceBlocks={blocks}
          targets={rooms
            .filter(r => r.id !== room.id)
            .map(r => ({
              room: r,
              blocks: allBlocks.filter(b => b.room_id === r.id && b.date === null),
            }))}
          onApply={applyBlocksAll}
          onClose={() => setBulkBlocksOpen(false)}
        />
      )}
    </Card>
  );
}

/**
 * 등록된 방 이름을 보고 다음 방 이름을 제안한다.
 * 'N번방' 패턴으로 일관될 때만 제안하고, 이름이 제각각이면 null.
 */
function nextRoomName(rooms: Room[] | null): string | null {
  if (!rooms) return null;
  if (rooms.length === 0) return '1번방';
  const nums = rooms.map(r => /^(\d+)번방$/.exec(r.name.trim())?.[1]);
  if (nums.some(n => n === undefined)) return null;
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

  // 예약 불가 시간 추가 폼 (모든 방 / 특정 날짜용)
  const [blLabel, setBlLabel] = useState('');
  const [blRoom, setBlRoom] = useState<'all' | number>('all');
  const [blDaily, setBlDaily] = useState(true);
  const [blDate, setBlDate] = useState(todayStr());
  const [blStart, setBlStart] = useState(720);
  const [blEnd, setBlEnd] = useState(780);

  // 이름을 비워두면 제안 이름으로 자동 등록된다
  const suggestedName = nextRoomName(rooms);
  const effectiveName = newName.trim() || suggestedName || '';

  const refresh = () => {
    listRooms().then(setRooms).catch(() => setRooms([]));
    listBlocks().then(setBlocks).catch(() => setBlocks([]));
  };
  useEffect(refresh, []);

  const addRoom = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await createRoom(effectiveName, newOpen, newClose, newBlocks);
      toast(res.ok ? `${effectiveName}이(가) 추가되었습니다.` : res.error);
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

      {/* 1. 신규 방 등록 */}
      <section className="mt-5">
        <h2 className="text-sm font-bold text-deep">신규 방 등록</h2>
        <Card className="mt-2 space-y-4 bg-turf">
          <Labeled
            label="방 이름"
            hint={suggestedName ? '(비워두면 아래 이름으로 등록됩니다)' : undefined}
          >
            <input
              aria-label="새 방 이름"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder={suggestedName ?? '방 이름을 등록하세요'}
              className="h-11 w-full rounded-lg border border-line bg-white px-3 text-base outline-none placeholder:text-sub focus:border-fair"
            />
          </Labeled>

          <Labeled label="운영 시간">
            <div className="flex items-center gap-2">
              <TimeSel label="새 방 운영 시작" value={newOpen} onChange={setNewOpen} />
              <span className="text-sub">–</span>
              <TimeSel label="새 방 운영 종료" value={newClose} onChange={setNewClose} />
            </div>
          </Labeled>

          <BlockEditor
            idPrefix="새 방"
            items={newBlocks.map((b, i) => ({ key: String(i), ...b }))}
            onRemove={key => setNewBlocks(list => list.filter((_, i) => String(i) !== key))}
            onAdd={b => setNewBlocks(list => [...list, b])}
          />

          <Btn onClick={addRoom} disabled={busy || !effectiveName} className="w-full">
            {effectiveName && !newName.trim() ? `${effectiveName} 등록` : '방 등록'}
          </Btn>
        </Card>
      </section>

      {/* 2. 예약 불가 시간 — 모든 방 대상이거나 특정 날짜 */}
      <section className="mt-8">
        <h2 className="text-sm font-bold text-deep">예약 불가 시간</h2>
        <p className="mt-1 text-xs text-sub">
          모든 방에 걸거나 특정 날짜만 막을 때 사용합니다. 방 하나에만 매일 적용할 시간은 아래 방 카드에서 바로 넣을 수 있습니다.
        </p>

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
              key={`${r.id}-${r.name}-${r.open_min}-${r.close_min}-${r.active}`}
              room={r}
              rooms={rooms}
              blocks={(blocks ?? []).filter(b => b.room_id === r.id && b.date === null)}
              allBlocks={blocks ?? []}
              onChanged={refresh}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
