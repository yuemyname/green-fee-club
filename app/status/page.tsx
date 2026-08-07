'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listBoard, monthReservedDates, type Board } from '@/app/actions/reservation';
import { buildTimeline } from '@/lib/timeline';
import { fmtDate, todayStr } from '@/lib/time';
import Btn from '@/components/ui/Btn';
import Eyebrow from '@/components/ui/Eyebrow';
import MonthCalendar from '@/components/MonthCalendar';
import RoomTimeline from '@/components/RoomTimeline';

export default function StatusPage() {
  const [date, setDate] = useState(todayStr());
  const [month, setMonth] = useState(todayStr().slice(0, 6));
  const [marks, setMarks] = useState<Set<string>>(new Set());
  const [board, setBoard] = useState<Board | null>(null);

  const refresh = () => listBoard(date).then(setBoard).catch(() => {});

  useEffect(() => {
    let alive = true;
    monthReservedDates(month).then(d => {
      if (alive) setMarks(new Set(d));
    }).catch(() => {});
    return () => {
      alive = false;
    };
  }, [month]);

  useEffect(() => {
    let alive = true;
    listBoard(date).then(b => {
      if (alive) setBoard(b);
    }).catch(() => {});
    return () => {
      alive = false;
    };
  }, [date]);

  return (
    <div>
      <Eyebrow>RESERVATION</Eyebrow>
      <div className="mt-1 flex items-center justify-between">
        <h1 className="text-2xl font-black text-deep" style={{ letterSpacing: '-0.02em' }}>
          예약
        </h1>
        <Link href={`/book?date=${date}`}>
          <Btn>+ 새 예약</Btn>
        </Link>
      </div>
      <p className="mt-1 text-xs text-sub">빈 시간을 누르면 그 자리로 바로 예약할 수 있습니다.</p>

      <div className="mt-5">
        <MonthCalendar
          month={month}
          value={date}
          marked={marks}
          onSelect={setDate}
          onMonthChange={setMonth}
        />
      </div>

      <h2 className="mt-6 text-sm font-bold text-deep tabular-nums">{fmtDate(date)} 예약 상세</h2>
      {board && (
        <div className="mt-2 space-y-4">
          {board.rooms.map(room => (
            <RoomTimeline
              key={room.id}
              segments={buildTimeline(board.reservations, room.id, date, {
                open: room.open_min,
                close: room.close_min,
                blocks: board.blocks,
              })}
              roomId={room.id}
              roomName={room.name}
              date={date}
              active={room.active}
              onChanged={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}
