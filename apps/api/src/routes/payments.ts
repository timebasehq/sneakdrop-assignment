import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { PaymentService } from '../services/payment.service.js';
import { OrderService } from '../services/order.service.js';
import { PaymentStatus, PaymentWebhookPayload } from '@sneakdrop/shared';

export function createPaymentRouter(paymentService: PaymentService, orderService: OrderService): Router {
  const router = Router();

  router.post('/webhook', (req, res, next) => {
    try {
      const payload: PaymentWebhookPayload = req.body;
      if (!payload.eventId || !payload.orderId || !payload.status) {
        return res.status(400).json({
          error: true,
          message: 'Invalid payload: eventId, orderId, and status are required',
        });
      }

      const result = paymentService.processWebhook(payload);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post('/process', async (req, res, next) => {
    try {
      const { userId, reservationId, simulateFailure = false, simulateDelayMs = 0, duplicate = false } = req.body;

      if (!userId || !reservationId) {
        return res.status(400).json({ error: true, message: 'userId and reservationId are required' });
      }

      const order = orderService.createOrder(userId, reservationId);

      if (simulateDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, simulateDelayMs));
      }

      const eventId = `evt_${randomUUID()}`;
      const payload: PaymentWebhookPayload = {
        eventId,
        orderId: order.id,
        status: simulateFailure ? PaymentStatus.FAILED : PaymentStatus.SUCCESS,
        sequenceNumber: 1,
        timestamp: new Date().toISOString(),
      };

      const result = paymentService.processWebhook(payload);

      if (duplicate && result.success) {
        const dupResult = paymentService.processWebhook(payload);
        return res.json({
          ...result,
          duplicateReplay: dupResult,
        });
      }

      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
