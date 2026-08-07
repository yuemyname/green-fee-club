'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { findCustomersByLast4 } from '@/app/actions/customer';
import { createReservation, listBoard, type Board } from '@/app/actions/reservation';
import { SLOT_STEP, STAMP_GOAL } from '@/lib/constants';
import { buildTimeline, slotsFor } from '@/lib/timeline';
import { fmtDate, fmtDur, needMin, nowMin, toHM, todayStr } from '@/lib/time';
import type { CustomerOverview } from '@/lib/types';
import Btn from '@/components/ui/Btn';
import DatePicker from '@/components/ui/DatePicker';
import Eyebrow from '@/components/ui/Eyebrow';
import CustomerPicker from '@/components/CustomerPicker';
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
  const [candidates, setCandidates] = useState<CustomerOverview[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [useFree, setUseFree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [expandedRoom, setExpandedRoom] = useState<number | null>(null);
  const [showPast, setShowPast] = useState(false);

  const need = needMin(people);
  const isToday = date === todayStr();
  // 오늘은 지난 시간을 감춘다 — 손님이 그냥 온 경우를 위해 토글로 열 수 있다
  const from = isToday && !showPast ? nowMin() : 0;

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
    for (const room of board.rooms.filter(r => r.active)) {
      const timeline = buildTimeline(board.reservations, room.id, date, {
        open: room.open_min,
        close: room.close_min,
        blocks: board.blocks,
      });
      map.set(room.id, {
        slots: slotsFor(timeline, need, from),
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
  }, [board, date, need, from]);

  // 최초·조건 변경 시 예약 가능한 시간이 있는 첫 방만 자동으로 펼친다
  useEffect(() => {
    if (!board) return;
    const first = board.rooms.filter(r => r.active).find(r => (roomData.get(r.id)?.slots.length ?? 0) > 0);
    setExpandedRoom(first?.id ?? null);
  }, [board, roomData]);

  // /status에서 넘어온 날짜·방·시작시각 프리필
  useEffect(() => {
    if (prefilled || !board) return;
    setPrefilled(true);
    const room = Number(params.get('room'));
    const start = Number(params.get('start'));
    if (!room || !params.get('start') || Number.isNaN(start)) return;
    const aligned = Math.ceil(start / SLOT_STEP) * SLOT_STEP;
    if (roomData.get(room)?.slots.includes(aligned)) {
      setSelection({ roomId: room, start: aligned });
      setExpandedRoom(room);
    }
  }, [board, prefilled, params, roomData]);

  // 4자리 입력되면 즉시 조회 — 같은 뒤 4자리가 여러 명이면 선택 팝업
  useEffect(() => {
    if (last4.length !== 4) {
      setCustomer(null);
      setLooked(false);
      setCandidates([]);
      setPickerOpen(false);
      return;
    }
    let alive = true;
    findCustomersByLast4(last4).then(list => {
      if (!alive) return;
      setCandidates(list);
      setCustomer(list.length === 1 ? list[0] : null);
      setPickerOpen(list.length > 1);
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
        customer_id: customer.id,
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

      {/* 4. 오늘은 지난 시간을 감춘다 — 소급 입력이 필요하면 켤 수 있다 */}
      {isToday && (
        <label className="mt-3 flex min-h-11 items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={showPast}
            onChange={e => {
              setShowPast(e.target.checked);
              setSelection(null);
            }}
            className="size-5 accent-(--color-fair)"
          />
          지난 시간도 보기
          <span className="text-xs font-normal text-sub tabular-nums">
            (지금 {toHM(nowMin())})
          </span>
        </label>
      )}

      {/* 5. 방별 시작 가능 시간 */}
      {board && (
        <div className="mt-4 space-y-4">
          {board.rooms.filter(r => r.active).length === 0 && (
            <p className="text-sm text-sub">
              예약할 수 있는 방이 없습니다. 방 관리에서 방을 등록하거나 운영을 재개해 주세요.
            </p>
          )}
          {board.rooms.filter(r => r.active).map(room => (
            <SlotPicker
              key={room.id}
              roomName={room.name}
              slots={roomData.get(room.id)?.slots ?? []}
              busy={roomData.get(room.id)?.busy ?? []}
              need={need}
              open={room.open_min}
              close={room.close_min}
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

      {pickerOpen && (
        <CustomerPicker
          candidates={candidates}
          onPick={c => {
            setCustomer(c);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {/* 5. 확정 시트 — 시간을 선택하면 하단에 고정으로 떠서 스크롤 없이 예약 */}
      {selection && selectedRoom && <div className="h-80" />}
      {/* 시트는 플로팅 메뉴(z-40)보다 위 — 떠 있는 동안 하단은 시트가 차지한다 */}
      {selection && selectedRoom && (
        <div className="fixed inset-x-0 bottom-0 z-[45] rounded-t-xl border-t border-line bg-turf">
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
            {looked && last4.length === 4 && !customer && candidates.length === 0 && (
              <p className="mt-2 text-sm font-semibold text-flag">
                등록되지 않은 번호입니다. 고객 관리에서 먼저 추가해 주세요.
              </p>
            )}
            {looked && !customer && candidates.length > 1 && (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="mt-2 flex min-h-11 w-full items-center justify-center rounded-lg border border-fair bg-white text-sm font-semibold text-fair"
              >
                같은 뒤 4자리 고객 {candidates.length}명 — 고객 선택
              </button>
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
