export enum ReservationStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export enum QueueStatus {
  WAITING = 'WAITING',
  PROMOTED = 'PROMOTED',
  LEFT = 'LEFT'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED'
}

export interface InventoryStatus {
  itemId: string;
  name: string;
  price: number;
  totalStock: number;
  availableStock: number;
  reservedStock: number;
  soldStock: number;
  waitingQueueCount: number;
}

export interface ReservationInfo {
  id: string;
  userId: string;
  itemId: string;
  status: ReservationStatus;
  createdAt: string;
  expiresAt: string;
  remainingSeconds: number;
}

export interface QueueInfo {
  id: string;
  userId: string;
  itemId: string;
  position: number;
  status: QueueStatus;
  createdAt: string;
}

export interface UserStateResponse {
  userId: string;
  purchasedCount: number;
  maxPurchases: number;
  activeHold: ReservationInfo | null;
  queueEntry: QueueInfo | null;
  orders: OrderInfo[];
}

export interface OrderInfo {
  id: string;
  userId: string;
  reservationId: string;
  status: OrderStatus;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface HoldRequest {
  userId: string;
  itemId?: string;
}

export interface HoldResponse {
  success: boolean;
  message?: string;
  reservation?: ReservationInfo;
  queued?: boolean;
  queuePosition?: number;
}

export interface QueueJoinRequest {
  userId: string;
  itemId?: string;
}

export interface PaymentWebhookPayload {
  eventId: string;
  orderId: string;
  status: PaymentStatus;
  sequenceNumber?: number;
  timestamp: string;
}

export interface PaymentProcessRequest {
  userId: string;
  reservationId: string;
  simulateFailure?: boolean;
  simulateDelayMs?: number;
  duplicate?: boolean;
}
