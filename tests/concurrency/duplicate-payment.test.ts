import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../../apps/api/src/server.js';
import { OrderStatus, PaymentStatus } from '@sneakdrop/shared';

describe('Concurrency Test: Duplicate Payment Events', () => {
  let ctx: ReturnType<typeof createApp>;

  beforeEach(() => {
    ctx = createApp({ inMemory: true });
    ctx.inventoryService.resetAll('sneaker-drop-001', 20);
  });

  it('guarantees single execution when 10 duplicate payment webhooks fire concurrently', async () => {
    // 1. Create a hold and order for user
    const holdRes = ctx.reservationService.createHold('concurrency_pay_user');
    assert.strictEqual(holdRes.success, true);
    const reservationId = holdRes.reservation!.id;

    const order = ctx.orderService.createOrder('concurrency_pay_user', reservationId);
    const orderId = order.id;

    // 2. Fire 10 concurrent webhooks with identical eventId & orderId
    const EVENT_ID = 'evt_concurrent_test_123';
    const promises = Array.from({ length: 10 }, () => {
      return new Promise<any>((resolve) => {
        setImmediate(() => {
          const res = ctx.paymentService.processWebhook({
            eventId: EVENT_ID,
            orderId,
            status: PaymentStatus.SUCCESS,
            timestamp: new Date().toISOString(),
          });
          resolve(res);
        });
      });
    });

    const responses = await Promise.all(promises);

    for (const res of responses) {
      assert.strictEqual(res.success, true);
    }

    const duplicateCount = responses.filter((r) => r.isDuplicate === true).length;
    assert.strictEqual(duplicateCount, 9);

    const inv = ctx.inventoryService.getInventoryStatus('sneaker-drop-001');
    assert.strictEqual(inv.soldStock, 1);
    assert.strictEqual(inv.availableStock, 19);

    const userState = ctx.reservationService.getUserState('concurrency_pay_user');
    assert.strictEqual(userState.purchasedCount, 1);

    const finalOrder = ctx.orderService.getOrder(orderId);
    assert.strictEqual(finalOrder?.status, OrderStatus.PAID);
  });
});
