'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { findByLast4 } from '@/app/actions/customer';
import { createReservation, listBoard, type Board } from '@/app/actions/reservation';
import { STAMP_GOAL } from '@/lib/constants';
import { buildTimeline, slotsFor } from '@/lib/timeline';
import { fmtDate, fmtDur, needMin, toHM, todayStr } from '@/lib/time';
import type { CustomerOverview } from '@/lib/types';
import Btn from '@/components/ui/Btn';
import DatePicker from '@/components/ui/DatePicker';
import Eyebrow from '@/components/ui/Eyebrow';
import SlotPicker from '@/components/SlotPicker';
import { useToast } from '@/components/ui/Toast';

type Selection = { roomId: number; start: number } | null;

function BookInner() {
  const toast = useToast();
  const params = useSearchParams();

  const [people, setPeople] = useState(1);
  const [date, setDate] = useState(() => {
    const d = params.get('date');
    return d && /^\d{8}$/.test(d) ? d : todayStr();
  });
  const [board, setBoard] = useState<Board | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [last4, setLast4] = useState('');
  const [customer, setCustomer] = useState<CustomerOverview | null>(null);
  const [looked, setLooked] = useState(false);
  const [useFree, setUseFree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [expandedRoom, setExpandedRoom] = useState<number | null>(null);

  const need = needMin(people);

  const refresh = (d: string) =>
    listBoard(d).then(setBoard).catch(() => {});

  useEffect(() => {
    setBoard(null);
    refresh(date);
  }, [date]);

  const roomData = useMemo(() => {
    const map = new Map<
      number,
      { slots: number[]; busy: { start: number; end: number; label?: string }[] }
    >();
    if (!board) return map;
    for (const room of board.rooms) {
      const timeline = buildTimeline(board.reservations, room.id, date, {
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
  }, [board, date, need]);

  // 최초·조건 변경 시 예약 가능한 시간이 있는 첫 방만 자동으로 펼친다
  useEffect(() => {
    if (!board) return;
    const first = board.rooms.find(r => (roomData.get(r.id)?.slots.length ?? 0) > 0);
    setExpandedRoom(first?.id ?? null);
  }, [board, roomData]);

  // /status에서 넘어온 날짜·방·시작시각 프리필
  useEffect(() => {
    if (prefilled || !board) return;
    setPrefilled(true);
    const room = Number(params.get('room'));
    const start = Number(params.get('start'));
    if (!room || !params.get('start') || Number.isNaN(start)) return;
    const aligned = Math.ceil(start / 30) * 30;
    if (roomData.get(room)?.slots.includes(aligned)) {
      setSelection({ roomId: room, start: aligned });
      setExpandedRoom(room);
    }
  }, [board, prefilled, params, roomData]);

  // 4자리 입력되면 즉시 조회
  useEffect(() => {
    if (last4.length !== 4) {
      setCustomer(null);
      setLooked(false);
      return;
    }
    let alive = true;
    findByLast4(last4).then(c => {
      if (!alive) return;
      setCustomer(c);
      setLooked(true);
    }).catch(() => {
      if (alive) setLooked(true);
    });
    return () => {
      alive = false;
    };
  }, [last4]);

  const pickPeople = (n: number) => {
    setPeople(n);
    setSelection(null); // 인원 변경 시 기존 슬롯 선택 해제
  };

  const pickDate = (d: string) => {
    setDate(d);
    setSelection(null);
  };

  const submit = async () => {
    if (!selection || !customer || busy) return;
    setBusy(true);
    try {
      const res = await createReservation({
        date,
        room_id: selection.roomId,
        start_min: selection.start,
        people,
        last4,
        use_free: useFree,
      });
      if (!res.ok) {
        toast(res.error);
        refresh(date); // 겹침 실패 시 최신 현황 반영
        return;
      }
      toast(
        useFree
          ? `${res.customerName}님 무료 예약권으로 예약이 확정되었습니다.`
          : `${res.customerName}님 예약이 확정되었습니다. 입금 확인은 예약 현황에서 할 수 있습니다.`,
      );
      setSelection(null);
      setLast4('');
      setUseFree(false);
      refresh(date);
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
        방 예약
      </h1>

      {/* 1. 인원수 */}
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

      {/* 2. 날짜 */}
      <div className="mt-3">
        <DatePicker value={date} onChange={pickDate} />
      </div>

      {/* 3. 안내 배너 */}
      <div className="mt-3 rounded-xl bg-turf px-4 py-3 text-sm">
        <span className="tabular-nums">{people}</span>명이면{' '}
        <b className="font-black text-fair tabular-nums">{fmtDur(need)}</b>이 필요합니다.{' '}
        <span className="text-sub">(1인 63분 기준)</span>
      </div>

      {/* 4. 방별 시작 가능 시간 */}
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
              expanded={expandedRoom === room.id}
              onToggle={() =>
                setExpandedRoom(expandedRoom === room.id ? null : room.id)
              }
            />
          ))}
        </div>
      )}

      {/* 5. 확정 시트 — 시간을 선택하면 하단에 고정으로 떠서 스크롤 없이 예약 */}
      {selection && selectedRoom && <div className="h-80" />}
      {selection && selectedRoom && (
        <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-xl border-t border-line bg-turf">
          <div className="mx-auto max-h-[70dvh] max-w-xl space-y-4 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] pt-4">
          <p className="text-base font-black text-deep tabular-nums">
            {fmtDate(date)} · {selectedRoom.name} · {toHM(selection.start)}–{toHM(selection.start + need)}
          </p>

          <div>
            <span className="mb-1.5 block text-sm font-semibold text-ink">고객 전화번호 뒤 4자리</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={last4}
              onChange={e => {
                setLast4(e.target.value.replace(/\D/g, ''));
                setUseFree(false);
              }}
              placeholder="뒤 4자리"
              className="h-12 w-full rounded-lg border border-line bg-white px-4 text-center text-xl font-bold tracking-widest tabular-nums outline-none placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-sub focus:border-fair"
            />
            {looked && last4.length === 4 && !customer && (
              <p className="mt-2 text-sm font-semibold text-flag">
                등록되지 않은 번호입니다. 고객 등록에서 먼저 추가해 주세요.
              </p>
            )}
            {customer && (
              <p className="mt-2 text-sm font-semibold tabular-nums">
                {customer.name} · 도장 {customer.progress}/{STAMP_GOAL} · 무료 예약권{' '}
                <span className={customer.coupons > 0 ? 'text-flag' : ''}>{customer.coupons}회</span>
              </p>
            )}
          </div>

          {customer && customer.coupons > 0 && (
            <button
              type="button"
              onClick={() => setUseFree(v => !v)}
              className={`flex min-h-11 w-full items-center justify-between rounded-lg border px-3 text-sm font-semibold transition-opacity active:opacity-80 ${
                useFree ? 'border-flag bg-flag text-white' : 'border-flag/40 bg-flag/10 text-flag'
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
            <Btn onClick={submit} disabled={!customer || busy} className="flex-1">
              예약하기
            </Btn>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense>
      <BookInner />
    </Suspense>
  );
}
