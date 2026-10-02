import { ReservationStatus, QueueStatus, OrderStatus, PaymentStatus } from '@sneakdrop/shared';

export interface InventoryRow {
  id: string;
  name: string;
  price: number;
  total_stock: number;
  sold_stock: number;
  created_at: string;
  updated_at: string;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  purchased_count: number;
  created_at: string;
}

export interface ReservationRow {
  id: string;
  user_id: string;
  item_id: string;
  status: ReservationStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface QueueEntryRow {
  id: string;
  user_id: string;
  item_id: string;
  status: QueueStatus;
  created_at: string;
  updated_at: string;
}

export interface OrderRow {
  id: string;
  user_id: string;
  reservation_id: string;
  item_id: string;
  amount: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

export interface PaymentEventRow {
  id: string;
  event_id: string;
  order_id: string;
  status: PaymentStatus;
  sequence_number: number;
  processed_at: string;
}
