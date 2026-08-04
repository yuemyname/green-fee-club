// 스키마 적용 + (비어있을 때만) 시드. Railway 배포 시 start 전에 실행된다.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomBytes, scryptSync } from 'node:crypto';
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

  // 기존 DB의 last4 unique 제약 제거 — 뒤 4자리가 같은 고객 등록 허용
  await client.query('alter table customers drop constraint if exists customers_last4_key');

  // 매장이 없으면 1건 생성
  let storeId;
  const store = await client.query('select id from stores order by id limit 1');
  if (store.rows.length) {
    storeId = store.rows[0].id;
  } else {
    const created = await client.query(
      'insert into stores (code, name) values ($1,$2) returning id',
      [process.env.STORE_CODE ?? '1001', process.env.STORE_NAME ?? '트윈빌스크린'],
    );
    storeId = created.rows[0].id;
    console.log('매장 생성: 1001 트윈빌스크린');
  }

  // 기존 DB의 admins에 store_id 컬럼이 없으면 추가하고 매장에 소속시킨다
  const hasStoreCol = await client.query(
    `select 1 from information_schema.columns
     where table_name = 'admins' and column_name = 'store_id'`,
  );
  if (!hasStoreCol.rows.length) {
    await client.query('alter table admins add column store_id bigint references stores(id)');
  }
  await client.query('update admins set store_id = $1 where store_id is null', [storeId]);

  // 관리자가 3명이 될 때까지 admin1~3을 채운다 (초기 비밀번호는 ADMIN_PASSWORD, 기본 1406)
  const hashOf = pw => {
    const salt = randomBytes(16).toString('hex');
    return `${salt}:${scryptSync(pw, salt, 32).toString('hex')}`;
  };
  const password = process.env.ADMIN_PASSWORD ?? process.env.OWNER_CODE ?? '1406';
  for (const username of ['admin1', 'admin2', 'admin3']) {
    const n = await client.query('select count(*)::int as n from admins');
    if (n.rows[0].n >= 3) break;
    const exists = await client.query('select 1 from admins where username = $1', [username]);
    if (exists.rows.length) continue;
    await client.query(
      'insert into admins (store_id, username, password_hash) values ($1,$2,$3)',
      [storeId, username, hashOf(password)],
    );
    console.log(`관리자 생성: ${username}`);
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

    const c1 = await seed('정승우', '01053971406', 17);    // 쿠폰 1장 + 진행 7칸
    const c2 = await seed('김민지', '01041127788', 7);
    const c3 = await seed('박도윤', '01098305522', 20, 1); // 쿠폰 2장 중 1장 사용(아래 무료 예약)
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
