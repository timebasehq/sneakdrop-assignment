import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../../apps/api/src/server.js';
import { OrderStatus, ReservationStatus, PaymentStatus } from '@sneakdrop/shared';
import { randomUUID } from 'node:crypto';

describe('Purchase Flow Integration Test', () => {
  let ctx: ReturnType<typeof createApp>;

  beforeEach(() => {
    ctx = createApp({ inMemory: true });
  });

  it('completes the full flow: check stock -> hold -> create order -> pay -> verify purchase', () => {
    // 1. Check stock
    const inv = ctx.inventoryService.getInventoryStatus();
    assert.strictEqual(inv.totalStock, 20);
    assert.strictEqual(inv.availableStock, 20);

    // 2. User reserves a pair
    const holdRes = ctx.reservationService.createHold('shoefan_1');
    assert.strictEqual(holdRes.success, true);
    assert.ok(holdRes.reservation);
    assert.strictEqual(holdRes.reservation?.status, ReservationStatus.ACTIVE);

    // 3. Create order
    const order = ctx.orderService.createOrder('shoefan_1', holdRes.reservation!.id);
    assert.strictEqual(order.status, OrderStatus.PENDING);

    // 4. Process payment webhook
    const payRes = ctx.paymentService.processWebhook({
      eventId: `evt_${randomUUID()}`,
      orderId: order.id,
      status: PaymentStatus.SUCCESS,
      timestamp: new Date().toISOString(),
    });

    assert.strictEqual(payRes.success, true);
    assert.strictEqual(payRes.status, OrderStatus.PAID);

    // 5. Verify final inventory
    const finalInv = ctx.inventoryService.getInventoryStatus();
    assert.strictEqual(finalInv.soldStock, 1);
    assert.strictEqual(finalInv.availableStock, 19);
    assert.strictEqual(finalInv.reservedStock, 0);

    // 6. Verify User state
    const userState = ctx.reservationService.getUserState('shoefan_1');
    assert.strictEqual(userState.purchasedCount, 1);
    assert.strictEqual(userState.activeHold, null);
  });
});
