import { randomUUID } from 'node:crypto';
import { DBWrapper } from '../db/client.js';
import {
  ReservationInfo,
  ReservationStatus,
  HoldResponse,
  UserStateResponse,
  OrderStatus,
  SNEAKER_ITEM_ID,
  HOLD_DURATION_SECONDS,
  MAX_PURCHASES_PER_USER
} from '@sneakdrop/shared';
import { ReservationRow, UserRow, InventoryRow, OrderRow } from '../types/index.js';
import { QueueService } from './queue.service.js';

export class ReservationService {
  constructor(
    private db: DBWrapper,
    private queueService: QueueService
  ) {}

  public createHold(userId: string, itemId: string = SNEAKER_ITEM_ID): HoldResponse {
    return this.db.transaction(() => {
      let user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as unknown as UserRow | undefined;
      if (!user) {
        this.db.prepare(`
          INSERT INTO users (id, name, email, purchased_count)
          VALUES (?, ?, ?, 0)
        `).run(userId, `User ${userId.slice(0, 6)}`, `${userId}@sneakdrop.local`);
        user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as unknown as UserRow;
      }

      if (user.purchased_count >= MAX_PURCHASES_PER_USER) {
        throw new Error(`Maximum purchase limit reached (${MAX_PURCHASES_PER_USER} pairs).`);
      }

      const existingHold = this.db.prepare(`
        SELECT * FROM reservations
        WHERE user_id = ? AND item_id = ? AND status = 'ACTIVE' AND datetime(expires_at) > datetime('now')
      `).get(userId, itemId) as unknown as ReservationRow | undefined;

      if (existingHold) {
        const remainingSeconds = Math.max(0, Math.floor((new Date(existingHold.expires_at).getTime() - Date.now()) / 1000));
        return {
          success: true,
          message: 'You already have an active hold.',
          reservation: {
            id: existingHold.id,
            userId: existingHold.user_id,
            itemId: existingHold.item_id,
            status: existingHold.status,
            createdAt: existingHold.created_at,
            expiresAt: existingHold.expires_at,
            remainingSeconds,
          }
        };
      }

      const inv = this.db.prepare(`
        SELECT id, total_stock, sold_stock
        FROM inventory
        WHERE id = ?
      `).get(itemId) as unknown as InventoryRow | undefined;

      if (!inv) {
        throw new Error(`Item ${itemId} not found`);
      }

      const activeHoldsCount = this.db.prepare(`
        SELECT COUNT(*) as count
        FROM reservations
        WHERE item_id = ? AND status = 'ACTIVE' AND datetime(expires_at) > datetime('now')
      `).get(itemId) as unknown as { count: number };

      const availableStock = inv.total_stock - inv.sold_stock - Number(activeHoldsCount.count || 0);

      if (availableStock <= 0) {
        const queueEntry = this.queueService.joinQueue(userId, itemId);
        return {
          success: false,
          queued: true,
          queuePosition: queueEntry.position,
          message: `Stock is currently held or sold out. You have joined the queue at position #${queueEntry.position}.`,
        };
      }

      const reservationId = randomUUID();
      const expiresAt = new Date(Date.now() + HOLD_DURATION_SECONDS * 1000).toISOString();

      this.db.prepare(`
        INSERT INTO reservations (id, user_id, item_id, status, expires_at)
        VALUES (?, ?, ?, 'ACTIVE', ?)
      `).run(reservationId, userId, itemId, expiresAt);

      this.db.prepare(`
        UPDATE queue_entries
        SET status = 'PROMOTED', updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND item_id = ? AND status = 'WAITING'
      `).run(userId, itemId);

      const reservation: ReservationInfo = {
        id: reservationId,
        userId,
        itemId,
        status: ReservationStatus.ACTIVE,
        createdAt: new Date().toISOString(),
        expiresAt,
        remainingSeconds: HOLD_DURATION_SECONDS,
      };

      return {
        success: true,
        message: 'Pair successfully reserved for 5 minutes!',
        reservation,
      };
    });
  }

  public getActiveHold(userId: string, itemId: string = SNEAKER_ITEM_ID): ReservationInfo | null {
    const row = this.db.prepare(`
      SELECT * FROM reservations
      WHERE user_id = ? AND item_id = ? AND status = 'ACTIVE'
    `).get(userId, itemId) as unknown as ReservationRow | undefined;

    if (!row) {
      return null;
    }

    const expiryTime = new Date(row.expires_at).getTime();
    const now = Date.now();
    const remainingSeconds = Math.max(0, Math.floor((expiryTime - now) / 1000));

    if (remainingSeconds <= 0) {
      this.expireHold(row.id);
      return null;
    }

    return {
      id: row.id,
      userId: row.user_id,
      itemId: row.item_id,
      status: row.status,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      remainingSeconds,
    };
  }

  public cancelHold(reservationId: string, userId?: string): boolean {
    return this.db.transaction(() => {
      let query = "UPDATE reservations SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'ACTIVE'";
      const params: any[] = [reservationId];

      if (userId) {
        query += " AND user_id = ?";
        params.push(userId);
      }

      const result = this.db.prepare(query).run(...params);
      if (Number(result.changes) > 0) {
        this.db.prepare("UPDATE orders SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE reservation_id = ? AND status = 'PENDING'").run(reservationId);
        this.queueService.promoteNext();
        return true;
      }
      return false;
    });
  }

  public expireHold(reservationId: string): void {
    this.db.transaction(() => {
      const res = this.db.prepare(`
        UPDATE reservations
        SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'ACTIVE'
      `).run(reservationId);

      if (Number(res.changes) > 0) {
        this.db.prepare(`
          UPDATE orders
          SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
          WHERE reservation_id = ? AND status = 'PENDING'
        `).run(reservationId);

        this.queueService.promoteNext();
      }
    });
  }

  public getUserState(userId: string, itemId: string = SNEAKER_ITEM_ID): UserStateResponse {
    let user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as unknown as UserRow | undefined;
    if (!user) {
      user = {
        id: userId,
        name: `User ${userId.slice(0, 6)}`,
        email: `${userId}@sneakdrop.local`,
        purchased_count: 0,
        created_at: new Date().toISOString()
      };
    }

    const activeHold = this.getActiveHold(userId, itemId);
    const queueEntry = this.queueService.getQueueStatus(userId, itemId);

    const orders = this.db.prepare(`
      SELECT * FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId) as unknown as OrderRow[];

    return {
      userId,
      purchasedCount: user.purchased_count,
      maxPurchases: MAX_PURCHASES_PER_USER,
      activeHold,
      queueEntry,
      orders: orders.map(o => ({
        id: o.id,
        userId: o.user_id,
        reservationId: o.reservation_id,
        status: o.status,
        amount: o.amount,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
      }))
    };
  }
}
