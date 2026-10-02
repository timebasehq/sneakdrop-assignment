import { Router } from 'express';
import { OrderService } from '../services/order.service.js';

export function createOrderRouter(orderService: OrderService): Router {
  const router = Router();

  router.post('/create', (req, res, next) => {
    try {
      const { userId, reservationId } = req.body;
      if (!userId || !reservationId) {
        return res.status(400).json({ error: true, message: 'userId and reservationId are required' });
      }

      const order = orderService.createOrder(userId, reservationId);
      res.json({ success: true, order });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:orderId', (req, res, next) => {
    try {
      const { orderId } = req.params;
      const order = orderService.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: true, message: 'Order not found' });
      }
      res.json({ order });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
