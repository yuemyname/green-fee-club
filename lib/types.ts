export interface Customer {
  id: number;
  name: string;
  phone: string;        // 010-5397-1406
  last4: string;        // 조회 키
  used_coupons: number; // 사용한 무료 예약권 수
  created_at: string;
}

export interface Stamp {
  id: number;
  customer_id: number;
  date: string;         // yyyymmdd
  created_at: string;
}

export interface Reservation {
  id: number;
  date: string;         // yyyymmdd
  room_id: number;
  start_min: number;    // 510 = 08:30
  end_min: number;
  customer_id: number;
  people: number;
  is_free: boolean;
  created_at: string;
}

export interface DB {
  customers: Customer[];
  stamps: Stamp[];
  reservations: Reservation[];
  seq: number;
}
