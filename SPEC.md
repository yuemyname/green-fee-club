# 그린라운드 — 스크린골프 예약 + 포인트 적립 웹앱

사장님 1인이 카운터에서 쓰는 단일 매장용 예약/적립 도구.
전화번호 뒤 4자리만으로 모든 조회가 끝나는 것이 핵심 UX.

---

## 1. 기술 스택

| 항목 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | Next.js 15 (App Router) + TypeScript | |
| 스타일 | Tailwind CSS v4 | 커스텀 컬러는 `@theme` 토큰으로 |
| DB / Auth | Supabase (Postgres) | Auth는 쓰지 않음. 아래 3-4 참고 |
| 상태 | React `useState` + Server Actions | 전역 상태 라이브러리 불필요 |
| 배포 | Vercel | |

> 1단계는 Supabase 없이 in-memory + `localStorage`로 동작시키고,
> 화면이 다 나온 뒤 2단계에서 DB를 붙인다. (WBS 참고)

---

## 2. 디자인 시스템

흰 배경 + 페어웨이 그린. 그림자 대신 1px 실선 테두리, 라운드는 `rounded-lg`/`rounded-xl`만.

### 컬러 토큰

```css
@theme {
  --color-paper: #FFFFFF;  /* 배경 */
  --color-turf:  #EFF6F1;  /* 카드/강조 배경 (연한 잔디) */
  --color-line:  #D9E7DE;  /* 모든 테두리 */
  --color-fair:  #17663B;  /* 메인 그린 — 버튼, 강조 텍스트 */
  --color-deep:  #0C3D22;  /* 제목, 토스트 배경 */
  --color-mint:  #3F9B6A;  /* eyebrow 라벨 */
  --color-ink:   #15231B;  /* 본문 */
  --color-sub:   #65796D;  /* 보조 텍스트 */
  --color-flag:  #C0392B;  /* 무료 예약권 전용 (핀 깃발 레드) — 이 용도 외 금지 */
}
```

### 타이포

- 폰트: `Pretendard`, fallback `Apple SD Gothic Neo`, `system-ui`
- 페이지 제목: `text-2xl font-black`, `letter-spacing: -0.02em`
- 로그인 히어로: `text-4xl font-black`, `-0.03em`
- Eyebrow: `text-xs font-semibold tracking-widest uppercase`, color `mint`
- **모든 숫자(시간·전화번호·도장 수)는 `tabular-nums` 필수**

### 시그니처 요소 — 스탬프 카드

포인트를 숫자가 아니라 **원형 도장 10칸 그리드**(`grid-cols-5`, 2줄)로 보여준다.
찍힌 칸은 `fair` 배경 + 흰 글씨로 `MM/DD` 표시, 빈 칸은 흰 배경 + `line` 테두리에 순번 숫자.
10칸이 다 차면 카드 전체 배경이 `turf`로 바뀌고 "무료 1회 적립 완료" 표시.

### 공용 컴포넌트

- `Btn` — tone: `solid`(fair) / `ghost`(흰 배경 + line 테두리) / `flag`
- `Field` — 라벨 + 인풋, `border: 1px solid line`
- `Card` — `rounded-xl border border-line bg-white p-4`
- `Eyebrow`, `Toast`(하단 고정, `deep` 배경, 2.6초 후 자동 소멸), `DatePicker`(‹ 날짜 ›)

---

## 3. 데이터 모델

### 3-1. 상수

```ts
export const OPEN = 8 * 60;          // 08:00 영업 시작 (분 단위)
export const CLOSE = 24 * 60;        // 24:00 영업 종료
export const MIN_PER_PERSON = 63;    // 1인당 필요 시간
export const STAMP_GOAL = 10;        // 도장 10개 = 무료 1회
export const ROOMS = [{ id: 1, name: '1번방' }, { id: 2, name: '2번방' }];
```

시간은 전부 **자정 기준 분(minute) 정수**로 다룬다. 표시할 때만 `HH:MM`으로 변환.
날짜는 **`yyyymmdd` 문자열**로 다룬다. (예: `20260804`)

### 3-2. 테이블

```sql
create table customers (
  id          bigserial primary key,
  name        text not null,
  phone       text not null,            -- 010-5397-1406
  last4       text not null unique,      -- 로그인/조회 키
  used_coupons int not null default 0,   -- 사용한 무료 예약권 수
  created_at  timestamptz default now()
);

create table stamps (
  id          bigserial primary key,
  customer_id bigint not null references customers(id) on delete cascade,
  date        text not null,             -- yyyymmdd
  created_at  timestamptz default now()
);

create table reservations (
  id          bigserial primary key,
  date        text not null,             -- yyyymmdd
  room_id     int not null,
  start_min   int not null,              -- 510 = 08:30
  end_min     int not null,
  customer_id bigint not null references customers(id),
  people      int not null,
  is_free     boolean not null default false,
  created_at  timestamptz default now()
);

create index on reservations (date, room_id, start_min);
```

### 3-3. 파생 값

```ts
totalStamps(c)  = stamps.length
cardProgress(c) = totalStamps % 10          // 현재 카드에 찍힌 개수
coupons(c)      = floor(totalStamps / 10) - used_coupons   // 사용 가능한 무료 예약권
needMin(people) = ceil(people * 63 / 10) * 10              // 10분 단위 올림
```

`needMin` 예시: 1명 70분 / 2명 130분 / 3명 190분 / 4명 260분(4.3시간)

### 3-4. 인증

Supabase Auth를 쓰지 않는다. 사장님 뒤 4자리(`.env`의 `OWNER_CODE`, 기본 `1406`)가 맞으면
httpOnly 쿠키 `gr_session`을 발급하고 미들웨어에서 검사한다. 세션 7일.
**손님은 로그인하지 않는다.** 모든 화면은 사장님 전용.

---

## 4. 화면 명세

라우트는 5개. 상단 헤더(로고=메뉴로 이동 / 로그아웃)는 로그인 외 전 화면 공통.

### `/login`

- 히어로: eyebrow `SCREEN GOLF` → 제목 "그린라운드 / 예약을 한방에" → 안내 "사장님 전화번호 뒤 4자리로 들어갑니다."
- 인풋(숫자 4자리, `maxLength=4`, Enter 제출) + `로그인` 버튼
- 하단에 체험용 번호 안내
- 실패 시 토스트: "번호가 맞지 않습니다. 뒤 4자리를 다시 확인해 주세요."

### `/` — 메뉴

- 2×2 카드 그리드 (`turf` 배경). 제목 + 한 줄 설명
  1. 방 예약 — "인원수에 맞는 시간대를 잡습니다"
  2. 포인트 적립 — "번호만 넣으면 도장 1개"
  3. 예약 현황 — "방별 빈 시간을 한눈에"
  4. 고객 등록 — "이름과 번호만 받습니다"
- 하단: **무료 예약권 보유 고객 목록** (`coupons > 0`인 고객만, `flag` 색으로 "무료 N회")
  - 비었을 때: "아직 카드를 채운 고객이 없습니다."

### `/book` — 방 예약

1. **인원수** 1~6 세그먼트 버튼 → 선택 시 기존 슬롯 선택 해제
2. **날짜** DatePicker (‹ / 날짜 + '오늘' 뱃지 / ›)
3. 안내 배너(`turf`): "4명이면 **4.3시간**이 필요합니다. (1인 63분 기준)"
4. 방별 카드 2개. 각 카드에 **시작 가능 시간 칩** 목록
   - 빈 구간 중 `길이 >= needMin`인 것만
   - 시작 시각은 구간 시작을 30분 단위로 올림한 뒤 30분씩 증가, 구간당 최대 8개
   - 칩 라벨: `08:30 – 12:50`
   - 슬롯이 없으면: "이 인원으로 들어갈 시간이 없습니다. 날짜를 바꿔보세요."
5. 칩 선택 시 **확정 카드**가 아래에 나타남
   - 요약: `2026.08.04 · 1번방 · 08:30–12:50`
   - 고객 뒤 4자리 인풋 → 4자리 입력되면 즉시 조회
     - 없음: "등록되지 않은 번호입니다. 고객 등록에서 먼저 추가해 주세요." (`flag`)
     - 있음: `이름 · 도장 7/10 · 무료 예약권 1회`
   - `coupons > 0`이면 **"무료 예약권 사용 (이번 이용은 도장 없음)"** 토글 노출
   - `취소` / `예약하기` 버튼

### `/status` — 예약 현황

- DatePicker
- 방별 카드에 **하루 타임라인을 세그먼트 리스트**로 표시 (08:00~24:00 전체를 빈틈없이 채움)
  - 빈 구간: `turf` 배경, `08:30 – 12:50` + "비어있음 4.3시간" — **클릭 시 `/book`으로 이동**
    (선택한 날짜·방·시작시각을 쿼리스트링으로 넘겨 프리필)
  - 예약 구간: 흰 배경, 시간 + `이름 4명`, 무료 예약이면 `무료` 뱃지(`flag`)

### `/point` — 포인트 적립

- 뒤 4자리 인풋 + `적립` 버튼 (Enter로도 실행)
- **조회와 적립을 한 번에 처리한다.** 번호만 넣으면 무조건 도장이 1개 찍힌다.
- 결과: 이름 + 전체 전화번호, 우측에 무료 예약권 수(`flag`)
- 그 아래 스탬프 카드들을 10개 단위로 끊어서 전부 표시 (`grid sm:grid-cols-2`)
  - 마지막(진행 중) 카드 하단에 "3회 더 이용하면 무료 예약 1회"
- 토스트: 일반 `정승우님 포인트 적립 8/10` / 10개째 `카드 완성! 정승우님 무료 예약권 1장이 나왔습니다.`

### `/customer` — 고객 등록

- 이름 + 전화번호(11자리) → `고객 등록`
- 검증: 이름 1자 이상 / 숫자 11자리 / 뒤 4자리 중복 불가
  - 중복 시 토스트: "이미 같은 뒤 4자리 고객이 있습니다."
- 저장 시 `010-5397-1406` 형태로 포맷팅
- 하단에 등록된 고객 목록 (이름, 번호, `7 / 10`, 무료 N회)

---

## 5. 핵심 로직

### 5-1. 타임라인 계산

```ts
type Segment =
  | { type: 'open'; start: number; end: number }
  | { type: 'busy'; start: number; end: number; res: Reservation };

function buildTimeline(reservations: Reservation[], roomId: number, date: string): Segment[] {
  const list = reservations
    .filter(r => r.room_id === roomId && r.date === date)
    .sort((a, b) => a.start_min - b.start_min);

  const segs: Segment[] = [];
  let cur = OPEN;
  for (const r of list) {
    if (r.start_min > cur) segs.push({ type: 'open', start: cur, end: r.start_min });
    segs.push({ type: 'busy', start: r.start_min, end: r.end_min, res: r });
    cur = Math.max(cur, r.end_min);
  }
  if (cur < CLOSE) segs.push({ type: 'open', start: cur, end: CLOSE });
  return segs;
}
```

### 5-2. 시작 가능 시각

```ts
function slotsFor(timeline: Segment[], need: number): number[] {
  const out: number[] = [];
  for (const g of timeline) {
    if (g.type !== 'open' || g.end - g.start < need) continue;
    let s = Math.ceil(g.start / 30) * 30;
    for (let n = 0; s + need <= g.end && n < 8; n++, s += 30) out.push(s);
  }
  return out;
}
```

### 5-3. 예약 확정 (트랜잭션)

1. 해당 방·날짜에 `[start, start+need)` 구간이 겹치는 예약이 있으면 실패 → "방금 다른 예약이 잡혔습니다. 시간을 다시 골라주세요."
2. `reservations` insert
3. `is_free = true`면 → `customers.used_coupons += 1`, **도장 없음**
   `is_free = false`면 → `stamps` insert (date = 예약일)
4. 도장 후 `totalStamps % 10 === 0`이면 카드 완성 토스트

### 5-4. 포맷 유틸

```ts
toHM(510)        // '08:30'
fmtDur(50)       // '50분'
fmtDur(500)      // '8.3시간'   (60 미만은 분, 이상은 소수 1자리 시간, .0은 제거)
fmtDate('20260804') // '2026.08.04'
shiftDate(s, ±1)    // 하루 이동
```

---

## 6. 폴더 구조

```
app/
  layout.tsx
  page.tsx              # 메뉴
  login/page.tsx
  book/page.tsx
  status/page.tsx
  point/page.tsx
  customer/page.tsx
  actions/
    auth.ts             # login, logout
    reservation.ts      # createReservation, listByDate
    customer.ts         # createCustomer, findByLast4, addStamp
components/
  ui/{Btn,Field,Card,Eyebrow,Toast,DatePicker}.tsx
  StampCard.tsx
  RoomTimeline.tsx
  SlotPicker.tsx
lib/
  time.ts               # toHM, fmtDur, fmtDate, shiftDate, needMin
  timeline.ts           # buildTimeline, slotsFor
  supabase.ts
  constants.ts
middleware.ts           # gr_session 쿠키 검사
```

---

## 7. WBS

### 1단계 — 화면 (DB 없이)
- [ ] Next.js + Tailwind 세팅, 컬러 토큰 및 Pretendard 적용
- [ ] `lib/time.ts`, `lib/timeline.ts` + 단위 테스트 (경계: 예약 0건 / 종일 예약 / 딱 맞는 구간)
- [ ] 공용 UI 컴포넌트 6종
- [ ] 로그인 → 메뉴 라우팅 + 쿠키 미들웨어
- [ ] `/customer` 등록 + 목록
- [ ] `/point` 적립 + StampCard
- [ ] `/status` 타임라인, 빈 칸 → `/book` 프리필
- [ ] `/book` 인원·날짜·슬롯·확정 + 무료 예약권 토글
- [ ] 시드 데이터로 전 화면 동작 확인 (`localStorage` 영속)

### 2단계 — Supabase
- [ ] 스키마 마이그레이션 + 시드
- [ ] Server Actions로 CRUD 교체
- [ ] 예약 겹침 검사를 DB 트랜잭션으로 이동
- [ ] Vercel 배포, `OWNER_CODE` 환경변수

### 3단계 — 이후
- [ ] 예약 취소 / 시간 변경
- [ ] 방 개수·영업시간·1인당 시간 설정 화면
- [ ] 손님용 조회 페이지 (뒤 4자리로 내 도장 확인)
- [ ] 예약 확정 시 알림톡

---

## 8. 완료 조건

- 아이폰 사파리 세로 화면에서 모든 버튼이 한 손으로 눌린다 (최소 터치 44px)
- 4명 예약 시 4.3시간 미만의 빈 구간은 절대 노출되지 않는다
- 도장 10개째를 찍으면 즉시 새 빈 카드가 하나 더 생긴다
- 무료 예약권으로 잡은 예약은 도장이 찍히지 않고, 현황에 `무료` 뱃지가 붙는다
- 등록되지 않은 번호로는 예약이 확정되지 않는다
