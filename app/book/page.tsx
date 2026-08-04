'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ROOMS, STAMP_GOAL } from '@/lib/constants';
import { buildTimeline, slotsFor } from '@/lib/timeline';
import { fmtDate, fmtDur, needMin, toHM, todayStr } from '@/lib/time';
import { cardProgress, coupons, createReservation, findByLast4, useDB } from '@/lib/db';
import Btn from '@/components/ui/Btn';
import Card from '@/components/ui/Card';
import DatePicker from '@/components/ui/DatePicker';
import Eyebrow from '@/components/ui/Eyebrow';
import SlotPicker from '@/components/SlotPicker';
import { useToast } from '@/components/ui/Toast';

type Selection = { roomId: number; start: number } | null;

function BookInner() {
  const db = useDB();
  const toast = useToast();
  const params = useSearchParams();

  const [people, setPeople] = useState(1);
  const [date, setDate] = useState(() => {
    const d = params.get('date');
    return d && /^\d{8}$/.test(d) ? d : todayStr();
  });
  const [selection, setSelection] = useState<Selection>(null);
  const [last4, setLast4] = useState('');
  const [useFree, setUseFree] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  const need = needMin(people);

  const roomSlots = useMemo(() => {
    if (!db) return new Map<number, number[]>();
    return new Map(
      ROOMS.map(room => [
        room.id,
        slotsFor(buildTimeline(db.reservations, room.id, date), need),
      ]),
    );
  }, [db, date, need]);

  // /status에서 넘어온 날짜·방·시작시각 프리필
  useEffect(() => {
    if (prefilled || !db) return;
    setPrefilled(true);
    const room = Number(params.get('room'));
    const start = Number(params.get('start'));
    if (!room || Number.isNaN(start) || !params.get('start')) return;
    const aligned = Math.ceil(start / 30) * 30;
    if (roomSlots.get(room)?.includes(aligned)) {
      setSelection({ roomId: room, start: aligned });
    }
  }, [db, prefilled, params, roomSlots]);

  const pickPeople = (n: number) => {
    setPeople(n);
    setSelection(null); // 인원 변경 시 기존 슬롯 선택 해제
  };

  const pickDate = (d: string) => {
    setDate(d);
    setSelection(null);
  };

  const customer = db && last4.length === 4 ? findByLast4(db, last4) : undefined;
  const customerCoupons = db && customer ? coupons(db, customer) : 0;

  const submit = () => {
    if (!selection) return;
    const res = createReservation({
      date,
      room_id: selection.roomId,
      start_min: selection.start,
      people,
      last4,
      use_free: useFree,
    });
    if (!res.ok) {
      toast(res.error);
      return;
    }
    toast(
      res.value.cardCompleted
        ? `카드 완성! ${res.value.customer.name}님 무료 예약권 1장이 나왔습니다.`
        : `${res.value.customer.name}님 예약이 확정되었습니다.`,
    );
    setSelection(null);
    setLast4('');
    setUseFree(false);
  };

  const selectedRoom = selection ? ROOMS.find(r => r.id === selection.roomId) : null;

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
      {db && (
        <div className="mt-4 space-y-4">
          {ROOMS.map(room => (
            <SlotPicker
              key={room.id}
              roomName={room.name}
              slots={roomSlots.get(room.id) ?? []}
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

      {/* 5. 확정 카드 */}
      {db && selection && selectedRoom && (
        <Card className="mt-4 space-y-4 bg-turf">
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
            {last4.length === 4 && !customer && (
              <p className="mt-2 text-sm font-semibold text-flag">
                등록되지 않은 번호입니다. 고객 등록에서 먼저 추가해 주세요.
              </p>
            )}
            {db && customer && (
              <p className="mt-2 text-sm font-semibold tabular-nums">
                {customer.name} · 도장 {cardProgress(db, customer.id)}/{STAMP_GOAL} · 무료 예약권{' '}
                <span className={customerCoupons > 0 ? 'text-flag' : ''}>{customerCoupons}회</span>
              </p>
            )}
          </div>

          {customer && customerCoupons > 0 && (
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
            <Btn onClick={submit} disabled={!customer} className="flex-1">
              예약하기
            </Btn>
          </div>
        </Card>
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
