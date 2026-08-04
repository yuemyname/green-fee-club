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

/** 현황/타임라인 표시용 — 고객 이름 포함 */
export interface ReservationRow extends Reservation {
  customer_name: string;
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
