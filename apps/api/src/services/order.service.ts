import { randomUUID } from 'node:crypto';
import { DBWrapper } from '../db/client.js';
import { OrderInfo, OrderStatus, SNEAKER_PRICE } from '@sneakdrop/shared';
import { OrderRow, ReservationRow } from '../types/index.js';

export class OrderService {
  constructor(private db: DBWrapper) {}

  public createOrder(userId: string, reservationId: string): OrderInfo {
    return this.db.transaction(() => {
      const res = this.db.prepare(`
        SELECT * FROM reservations
        WHERE id = ? AND user_id = ?
      `).get(reservationId, userId) as unknown as ReservationRow | undefined;

      if (!res) {
        throw new Error('Reservation not found for user.');
      }

      if (res.status !== 'ACTIVE' || new Date(res.expires_at).getTime() <= Date.now()) {
        throw new Error('Reservation is no longer active.');
      }

      const existing = this.db.prepare(`
        SELECT * FROM orders
        WHERE reservation_id = ?
      `).get(reservationId) as unknown as OrderRow | undefined;

      if (existing) {
        return {
          id: existing.id,
          userId: existing.user_id,
          reservationId: existing.reservation_id,
          status: existing.status,
          amount: existing.amount,
          createdAt: existing.created_at,
          updatedAt: existing.updated_at,
        };
      }

      const orderId = randomUUID();
      this.db.prepare(`
        INSERT INTO orders (id, user_id, reservation_id, item_id, amount, status)
        VALUES (?, ?, ?, ?, ?, 'PENDING')
      `).run(orderId, userId, reservationId, res.item_id, SNEAKER_PRICE);

      const order = this.db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as unknown as OrderRow;
      return {
        id: order.id,
        userId: order.user_id,
        reservationId: order.reservation_id,
        status: order.status,
        amount: order.amount,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
      };
    });
  }

  public getOrder(orderId: string): OrderInfo | null {
    const order = this.db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as unknown as OrderRow | undefined;
    if (!order) return null;
    return {
      id: order.id,
      userId: order.user_id,
      reservationId: order.reservation_id,
      status: order.status,
      amount: order.amount,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    };
  }
}
