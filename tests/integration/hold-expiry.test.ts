import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../../apps/api/src/server.js';
import { ReservationStatus } from '@sneakdrop/shared';

describe('Hold Expiration Integration Test', () => {
  let ctx: ReturnType<typeof createApp>;

  beforeEach(() => {
    ctx = createApp({ inMemory: true });
    ctx.inventoryService.resetAll('sneaker-drop-001', 1);
  });

  it('automatically expires abandoned holds and promotes the next waiting user', () => {
    // 1. User 1 holds pair
    const hold1 = ctx.reservationService.createHold('user_1');
    assert.strictEqual(hold1.success, true);

    // 2. User 2 joins queue
    const hold2 = ctx.reservationService.createHold('user_2');
    assert.strictEqual(hold2.queued, true);
    assert.strictEqual(hold2.queuePosition, 1);

    // 3. Fast-forward user 1's hold expiration in DB
    ctx.db.prepare(`
      UPDATE reservations
      SET expires_at = datetime('now', '-10 seconds')
      WHERE id = ?
    `).run(hold1.reservation!.id);

    // 4. Trigger worker tick
    const expiredCount = ctx.expiryWorker.tick();
    assert.strictEqual(expiredCount, 1);

    // 5. User 1 hold should now be expired
    const user1State = ctx.reservationService.getUserState('user_1');
    assert.strictEqual(user1State.activeHold, null);

    // 6. User 2 should be automatically promoted
    const user2State = ctx.reservationService.getUserState('user_2');
    assert.ok(user2State.activeHold);
    assert.strictEqual(user2State.activeHold?.userId, 'user_2');
    assert.strictEqual(user2State.activeHold?.status, ReservationStatus.ACTIVE);
  });
});
