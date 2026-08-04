# 트윈빌스크린 — 스크린골프 예약 + 포인트 적립

사장님 1인이 카운터에서 쓰는 단일 매장용 예약/적립 도구.
전화번호 뒤 4자리만으로 모든 조회가 끝나는 것이 핵심 UX. 상세 명세는 `SPEC.md` 참고.

## 실행

```bash
npm install
export DATABASE_URL=postgres://user:pass@localhost:5432/greenround
npm run db:migrate   # 스키마 적용 + 매장/관리자/방 기본 데이터
npm run db:seed-dev  # (선택) 로컬 개발용 샘플 고객/예약
npm run dev          # http://localhost:3000
npm test             # lib 단위 테스트 (vitest)
```

환경변수:

| 이름 | 설명 |
|---|---|
| `DATABASE_URL` | Postgres 연결 문자열 (필수) |
| `STORE_CODE` / `STORE_NAME` | 최초 매장 정보 (매장이 없을 때만 생성, 기본 `1001` / `트윈빌스크린`) |
| `ADMIN_PASSWORD` | 자동 생성되는 관리자 3개(admin1~3)의 초기 비밀번호, 기본 `1406` |
| `SESSION_SECRET` | 세션 쿠키 서명 키 (미설정 시 기본값 — 운영에선 설정 권장) |

## Railway 배포

1. Railway에서 이 저장소로 서비스 생성 (Next.js 자동 감지)
2. 같은 프로젝트에 **Postgres** 추가
3. 앱 서비스 Variables에 `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` 참조 추가 (+ 필요 시 `OWNER_CODE`)
4. 배포 — `railway.json`의 `preDeployCommand`가 마이그레이션+시드를 자동 실행

## 현재 단계 — 2단계 (Postgres) + 확장

- 매장/관리자: `stores` 1건 + 소속 `admins` 3개(admin1~3, scrypt 해시)를 마이그레이션이
  자동 생성. 계정 추가/삭제 없이 방 관리 화면에서 비밀번호만 변경.
  로그인 시 서명된 httpOnly 쿠키 `gr_session`(7일) 발급, 서버 액션마다 서명·계정 존재 검증
- 고객 조회 키: 뒤 4자리는 중복 허용(전체 번호가 고유). 조회 결과가 여러 명이면
  포인트·예약 화면에서 선택 팝업으로 고른다
- CRUD 전부 Server Actions (`app/actions/`), 예약 겹침 검사는 DB 트랜잭션에서
  `pg_advisory_xact_lock`으로 방·날짜 단위 직렬화 후 수행
- 예약 입금 확인: 예약은 `입금 대기`로 생성 → 현황에서 수기 확인(도장 적립) 또는
  포인트 사용(무료 예약권 차감) 처리
- 방 관리(`/rooms`): 방 추가/수정/삭제, 방별 운영시간, 예약 불가 시간
  (라벨·대상 방·매일 반복/특정 날짜)
- 고객용 화면(`/my`): 전화번호 1회 입력으로 자동 등록/로그인(1년 서명 쿠키),
  본인 예약 등록·변경·취소와 포인트 조회만 가능. 다른 고객 정보는 노출하지 않고,
  입금 확인이 끝난 예약은 온라인 변경·취소 불가. 브라우저는 회선 번호를 제공하지
  않으므로 최초 1회 번호 입력이 필요하다 (PASS/SMS 인증은 추후 확장 지점)
- 스키마: `db/schema.sql`, 마이그레이션·백필: `scripts/migrate.mjs` (운영에는 샘플 데이터를 넣지 않음, 개발용은 `scripts/seed-dev.mjs`)

## 구조

```
app/                  # 라우트 (클라이언트 페이지)
  actions/            # auth, customer(적립 포함), reservation, room — Server Actions
components/ui/        # Btn, Field, Card, Eyebrow, Toast, DatePicker
components/           # StampCard, RoomTimeline, SlotPicker, Header
db/schema.sql         # 테이블 정의
scripts/migrate.mjs   # 마이그레이션 + 시드
lib/
  constants.ts        # OPEN/CLOSE 기본값, 1인당 시간 등
  time.ts             # toHM, fmtDur, fmtDate, shiftDate, needMin
  timeline.ts         # buildTimeline(운영시간·불가 구간 반영), slotsFor
  server/db.ts        # pg Pool
middleware.ts         # gr_session 쿠키 검사
```
