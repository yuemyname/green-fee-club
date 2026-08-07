// 스키마 적용 + 매장/관리자/방 기본 데이터. Railway 배포 시 start 전에 실행된다.
// 고객/도장/예약 샘플 데이터는 넣지 않는다 (로컬 개발용은 scripts/seed-dev.mjs).
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

  // 공통 컬럼(생성/수정일시·삭제여부) 보강 + updated_at 자동 갱신 트리거
  const TABLES = ['stores', 'admins', 'customers', 'stamps', 'rooms', 'reservations', 'blocks'];
  for (const t of TABLES) {
    await client.query(
      `alter table ${t}
         add column if not exists created_at timestamptz not null default now(),
         add column if not exists updated_at timestamptz not null default now(),
         add column if not exists deleted_at timestamptz`,
    );
    await client.query(`drop trigger if exists ${t}_set_updated_at on ${t}`);
    await client.query(
      `create trigger ${t}_set_updated_at before update on ${t}
       for each row execute function set_updated_at()`,
    );
  }

  // 방 운영 상태 (false면 일시 중지)
  await client.query('alter table rooms add column if not exists active boolean not null default true');

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

  // 기존 DB에 남아있는 샘플 고객/도장/예약을 1회만 삭제한다.
  // (관리자·매장·방·예약 불가 시간 설정은 유지)
  await client.query(
    `create table if not exists app_flags (
       key text primary key,
       created_at timestamptz default now()
     )`,
  );
  const cleaned = await client.query(
    `select 1 from app_flags where key = 'sample_data_cleaned'`,
  );
  if (!cleaned.rows.length) {
    const r = await client.query('delete from reservations');
    const s = await client.query('delete from stamps');
    const c = await client.query('delete from customers');
    await client.query(`insert into app_flags (key) values ('sample_data_cleaned')`);
    console.log(`샘플 데이터 삭제: 예약 ${r.rowCount}건, 도장 ${s.rowCount}개, 고객 ${c.rowCount}명`);
  }

  // 2차 정리: 고객 데이터와 방 데이터(예약 불가 시간 포함)까지 1회만 삭제.
  // 관리자·매장 정보만 남긴다. 방은 방 관리 화면에서 직접 등록한다.
  const cleaned2 = await client.query(
    `select 1 from app_flags where key = 'sample_data_cleaned_v2'`,
  );
  if (!cleaned2.rows.length) {
    const r = await client.query('delete from reservations');
    const s = await client.query('delete from stamps');
    const c = await client.query('delete from customers');
    const b = await client.query('delete from blocks');
    const rm = await client.query('delete from rooms');
    await client.query(`insert into app_flags (key) values ('sample_data_cleaned_v2')`);
    console.log(
      `2차 정리: 예약 ${r.rowCount}건, 도장 ${s.rowCount}개, 고객 ${c.rowCount}명, ` +
      `예약 불가 ${b.rowCount}건, 방 ${rm.rowCount}개 삭제`,
    );
  }
} finally {
  await client.end();
}
