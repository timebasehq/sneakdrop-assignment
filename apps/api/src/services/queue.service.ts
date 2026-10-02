import { randomUUID } from 'node:crypto';
import { DBWrapper } from '../db/client.js';
import {
  QueueInfo,
  QueueStatus,
  ReservationInfo,
  ReservationStatus,
  SNEAKER_ITEM_ID,
  HOLD_DURATION_SECONDS,
  MAX_PURCHASES_PER_USER
} from '@sneakdrop/shared';
import { QueueEntryRow, UserRow, InventoryRow } from '../types/index.js';

export class QueueService {
  constructor(private db: DBWrapper) {}

  public joinQueue(userId: string, itemId: string = SNEAKER_ITEM_ID): QueueInfo {
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
        throw new Error(`User has already purchased the maximum limit of ${MAX_PURCHASES_PER_USER} pairs.`);
      }

      const activeHold = this.db.prepare(`
        SELECT id FROM reservations
        WHERE user_id = ? AND item_id = ? AND status = 'ACTIVE' AND datetime(expires_at) > datetime('now')
      `).get(userId, itemId);

      if (activeHold) {
        throw new Error('User already has an active reservation.');
      }

      const existingQueue = this.db.prepare(`
        SELECT * FROM queue_entries
        WHERE user_id = ? AND item_id = ? AND status = 'WAITING'
      `).get(userId, itemId) as unknown as QueueEntryRow | undefined;

      if (existingQueue) {
        const position = this.calculatePosition(existingQueue.id, itemId);
        return {
          id: existingQueue.id,
          userId: existingQueue.user_id,
          itemId: existingQueue.item_id,
          position,
          status: existingQueue.status,
          createdAt: existingQueue.created_at,
        };
      }

      const queueId = randomUUID();
      this.db.prepare(`
        INSERT INTO queue_entries (id, user_id, item_id, status)
        VALUES (?, ?, ?, 'WAITING')
      `).run(queueId, userId, itemId);

      const newEntry = this.db.prepare('SELECT * FROM queue_entries WHERE id = ?').get(queueId) as unknown as QueueEntryRow;
      const position = this.calculatePosition(newEntry.id, itemId);

      return {
        id: newEntry.id,
        userId: newEntry.user_id,
        itemId: newEntry.item_id,
        position,
        status: newEntry.status,
        createdAt: newEntry.created_at,
      };
    });
  }

  public getQueueStatus(userId: string, itemId: string = SNEAKER_ITEM_ID): QueueInfo | null {
    const entry = this.db.prepare(`
      SELECT * FROM queue_entries
      WHERE user_id = ? AND item_id = ? AND status = 'WAITING'
    `).get(userId, itemId) as unknown as QueueEntryRow | undefined;

    if (!entry) {
      return null;
    }

    const position = this.calculatePosition(entry.id, itemId);
    return {
      id: entry.id,
      userId: entry.user_id,
      itemId: entry.item_id,
      position,
      status: entry.status,
      createdAt: entry.created_at,
    };
  }

  public leaveQueue(userId: string, itemId: string = SNEAKER_ITEM_ID): boolean {
    const result = this.db.prepare(`
      UPDATE queue_entries
      SET status = 'LEFT', updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND item_id = ? AND status = 'WAITING'
    `).run(userId, itemId);

    return Number(result.changes) > 0;
  }

  public promoteNext(itemId: string = SNEAKER_ITEM_ID): ReservationInfo | null {
    return this.db.transaction(() => {
      const inv = this.db.prepare(`
        SELECT id, total_stock, sold_stock
        FROM inventory
        WHERE id = ?
      `).get(itemId) as unknown as InventoryRow | undefined;

      if (!inv) return null;

      const activeRes = this.db.prepare(`
        SELECT COUNT(*) as count
        FROM reservations
        WHERE item_id = ? AND status = 'ACTIVE' AND datetime(expires_at) > datetime('now')
      `).get(itemId) as unknown as { count: number };

      const available = inv.total_stock - inv.sold_stock - Number(activeRes.count || 0);
      if (available <= 0) {
        return null;
      }

      const nextCandidate = this.db.prepare(`
        SELECT q.id, q.user_id, q.item_id
        FROM queue_entries q
        JOIN users u ON q.user_id = u.id
        WHERE q.item_id = ? AND q.status = 'WAITING' AND u.purchased_count < ?
        ORDER BY q.rowid ASC
        LIMIT 1
      `).get(itemId, MAX_PURCHASES_PER_USER) as unknown as { id: string; user_id: string; item_id: string } | undefined;

      if (!nextCandidate) {
        return null;
      }

      this.db.prepare(`
        UPDATE queue_entries
        SET status = 'PROMOTED', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(nextCandidate.id);

      const reservationId = randomUUID();
      const expiresAt = new Date(Date.now() + HOLD_DURATION_SECONDS * 1000).toISOString();

      this.db.prepare(`
        INSERT INTO reservations (id, user_id, item_id, status, expires_at)
        VALUES (?, ?, ?, 'ACTIVE', ?)
      `).run(reservationId, nextCandidate.user_id, nextCandidate.item_id, expiresAt);

      return {
        id: reservationId,
        userId: nextCandidate.user_id,
        itemId: nextCandidate.item_id,
        status: ReservationStatus.ACTIVE,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt,
        remainingSeconds: HOLD_DURATION_SECONDS,
      };
    });
  }

  private calculatePosition(id: string, itemId: string): number {
    const res = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM queue_entries
      WHERE item_id = ? AND status = 'WAITING' AND rowid <= (
        SELECT rowid FROM queue_entries WHERE id = ?
      )
    `).get(itemId, id) as unknown as { count: number };

    return Number(res.count || 0);
  }
}
