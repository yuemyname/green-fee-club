'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getMyPage, myBoard, myCreateReservation, myUpdateReservation,
  type MyBoard,
} from '@/app/actions/my';
import { buildTimeline, slotsFor } from '@/lib/timeline';
import { fmtDate, fmtDur, needMin, toHM, todayStr } from '@/lib/time';
import type { Reservation } from '@/lib/types';
import Btn from '@/components/ui/Btn';
import Card from '@/components/ui/Card';
import DatePicker from '@/components/ui/DatePicker';
import Eyebrow from '@/components/ui/Eyebrow';
import SlotPicker from '@/components/SlotPicker';
import { useToast } from '@/components/ui/Toast';

type Selection = { roomId: number; start: number } | null;

function MyBookInner() {
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get('edit') ? Number(params.get('edit')) : null;

  const [people, setPeople] = useState(1);
  const [date, setDate] = useState(todayStr());
  const [board, setBoard] = useState<MyBoard | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [useFree, setUseFree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  const need = needMin(people);

  const refresh = (d: string) =>
    myBoard(d).then(b => {
      if (b === null) router.replace('/my/start');
      else setBoard(b);
    }).catch(() => {});

  useEffect(() => {
    setBoard(null);
    refresh(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // 변경 모드: 기존 예약의 날짜·인원 프리필
  useEffect(() => {
    if (!editId || prefilled) return;
    setPrefilled(true);
    getMyPage().then(d => {
      const r = d?.reservations.find(x => x.id === editId);
      if (!r) {
        toast('예약을 찾을 수 없습니다.');
        router.replace('/my');
        return;
      }
      setPeople(r.people);
      setDate(r.date);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, prefilled]);

  const roomData = useMemo(() => {
    const map = new Map<
      number,
      { slots: number[]; busy: { start: number; end: number; label?: string }[] }
    >();
    if (!board) return map;
    // 변경 모드에서는 내 기존 예약을 겹침에서 제외해 그 자리도 고를 수 있게 한다
    const items: Reservation[] = board.busy
      .filter(b => !(editId && b.mine && b.id === editId))
      .map(b => ({
        id: b.id, date: b.date, room_id: b.room_id,
        start_min: b.start_min, end_min: b.end_min,
        customer_id: 0, people: 0, is_free: false,
      }));
    for (const room of board.rooms) {
      const timeline = buildTimeline(items, room.id, date, {
        open: room.open_min,
        close: room.close_min,
        blocks: board.blocks,
      });
      map.set(room.id, {
        slots: slotsFor(timeline, need),
        busy: timeline
          .filter(s => s.type !== 'open')
          .map(s => ({
            start: s.start,
            end: s.end,
            label: s.type === 'blocked' ? s.label : undefined,
          })),
      });
    }
    return map;
  }, [board, date, need, editId]);

  const pickPeople = (n: number) => {
    setPeople(n);
    setSelection(null);
  };

  const pickDate = (d: string) => {
    setDate(d);
    setSelection(null);
  };

  const submit = async () => {
    if (!selection || busy) return;
    setBusy(true);
    try {
      const res = editId
        ? await myUpdateReservation(editId, {
            date, room_id: selection.roomId, start_min: selection.start, people,
          })
        : await myCreateReservation({
            date, room_id: selection.roomId, start_min: selection.start, people,
            use_free: useFree,
          });
      if (!res.ok) {
        toast(res.error);
        refresh(date);
        return;
      }
      toast(
        editId
          ? '예약이 변경되었습니다.'
          : useFree
            ? '무료 예약권으로 예약이 확정되었습니다.'
            : '예약이 접수되었습니다. 매장 입금 확인 후 확정됩니다.',
      );
      router.replace('/my');
    } finally {
      setBusy(false);
    }
  };

  const selectedRoom = selection && board
    ? board.rooms.find(r => r.id === selection.roomId)
    : null;

  return (
    <div>
      <Eyebrow>BOOKING</Eyebrow>
      <h1 className="mt-1 text-2xl font-black text-deep" style={{ letterSpacing: '-0.02em' }}>
        {editId ? '예약 변경' : '방 예약'}
      </h1>

      <div className="mt-5 grid grid-cols-6 gap-1.5">
        {[1, 2, 3, 4, 5, 6].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => pickPeople(n)}
            className={`min-h-11 rounded-lg border text-sm font-bold tabular-nums transition-opacity active:opacity-80 ${
              people === n ? 'border-fair bg-fair text-white' : 'border-line bg-white text-ink'
            }`}
          >
            {n}명
          </button>
        ))}
      </div>

      <div className="mt-3">
        <DatePicker value={date} onChange={pickDate} />
      </div>

      <div className="mt-3 rounded-xl bg-turf px-4 py-3 text-sm">
        <span className="tabular-nums">{people}</span>명이면{' '}
        <b className="font-black text-fair tabular-nums">{fmtDur(need)}</b>이 필요합니다.{' '}
        <span className="text-sub">(1인 63분 기준)</span>
      </div>

      {board && (
        <div className="mt-4 space-y-4">
          {board.rooms.map(room => (
            <SlotPicker
              key={room.id}
              roomName={room.name}
              slots={roomData.get(room.id)?.slots ?? []}
              busy={roomData.get(room.id)?.busy ?? []}
              need={need}
              selected={selection?.roomId === room.id ? selection.start : null}
              onSelect={start => {
                setSelection({ roomId: room.id, start });
                setUseFree(false);
              }}
            />
          ))}
        </div>
      )}

      {board && selection && selectedRoom && (
        <Card className="mt-4 space-y-4 bg-turf">
          <p className="text-base font-black text-deep tabular-nums">
            {fmtDate(date)} · {selectedRoom.name} · {toHM(selection.start)}–{toHM(selection.start + need)}
          </p>

          {!editId && board.coupons > 0 && (
            <button
              type="button"
              onClick={() => setUseFree(v => !v)}
              className={`flex min-h-11 w-full items-center justify-between rounded-lg border px-3 text-sm font-semibold transition-opacity active:opacity-80 ${
                useFree ? 'border-flag bg-flag text-white' : 'border-line bg-white text-ink'
              }`}
            >
              <span>무료 예약권 사용 (이번 이용은 도장 없음)</span>
              <span className="text-xs font-bold">{useFree ? 'ON' : 'OFF'}</span>
            </button>
          )}

          <div className="flex gap-2">
            <Btn tone="ghost" onClick={() => setSelection(null)} className="flex-1">
              취소
            </Btn>
            <Btn onClick={submit} disabled={busy} className="flex-1">
              {editId ? '변경하기' : '예약하기'}
            </Btn>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function MyBookPage() {
  return (
    <Suspense>
      <MyBookInner />
    </Suspense>
  );
}
