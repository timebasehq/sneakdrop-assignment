import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { getDatabase, DBWrapper } from '../../apps/api/src/db/client.js';
import { InventoryService } from '../../apps/api/src/services/inventory.service.js';
import { QueueService } from '../../apps/api/src/services/queue.service.js';
import { ReservationService } from '../../apps/api/src/services/reservation.service.js';
import { ReservationStatus } from '@sneakdrop/shared';

describe('ReservationService Unit Tests', () => {
  let db: DBWrapper;
  let inventoryService: InventoryService;
  let queueService: QueueService;
  let reservationService: ReservationService;

  beforeEach(() => {
    db = getDatabase({ inMemory: true });
    inventoryService = new InventoryService(db);
    queueService = new QueueService(db);
    reservationService = new ReservationService(db, queueService);

    inventoryService.initializeInventory('sneaker-drop-001', 3);
  });

  it('creates an active hold for 5 minutes when stock is available', () => {
    const result = reservationService.createHold('user_1');
    assert.strictEqual(result.success, true);
    assert.ok(result.reservation);
    assert.strictEqual(result.reservation?.status, ReservationStatus.ACTIVE);
    assert.strictEqual(result.reservation?.remainingSeconds, 300);

    const inv = inventoryService.getInventoryStatus();
    assert.strictEqual(inv.availableStock, 2);
    assert.strictEqual(inv.reservedStock, 1);
  });

  it('prevents a user from creating multiple active holds at the same time', () => {
    const hold1 = reservationService.createHold('user_1');
    assert.strictEqual(hold1.success, true);

    const hold2 = reservationService.createHold('user_1');
    assert.strictEqual(hold2.success, true);
    assert.ok(hold2.message?.includes('already have an active hold'));
    assert.strictEqual(hold2.reservation?.id, hold1.reservation?.id);

    const inv = inventoryService.getInventoryStatus();
    assert.strictEqual(inv.reservedStock, 1);
  });

  it('automatically routes user to queue when stock is exhausted', () => {
    reservationService.createHold('user_1');
    reservationService.createHold('user_2');
    reservationService.createHold('user_3');

    const inv = inventoryService.getInventoryStatus();
    assert.strictEqual(inv.availableStock, 0);

    const result = reservationService.createHold('user_4');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.queued, true);
    assert.strictEqual(result.queuePosition, 1);

    const updatedInv = inventoryService.getInventoryStatus();
    assert.strictEqual(updatedInv.waitingQueueCount, 1);
  });

  it('enforces maximum 2 total purchases per user', () => {
    db.prepare("INSERT INTO users (id, name, email, purchased_count) VALUES ('user_limit', 'Limit User', 'limit@test.com', 2)").run();

    assert.throws(() => {
      reservationService.createHold('user_limit');
    }, /Maximum purchase limit reached/);
  });

  it('allows manual hold cancellation and releases reserved stock', () => {
    const hold = reservationService.createHold('user_1');
    assert.strictEqual(inventoryService.getInventoryStatus().reservedStock, 1);

    const cancelled = reservationService.cancelHold(hold.reservation!.id, 'user_1');
    assert.strictEqual(cancelled, true);
    assert.strictEqual(inventoryService.getInventoryStatus().reservedStock, 0);
    assert.strictEqual(inventoryService.getInventoryStatus().availableStock, 3);
  });
});
