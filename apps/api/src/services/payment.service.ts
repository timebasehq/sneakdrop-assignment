import { randomUUID } from 'node:crypto';
import { DBWrapper } from '../db/client.js';
import {
  PaymentWebhookPayload,
  PaymentStatus,
  OrderStatus,
  ReservationStatus,
  MAX_PURCHASES_PER_USER
} from '@sneakdrop/shared';
import { OrderRow, ReservationRow, PaymentEventRow, UserRow, InventoryRow } from '../types/index.js';
import { QueueService } from './queue.service.js';

export interface PaymentProcessResult {
  success: boolean;
  orderId: string;
  status: OrderStatus;
  message: string;
  isDuplicate?: boolean;
  isLate?: boolean;
  isOutOfOrder?: boolean;
}

export class PaymentService {
  constructor(
    private db: DBWrapper,
    private queueService: QueueService
  ) {}

  public processWebhook(payload: PaymentWebhookPayload): PaymentProcessResult {
    return this.db.transaction(() => {
      const { eventId, orderId, status, sequenceNumber = 1 } = payload;

      // 1. Idempotency Check
      const existingEvent = this.db.prepare(`
        SELECT * FROM payment_events WHERE event_id = ?
      `).get(eventId) as unknown as PaymentEventRow | undefined;

      if (existingEvent) {
        const order = this.db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as unknown as OrderRow | undefined;
        return {
          success: existingEvent.status === PaymentStatus.SUCCESS,
          orderId,
          status: order ? order.status : OrderStatus.CANCELLED,
          message: 'Duplicate payment event ignored (Idempotent replay).',
          isDuplicate: true,
        };
      }

      // 2. Fetch Order
      const order = this.db.prepare(`
        SELECT * FROM orders WHERE id = ?
      `).get(orderId) as unknown as OrderRow | undefined;

      if (!order) {
        return {
          success: false,
          orderId,
          status: OrderStatus.CANCELLED,
          message: `Order ${orderId} not found.`,
        };
      }

      // 3. Check if already PAID
      if (order.status === OrderStatus.PAID) {
        this.recordPaymentEvent(eventId, orderId, status, sequenceNumber);
        return {
          success: true,
          orderId,
          status: OrderStatus.PAID,
          message: 'Order is already marked as PAID. Duplicate event recorded.',
          isDuplicate: true,
        };
      }

      // 4. Sequence number / Out of order check
      const higherSeqEvent = this.db.prepare(`
        SELECT * FROM payment_events
        WHERE order_id = ? AND sequence_number > ?
      `).get(orderId, sequenceNumber) as unknown as PaymentEventRow | undefined;

      if (higherSeqEvent) {
        this.recordPaymentEvent(eventId, orderId, status, sequenceNumber);
        return {
          success: false,
          orderId,
          status: order.status,
          message: 'Received older sequence payment event out of order. Ignored.',
          isOutOfOrder: true,
        };
      }

      // 5. Fetch reservation
      const reservation = this.db.prepare(`
        SELECT * FROM reservations WHERE id = ?
      `).get(order.reservation_id) as unknown as ReservationRow | undefined;

      if (!reservation) {
        this.recordPaymentEvent(eventId, orderId, PaymentStatus.FAILED, sequenceNumber);
        return {
          success: false,
          orderId,
          status: OrderStatus.CANCELLED,
          message: 'Reservation not found for order.',
        };
      }

      // 6. Check for Late Event / Expiration
      const isExpiredTime = new Date(reservation.expires_at).getTime() <= Date.now();
      const isExpiredState = reservation.status !== ReservationStatus.ACTIVE;

      if (isExpiredTime || isExpiredState) {
        this.recordPaymentEvent(eventId, orderId, PaymentStatus.FAILED, sequenceNumber);
        this.db.prepare(`
          UPDATE orders SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(orderId);

        if (reservation.status === ReservationStatus.ACTIVE) {
          this.db.prepare(`
            UPDATE reservations SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE id = ?
          `).run(reservation.id);
          this.queueService.promoteNext(reservation.item_id);
        }

        return {
          success: false,
          orderId,
          status: OrderStatus.EXPIRED,
          message: 'Payment received too late. Hold reservation has already expired.',
          isLate: true,
        };
      }

      // 7. Payment FAILED
      if (status === PaymentStatus.FAILED) {
        this.recordPaymentEvent(eventId, orderId, PaymentStatus.FAILED, sequenceNumber);
        this.db.prepare(`
          UPDATE orders SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(orderId);
        this.db.prepare(`
          UPDATE reservations SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(reservation.id);

        this.queueService.promoteNext(reservation.item_id);

        return {
          success: false,
          orderId,
          status: OrderStatus.CANCELLED,
          message: 'Payment failed. Reservation cancelled.',
        };
      }

      // 8. Payment SUCCESS
      const user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(order.user_id) as unknown as UserRow;
      if (user.purchased_count >= MAX_PURCHASES_PER_USER) {
        this.recordPaymentEvent(eventId, orderId, PaymentStatus.FAILED, sequenceNumber);
        return {
          success: false,
          orderId,
          status: OrderStatus.CANCELLED,
          message: `User has reached max purchase limit (${MAX_PURCHASES_PER_USER}).`,
        };
      }

      const inv = this.db.prepare('SELECT * FROM inventory WHERE id = ?').get(order.item_id) as unknown as InventoryRow;
      if (inv.sold_stock >= inv.total_stock) {
        this.recordPaymentEvent(eventId, orderId, PaymentStatus.FAILED, sequenceNumber);
        return {
          success: false,
          orderId,
          status: OrderStatus.CANCELLED,
          message: 'Sneaker drop is completely sold out.',
        };
      }

      this.db.prepare(`
        UPDATE orders SET status = 'PAID', updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(orderId);

      this.db.prepare(`
        UPDATE reservations SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(reservation.id);

      this.db.prepare(`
        UPDATE users SET purchased_count = purchased_count + 1 WHERE id = ?
      `).run(order.user_id);

      this.db.prepare(`
        UPDATE inventory SET sold_stock = sold_stock + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(order.item_id);

      this.recordPaymentEvent(eventId, orderId, PaymentStatus.SUCCESS, sequenceNumber);

      return {
        success: true,
        orderId,
        status: OrderStatus.PAID,
        message: 'Payment confirmed! Purchase successfully completed.',
      };
    });
  }

  private recordPaymentEvent(
    eventId: string,
    orderId: string,
    status: PaymentStatus,
    sequenceNumber: number
  ): void {
    const id = randomUUID();
    this.db.prepare(`
      INSERT INTO payment_events (id, event_id, order_id, status, sequence_number)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, eventId, orderId, status, sequenceNumber);
  }
}
