'use client';

import { useState } from 'react';
import { ROOMS } from '@/lib/constants';
import { buildTimeline } from '@/lib/timeline';
import { todayStr } from '@/lib/time';
import { useDB } from '@/lib/db';
import DatePicker from '@/components/ui/DatePicker';
import Eyebrow from '@/components/ui/Eyebrow';
import RoomTimeline from '@/components/RoomTimeline';

export default function StatusPage() {
  const db = useDB();
  const [date, setDate] = useState(todayStr());

  return (
    <div>
      <Eyebrow>STATUS</Eyebrow>
      <h1 className="mt-1 text-2xl font-black text-deep" style={{ letterSpacing: '-0.02em' }}>
        예약 현황
      </h1>

      <div className="mt-5">
        <DatePicker value={date} onChange={setDate} />
      </div>

      {db && (
        <div className="mt-4 space-y-4">
          {ROOMS.map(room => (
            <RoomTimeline
              key={room.id}
              db={db}
              segments={buildTimeline(db.reservations, room.id, date)}
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
