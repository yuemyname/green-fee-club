export interface Room {
  id: number;
  name: string;
  open_min: number;   // 방별 운영 시작
  close_min: number;  // 방별 운영 종료
  active: boolean;    // false면 일시 운영 중지 (예약 화면에서 숨김)
}

/** 예약 불가 시간 (점심시간 등) */
export interface Block {
  id: number;
  room_id: number | null; // null = 모든 방
  label: string;
  date: string | null;    // null = 매일 반복, 아니면 yyyymmdd
  start_min: number;
  end_min: number;
}

/** 무료 예약권 사용 내역 — 어떤 예약에 쓰였는지 */
export interface CouponUse {
  date: string;             // 예약 날짜 yyyymmdd
  start_min: number;
  end_min: number;
  room_name: string | null;
}

/** 입금 확인 상태: 대기 / 수기 입금 확인 / 무료 예약권(포인트) 사용 */
export type PaymentState = 'pending' | 'manual' | 'point';

export interface Reservation {
  id: number;
  date: string;         // yyyymmdd
  room_id: number;
  start_min: number;    // 510 = 08:30
  end_min: number;
  customer_id: number;
  people: number;
  is_free: boolean;
}

/** 현황/타임라인 표시용 — 고객 이름·입금 상태 포함 */
export interface ReservationRow extends Reservation {
  customer_name: string;
  payment: PaymentState;
  customer_coupons: number; // 해당 고객의 사용 가능한 무료 예약권
}

/** 고객 + 파생 값 (도장 수·쿠폰) */
export interface CustomerOverview {
  id: number;
  name: string;
  phone: string;        // 010-5397-1406
  last4: string;
  totalStamps: number;
  progress: number;     // 현재 카드에 찍힌 개수 (totalStamps % 10)
  coupons: number;      // 사용 가능한 무료 예약권
}
