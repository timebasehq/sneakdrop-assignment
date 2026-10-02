import { DBWrapper } from '../db/client.js';
import { InventoryStatus, SNEAKER_ITEM_ID, SNEAKER_NAME, SNEAKER_PRICE, INITIAL_STOCK } from '@sneakdrop/shared';
import { InventoryRow } from '../types/index.js';

export class InventoryService {
  constructor(private db: DBWrapper) {}

  public initializeInventory(itemId: string = SNEAKER_ITEM_ID, totalStock: number = INITIAL_STOCK): void {
    const existing = this.db.prepare('SELECT id FROM inventory WHERE id = ?').get(itemId);
    if (!existing) {
      this.db.prepare(`
        INSERT INTO inventory (id, name, price, total_stock, sold_stock)
        VALUES (?, ?, ?, ?, 0)
      `).run(itemId, SNEAKER_NAME, SNEAKER_PRICE, totalStock);
    }
  }

  public getInventoryStatus(itemId: string = SNEAKER_ITEM_ID): InventoryStatus {
    this.initializeInventory(itemId);

    const inv = this.db.prepare(`
      SELECT id, name, price, total_stock, sold_stock
      FROM inventory
      WHERE id = ?
    `).get(itemId) as unknown as InventoryRow | undefined;

    if (!inv) {
      throw new Error(`Item ${itemId} not found`);
    }

    const activeReservations = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM reservations
      WHERE item_id = ? AND status = 'ACTIVE' AND datetime(expires_at) > datetime('now')
    `).get(itemId) as unknown as { count: number };

    const waitingQueue = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM queue_entries
      WHERE item_id = ? AND status = 'WAITING'
    `).get(itemId) as unknown as { count: number };

    const reservedCount = Number(activeReservations.count || 0);
    const availableCount = Math.max(0, inv.total_stock - inv.sold_stock - reservedCount);

    return {
      itemId: inv.id,
      name: inv.name,
      price: inv.price,
      totalStock: inv.total_stock,
      availableStock: availableCount,
      reservedStock: reservedCount,
      soldStock: inv.sold_stock,
      waitingQueueCount: Number(waitingQueue.count || 0),
    };
  }

  public resetAll(itemId: string = SNEAKER_ITEM_ID, totalStock: number = INITIAL_STOCK): void {
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM payment_events').run();
      this.db.prepare('DELETE FROM orders').run();
      this.db.prepare('DELETE FROM reservations').run();
      this.db.prepare('DELETE FROM queue_entries').run();
      this.db.prepare('UPDATE users SET purchased_count = 0').run();
      this.db.prepare(`
        INSERT INTO inventory (id, name, price, total_stock, sold_stock)
        VALUES (?, ?, ?, ?, 0)
        ON CONFLICT(id) DO UPDATE SET total_stock = ?, sold_stock = 0
      `).run(itemId, SNEAKER_NAME, SNEAKER_PRICE, totalStock, totalStock);
    });
  }
}
