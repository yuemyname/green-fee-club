export const OPEN = 8 * 60;          // 08:00 기본 영업 시작 (분 단위)
export const CLOSE = 24 * 60;        // 24:00 기본 영업 종료
export const MIN_PER_PERSON = 63;    // 1인당 필요 시간
export const SLOT_STEP = 10;         // 예약 시작 시각 단위 (10분)
export const STAMP_GOAL = 10;        // 도장 10개 = 무료 1회
// 방 목록은 DB(rooms 테이블)에서 관리한다. 기본 시드는 scripts/migrate.mjs 참고.
