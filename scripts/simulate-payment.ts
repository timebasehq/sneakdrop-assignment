import { randomUUID } from 'node:crypto';
import { getDatabase } from '../apps/api/src/db/client.js';
import { InventoryService } from '../apps/api/src/services/inventory.service.js';
import { QueueService } from '../apps/api/src/services/queue.service.js';
import { ReservationService } from '../apps/api/src/services/reservation.service.js';
import { OrderService } from '../apps/api/src/services/order.service.js';
import { PaymentService } from '../apps/api/src/services/payment.service.js';
import { PaymentStatus, SNEAKER_ITEM_ID } from '../packages/shared/src/index.js';

console.log('🧪 Running Payment Simulation Scenarios...\n');

const db = getDatabase({ inMemory: true });
const inventoryService = new InventoryService(db);
const queueService = new QueueService(db);
const reservationService = new ReservationService(db, queueService);
const orderService = new OrderService(db);
const paymentService = new PaymentService(db, queueService);

inventoryService.initializeInventory(SNEAKER_ITEM_ID, 20);

async function runScenarios() {
  console.log('====================================================');
  console.log('SCENARIO 1: Normal Payment Flow');
  console.log('====================================================');
  const user1 = 'sim_user_1';
  const hold1 = reservationService.createHold(user1);
  console.log('1. User holds a pair:', hold1.reservation?.id);
  const order1 = orderService.createOrder(user1, hold1.reservation!.id);
  console.log('2. Order created:', order1.id);
  const event1Id = `evt_${randomUUID()}`;
  const res1 = paymentService.processWebhook({
    eventId: event1Id,
    orderId: order1.id,
    status: PaymentStatus.SUCCESS,
    timestamp: new Date().toISOString(),
  });
  console.log('3. Webhook result:', res1);

  console.log('\n====================================================');
  console.log('SCENARIO 2: Duplicate / Replayed Payment Webhook (Idempotency)');
  console.log('====================================================');
  console.log('Replaying the exact same event:', event1Id);
  const res2 = paymentService.processWebhook({
    eventId: event1Id,
    orderId: order1.id,
    status: PaymentStatus.SUCCESS,
    timestamp: new Date().toISOString(),
  });
  console.log('Duplicate Webhook response:', res2);
  console.log('Is Duplicate:', res2.isDuplicate);

  console.log('\n====================================================');
  console.log('SCENARIO 3: Late Payment Arrival (After Hold Expired)');
  console.log('====================================================');
  const user3 = 'sim_user_3';
  const hold3 = reservationService.createHold(user3);
  const order3 = orderService.createOrder(user3, hold3.reservation!.id);
  console.log('Hold created for user 3, now simulating hold expiration...');
  reservationService.expireHold(hold3.reservation!.id);
  console.log('Simulating late payment webhook arriving after expiration...');
  const res3 = paymentService.processWebhook({
    eventId: `evt_${randomUUID()}`,
    orderId: order3.id,
    status: PaymentStatus.SUCCESS,
    timestamp: new Date().toISOString(),
  });
  console.log('Late Payment Webhook response:', res3);
  console.log('Was rejected as late:', res3.isLate);

  console.log('\n====================================================');
  console.log('SCENARIO 4: Out-of-Order Webhook Events');
  console.log('====================================================');
  const user4 = 'sim_user_4';
  const hold4 = reservationService.createHold(user4);
  const order4 = orderService.createOrder(user4, hold4.reservation!.id);

  console.log('1. Newer event (sequence 2, SUCCESS) arrives first:');
  const res4a = paymentService.processWebhook({
    eventId: `evt_${randomUUID()}`,
    orderId: order4.id,
    status: PaymentStatus.SUCCESS,
    sequenceNumber: 2,
    timestamp: new Date().toISOString(),
  });
  console.log('Sequence 2 Result:', res4a);

  console.log('2. Older event (sequence 1, FAILED) arrives late:');
  const res4b = paymentService.processWebhook({
    eventId: `evt_${randomUUID()}`,
    orderId: order4.id,
    status: PaymentStatus.FAILED,
    sequenceNumber: 1,
    timestamp: new Date().toISOString(),
  });
  console.log('Sequence 1 Result:', res4b);
  console.log('Final Order Status remains:', orderService.getOrder(order4.id)?.status);

  console.log('\n🎉 All payment scenarios completed successfully!');
}

runScenarios();
