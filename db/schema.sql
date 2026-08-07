-- 모든 도메인 테이블은 공통으로 created_at / updated_at / deleted_at 을 가진다.
-- deleted_at 이 null 이면 살아있는 행, 값이 있으면 삭제된 행(소프트 삭제)이다.

create table if not exists stores (
  id          bigserial primary key,
  code        text not null unique,      -- 매장 번호
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create table if not exists admins (
  id            bigserial primary key,
  store_id      bigint references stores(id),
  username      text not null unique,
  password_hash text not null,           -- scrypt salt:hash
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create table if not exists customers (
  id          bigserial primary key,
  name        text not null,
  phone       text not null,            -- 010-5397-1406 (전체 번호가 고유 식별자)
  last4       text not null,            -- 조회 키 (중복 허용)
  used_coupons int not null default 0,  -- 사용한 무료 예약권 수
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index if not exists customers_last4_idx on customers (last4);

create table if not exists stamps (
  id             bigserial primary key,
  customer_id    bigint not null references customers(id) on delete cascade,
  date           text not null,          -- yyyymmdd
  reservation_id bigint,                 -- 입금 확인으로 찍힌 도장이면 그 예약 (예약 삭제 시 회수)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create table if not exists rooms (
  id          bigserial primary key,
  name        text not null,
  open_min    int not null default 480,   -- 방별 운영 시작 (08:00)
  close_min   int not null default 1440,  -- 방별 운영 종료 (24:00)
  active      boolean not null default true, -- false면 일시 운영 중지 (예약 화면에서 숨김)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create table if not exists reservations (
  id          bigserial primary key,
  date        text not null,             -- yyyymmdd
  room_id     bigint not null references rooms(id),
  start_min   int not null,              -- 510 = 08:30
  end_min     int not null,
  customer_id bigint not null references customers(id),
  people      int not null,
  is_free     boolean not null default false,
  payment     text not null default 'pending',  -- pending | manual | point
  paid_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index if not exists reservations_date_room_start_idx
  on reservations (date, room_id, start_min);

create table if not exists blocks (
  id          bigserial primary key,
  room_id     bigint references rooms(id) on delete cascade,  -- null이면 모든 방
  label       text not null default '예약 불가',
  date        text,                                           -- null이면 매일 반복
  start_min   int not null,
  end_min     int not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- updated_at 자동 갱신
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
