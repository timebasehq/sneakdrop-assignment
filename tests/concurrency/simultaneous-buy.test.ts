import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../../apps/api/src/server.js';

describe('Concurrency Test: Simultaneous Buy Requests', () => {
  let ctx: ReturnType<typeof createApp>;

  beforeEach(() => {
    ctx = createApp({ inMemory: true });
    ctx.inventoryService.resetAll('sneaker-drop-001', 5);
  });

  it('handles 100 simultaneous buy requests for 5 pairs without race conditions or overselling', async () => {
    const NUM_USERS = 100;
    const userIds = Array.from({ length: NUM_USERS }, (_, i) => `concurrent_user_${i + 1}`);

    const promises = userIds.map((userId) => {
      return new Promise<any>((resolve) => {
        setImmediate(() => {
          try {
            const res = ctx.reservationService.createHold(userId);
            resolve(res);
          } catch (err: any) {
            resolve({ success: false, error: err.message });
          }
        });
      });
    });

    const responses = await Promise.all(promises);

    const errors = responses.filter((r) => r.error);
    if (errors.length > 0) {
      console.error('Encountered errors in concurrent buy:', errors);
    }

    const successfulHolds = responses.filter((r) => r.success === true);
    const queuedUsers = responses.filter((r) => r.queued === true);

    assert.strictEqual(errors.length, 0);
    assert.strictEqual(successfulHolds.length, 5);
    assert.strictEqual(queuedUsers.length, 95);

    // Verify inventory state in database
    const inv = ctx.inventoryService.getInventoryStatus('sneaker-drop-001');
    assert.strictEqual(inv.totalStock, 5);
    assert.strictEqual(inv.reservedStock, 5);
    assert.strictEqual(inv.availableStock, 0);
    assert.strictEqual(inv.soldStock, 0);
    assert.strictEqual(inv.waitingQueueCount, 95);

    // Verify all queue positions are unique and contiguous 1..95
    const queuePositions = queuedUsers.map((r) => r.queuePosition).sort((a, b) => a - b);
    assert.strictEqual(queuePositions[0], 1);
    assert.strictEqual(queuePositions[queuePositions.length - 1], 95);
    const uniquePositions = new Set(queuePositions);
    assert.strictEqual(uniquePositions.size, 95);
  });
});
