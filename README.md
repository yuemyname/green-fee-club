# 그린라운드 — 스크린골프 예약 + 포인트 적립

사장님 1인이 카운터에서 쓰는 단일 매장용 예약/적립 도구.
전화번호 뒤 4자리만으로 모든 조회가 끝나는 것이 핵심 UX. 상세 명세는 `SPEC.md` 참고.

## 실행

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # lib 단위 테스트 (vitest)
npm run build   # 프로덕션 빌드
```

로그인 코드는 `OWNER_CODE` 환경변수(기본 `1406`).

## 현재 단계 — 1단계 (DB 없이)

- 데이터는 브라우저 `localStorage`(`greenround:v1`)에 저장되고, 첫 실행 시 시드 데이터가 들어갑니다.
- 인증은 클라이언트가 발급하는 쿠키 `gr_session`(7일)을 서버 배포에선 `middleware.ts`가, 정적 배포에선 `AuthGuard`가 검사합니다.
- 2단계에서 Supabase(Postgres)로 CRUD를 옮기고, 인증을 Server Action + httpOnly 쿠키로 되돌리고, 예약 겹침 검사를 DB 트랜잭션으로 이동합니다. 스키마는 `SPEC.md` 3-2 참고.

## GitHub Pages 배포

푸시하면 `.github/workflows/pages.yml`이 정적 내보내기(`STATIC_EXPORT=1`, basePath `/green-fee-club`)로 빌드해 Pages에 배포합니다.
저장소 **Settings → Pages → Source**를 **GitHub Actions**로 한 번만 설정하면 됩니다.
주소: `https://<owner>.github.io/green-fee-club/`

## 화면

| 라우트 | 설명 |
|---|---|
| `/login` | 사장님 전화번호 뒤 4자리 로그인 |
| `/` | 메뉴 + 무료 예약권 보유 고객 목록 |
| `/book` | 인원·날짜 → 방별 시작 가능 시간 칩 → 예약 확정 (무료 예약권 토글) |
| `/status` | 방별 하루 타임라인, 빈 구간 클릭 시 `/book` 프리필 |
| `/point` | 뒤 4자리로 조회+적립 한 번에, 스탬프 카드 표시 |
| `/customer` | 고객 등록 + 목록 |

## 구조

```
app/                  # 라우트 (전부 클라이언트 페이지) + actions/auth.ts
components/ui/        # Btn, Field, Card, Eyebrow, Toast, DatePicker
components/           # StampCard, RoomTimeline, SlotPicker, Header
lib/
  constants.ts        # OPEN/CLOSE/ROOMS 등
  time.ts             # toHM, fmtDur, fmtDate, shiftDate, needMin
  timeline.ts         # buildTimeline, slotsFor
  db.ts               # localStorage 스토어 + 도메인 로직 (1단계)
middleware.ts         # gr_session 쿠키 검사
```
