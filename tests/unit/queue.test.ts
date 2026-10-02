import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { getDatabase, DBWrapper } from '../../apps/api/src/db/client.js';
import { InventoryService } from '../../apps/api/src/services/inventory.service.js';
import { QueueService } from '../../apps/api/src/services/queue.service.js';

describe('QueueService Unit Tests', () => {
  let db: DBWrapper;
  let inventoryService: InventoryService;
  let queueService: QueueService;

  beforeEach(() => {
    db = getDatabase({ inMemory: true });
    inventoryService = new InventoryService(db);
    queueService = new QueueService(db);
    inventoryService.initializeInventory('sneaker-drop-001', 0);
  });

  it('maintains strict FIFO ordering for queue entries', () => {
    const q1 = queueService.joinQueue('user_1');
    const q2 = queueService.joinQueue('user_2');
    const q3 = queueService.joinQueue('user_3');

    assert.strictEqual(q1.position, 1);
    assert.strictEqual(q2.position, 2);
    assert.strictEqual(q3.position, 3);

    const posUser2 = queueService.getQueueStatus('user_2');
    assert.strictEqual(posUser2?.position, 2);
  });

  it('re-joining returns existing position without duplicating queue entry', () => {
    const q1 = queueService.joinQueue('user_1');
    assert.strictEqual(q1.position, 1);

    const q1Again = queueService.joinQueue('user_1');
    assert.strictEqual(q1Again.position, 1);
    assert.strictEqual(q1Again.id, q1.id);
  });

  it('allows user to leave queue and recalculates subsequent positions', () => {
    queueService.joinQueue('user_1');
    queueService.joinQueue('user_2');
    queueService.joinQueue('user_3');

    queueService.leaveQueue('user_2');

    const q3Status = queueService.getQueueStatus('user_3');
    assert.strictEqual(q3Status?.position, 2);
  });

  it('promotes the first queued user when stock becomes available', () => {
    queueService.joinQueue('user_1');
    queueService.joinQueue('user_2');

    db.prepare('UPDATE inventory SET total_stock = 1 WHERE id = ?').run('sneaker-drop-001');

    const promoted = queueService.promoteNext('sneaker-drop-001');
    assert.ok(promoted);
    assert.strictEqual(promoted?.userId, 'user_1');

    const q2Status = queueService.getQueueStatus('user_2');
    assert.strictEqual(q2Status?.position, 1);
  });
});
