import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../../apps/api/src/server.js';
import { ReservationStatus } from '@sneakdrop/shared';

describe('Queue Flow Integration Test', () => {
  let ctx: ReturnType<typeof createApp>;

  beforeEach(() => {
    ctx = createApp({ inMemory: true });
    ctx.inventoryService.resetAll('sneaker-drop-001', 1);
  });

  it('adds users to FIFO queue when stock runs out, and promotes upon hold cancellation', () => {
    // 1. User 1 grabs the only pair
    const hold1 = ctx.reservationService.createHold('user_1');
    assert.strictEqual(hold1.success, true);
    assert.strictEqual(hold1.reservation?.status, ReservationStatus.ACTIVE);

    // 2. User 2 tries to buy -> gets queued at position 1
    const hold2 = ctx.reservationService.createHold('user_2');
    assert.strictEqual(hold2.success, false);
    assert.strictEqual(hold2.queued, true);
    assert.strictEqual(hold2.queuePosition, 1);

    // 3. User 3 tries to buy -> gets queued at position 2
    const hold3 = ctx.reservationService.createHold('user_3');
    assert.strictEqual(hold3.success, false);
    assert.strictEqual(hold3.queued, true);
    assert.strictEqual(hold3.queuePosition, 2);

    // 4. User 1 cancels their hold
    const cancelled = ctx.reservationService.cancelHold(hold1.reservation!.id, 'user_1');
    assert.strictEqual(cancelled, true);

    // 5. User 2 should now automatically have an active hold!
    const user2State = ctx.reservationService.getUserState('user_2');
    assert.ok(user2State.activeHold);
    assert.strictEqual(user2State.activeHold?.status, ReservationStatus.ACTIVE);
    assert.ok(user2State.activeHold?.remainingSeconds >= 295 && user2State.activeHold?.remainingSeconds <= 300);

    // 6. User 3 should now be at position #1 in line
    const user3State = ctx.reservationService.getUserState('user_3');
    assert.strictEqual(user3State.queueEntry?.position, 1);
  });
});
