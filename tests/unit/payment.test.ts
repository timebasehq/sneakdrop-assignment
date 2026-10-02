import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { getDatabase, DBWrapper } from '../../apps/api/src/db/client.js';
import { InventoryService } from '../../apps/api/src/services/inventory.service.js';
import { QueueService } from '../../apps/api/src/services/queue.service.js';
import { ReservationService } from '../../apps/api/src/services/reservation.service.js';
import { OrderService } from '../../apps/api/src/services/order.service.js';
import { PaymentService } from '../../apps/api/src/services/payment.service.js';
import { PaymentStatus, OrderStatus } from '@sneakdrop/shared';

describe('PaymentService Unit Tests', () => {
  let db: DBWrapper;
  let inventoryService: InventoryService;
  let queueService: QueueService;
  let reservationService: ReservationService;
  let orderService: OrderService;
  let paymentService: PaymentService;

  beforeEach(() => {
    db = getDatabase({ inMemory: true });
    inventoryService = new InventoryService(db);
    queueService = new QueueService(db);
    reservationService = new ReservationService(db, queueService);
    orderService = new OrderService(db);
    paymentService = new PaymentService(db, queueService);

    inventoryService.initializeInventory('sneaker-drop-001', 5);
  });

  it('successfully processes a valid payment event and completes order and reservation', () => {
    const hold = reservationService.createHold('user_1');
    const order = orderService.createOrder('user_1', hold.reservation!.id);

    const result = paymentService.processWebhook({
      eventId: 'evt_1',
      orderId: order.id,
      status: PaymentStatus.SUCCESS,
      timestamp: new Date().toISOString(),
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, OrderStatus.PAID);

    const updatedOrder = orderService.getOrder(order.id);
    assert.strictEqual(updatedOrder?.status, OrderStatus.PAID);

    const inv = inventoryService.getInventoryStatus();
    assert.strictEqual(inv.soldStock, 1);
    assert.strictEqual(inv.reservedStock, 0);
    assert.strictEqual(inv.availableStock, 4);

    const userState = reservationService.getUserState('user_1');
    assert.strictEqual(userState.purchasedCount, 1);
  });

  it('guarantees idempotency for duplicated webhook events', () => {
    const hold = reservationService.createHold('user_1');
    const order = orderService.createOrder('user_1', hold.reservation!.id);

    const res1 = paymentService.processWebhook({
      eventId: 'evt_dup',
      orderId: order.id,
      status: PaymentStatus.SUCCESS,
      timestamp: new Date().toISOString(),
    });
    assert.strictEqual(res1.success, true);

    const res2 = paymentService.processWebhook({
      eventId: 'evt_dup',
      orderId: order.id,
      status: PaymentStatus.SUCCESS,
      timestamp: new Date().toISOString(),
    });
    assert.strictEqual(res2.isDuplicate, true);

    const inv = inventoryService.getInventoryStatus();
    assert.strictEqual(inv.soldStock, 1);
  });

  it('rejects late payment events when hold has expired and promotes queue', () => {
    const hold = reservationService.createHold('user_1');
    const order = orderService.createOrder('user_1', hold.reservation!.id);

    db.prepare('UPDATE inventory SET total_stock = 1').run();
    const q2 = queueService.joinQueue('user_2');
    assert.strictEqual(q2.position, 1);

    reservationService.expireHold(hold.reservation!.id);

    const lateResult = paymentService.processWebhook({
      eventId: 'evt_late',
      orderId: order.id,
      status: PaymentStatus.SUCCESS,
      timestamp: new Date().toISOString(),
    });

    assert.strictEqual(lateResult.success, false);
    assert.strictEqual(lateResult.isLate, true);
    assert.strictEqual(lateResult.status, OrderStatus.EXPIRED);

    const user2Hold = reservationService.getActiveHold('user_2');
    assert.ok(user2Hold);
    assert.strictEqual(user2Hold?.userId, 'user_2');
  });

  it('handles out-of-order webhook events without corrupting final state', () => {
    const hold = reservationService.createHold('user_1');
    const order = orderService.createOrder('user_1', hold.reservation!.id);

    const res2 = paymentService.processWebhook({
      eventId: 'evt_seq_2',
      orderId: order.id,
      status: PaymentStatus.SUCCESS,
      sequenceNumber: 2,
      timestamp: new Date().toISOString(),
    });
    assert.strictEqual(res2.success, true);

    const res1 = paymentService.processWebhook({
      eventId: 'evt_seq_1',
      orderId: order.id,
      status: PaymentStatus.FAILED,
      sequenceNumber: 1,
      timestamp: new Date().toISOString(),
    });

    assert.ok(res1.isOutOfOrder || res1.isDuplicate);

    const finalOrder = orderService.getOrder(order.id);
    assert.strictEqual(finalOrder?.status, OrderStatus.PAID);
  });
});
