'use client';

import { useEffect, useState } from 'react';
import { listBoard, type Board } from '@/app/actions/reservation';
import { buildTimeline } from '@/lib/timeline';
import { todayStr } from '@/lib/time';
import DatePicker from '@/components/ui/DatePicker';
import Eyebrow from '@/components/ui/Eyebrow';
import RoomTimeline from '@/components/RoomTimeline';

export default function StatusPage() {
  const [date, setDate] = useState(todayStr());
  const [board, setBoard] = useState<Board | null>(null);

  const refresh = () => listBoard(date).then(setBoard).catch(() => {});

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
      <Eyebrow>STATUS</Eyebrow>
      <h1 className="mt-1 text-2xl font-black text-deep" style={{ letterSpacing: '-0.02em' }}>
        예약 현황
      </h1>

      <div className="mt-5">
        <DatePicker value={date} onChange={setDate} />
      </div>

      {board && (
        <div className="mt-4 space-y-4">
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
              onChanged={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}
