create table if not exists customers (
  id          bigserial primary key,
  name        text not null,
  phone       text not null,            -- 010-5397-1406
  last4       text not null unique,     -- 로그인/조회 키
  used_coupons int not null default 0,  -- 사용한 무료 예약권 수
  created_at  timestamptz default now()
);

create table if not exists stamps (
  id          bigserial primary key,
  customer_id bigint not null references customers(id) on delete cascade,
  date        text not null,            -- yyyymmdd
  created_at  timestamptz default now()
);

create table if not exists reservations (
  id          bigserial primary key,
  date        text not null,            -- yyyymmdd
  room_id     int not null,
  start_min   int not null,             -- 510 = 08:30
  end_min     int not null,
  customer_id bigint not null references customers(id),
  people      int not null,
  is_free     boolean not null default false,
  created_at  timestamptz default now()
);

create index if not exists reservations_date_room_start_idx
  on reservations (date, room_id, start_min);
