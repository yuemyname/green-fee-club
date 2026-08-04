// 스키마 적용 + (비어있을 때만) 시드. Railway 배포 시 start 전에 실행된다.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL이 설정되지 않았습니다.');
  process.exit(1);
}

const dir = path.dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(path.join(dir, '../db/schema.sql'), 'utf8');

const ymd = d =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
const daysAgo = n => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymd(d);
};

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query(schema);
  console.log('스키마 적용 완료');

  // 기존 DB에 payment 컬럼이 없으면 추가하고, 이전 예약은 확인 완료로 백필
  const hasPayment = await client.query(
    `select 1 from information_schema.columns
     where table_name = 'reservations' and column_name = 'payment'`,
  );
  if (!hasPayment.rows.length) {
    await client.query(`alter table reservations add column payment text not null default 'pending'`);
    await client.query('alter table reservations add column paid_at timestamptz');
    await client.query(
      `update reservations
       set payment = case when is_free then 'point' else 'manual' end,
           paid_at = created_at`,
    );
    console.log('payment 컬럼 추가 + 기존 예약 백필 완료');
  }

  // 방이 없으면 기본 2개를 등록 (기존 예약의 room_id 1·2와 맞춤)
  const roomCount = await client.query('select count(*)::int as n from rooms');
  if (!roomCount.rows[0].n) {
    await client.query(`insert into rooms (id, name) values (1, '1번방'), (2, '2번방')`);
    await client.query(`select setval('rooms_id_seq', 2)`);
    console.log('방 시드 완료 (1번방, 2번방)');
  }

  const { rows } = await client.query('select count(*)::int as n from customers');
  if (rows[0].n > 0) {
    console.log(`고객 ${rows[0].n}명 존재 — 시드 생략`);
  } else {
    const seed = async (name, phone, stampCount, used = 0) => {
      const digits = phone.replace(/\D/g, '');
      const fmt = `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
      const res = await client.query(
        'insert into customers (name, phone, last4, used_coupons) values ($1,$2,$3,$4) returning id',
        [name, fmt, digits.slice(-4), used],
      );
      const id = res.rows[0].id;
      for (let i = stampCount; i >= 1; i--) {
        await client.query('insert into stamps (customer_id, date) values ($1,$2)', [id, daysAgo(i)]);
      }
      return id;
    };

    const c1 = await seed('정승우', '01053971406', 17); // 쿠폰 1장 + 진행 7칸
    const c2 = await seed('김민지', '01041127788', 7);
    const c3 = await seed('박도윤', '01098305522', 10); // 쿠폰 1장
    await seed('이서연', '01026743314', 3);

    const today = daysAgo(0);
    const resv = (date, room, start, end, cid, people, payment) =>
      client.query(
        `insert into reservations (date, room_id, start_min, end_min, customer_id, people, is_free, payment, paid_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8, case when $8 = 'pending' then null else now() end)`,
        [date, room, start, end, cid, people, payment === 'point', payment],
      );
    await resv(today, 1, 600, 730, c2, 2, 'pending'); // 입금 대기 데모
    await resv(today, 2, 840, 1100, c1, 4, 'manual');
    await resv(daysAgo(1), 1, 1140, 1210, c3, 1, 'point');
    console.log('시드 데이터 입력 완료');
  }
} finally {
  await client.end();
}
