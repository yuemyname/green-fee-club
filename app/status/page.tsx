'use client';

import { useEffect, useState } from 'react';
import { listByDate } from '@/app/actions/reservation';
import { ROOMS } from '@/lib/constants';
import { buildTimeline } from '@/lib/timeline';
import { todayStr } from '@/lib/time';
import type { ReservationRow } from '@/lib/types';
import DatePicker from '@/components/ui/DatePicker';
import Eyebrow from '@/components/ui/Eyebrow';
import RoomTimeline from '@/components/RoomTimeline';

export default function StatusPage() {
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState<ReservationRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    listByDate(date).then(r => {
      if (alive) setRows(r);
    }).catch(() => {
      if (alive) setRows([]);
    });
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

      {rows && (
        <div className="mt-4 space-y-4">
          {ROOMS.map(room => (
            <RoomTimeline
              key={room.id}
              segments={buildTimeline(rows, room.id, date)}
              roomId={room.id}
              roomName={room.name}
              date={date}
            />
          ))}
        </div>
      )}
    </div>
  );
}
