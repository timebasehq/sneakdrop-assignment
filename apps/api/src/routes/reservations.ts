import { Router } from 'express';
import { ReservationService } from '../services/reservation.service.js';
import { SNEAKER_ITEM_ID } from '@sneakdrop/shared';

export function createReservationRouter(reservationService: ReservationService): Router {
  const router = Router();

  router.post('/hold', (req, res, next) => {
    try {
      const { userId, itemId = SNEAKER_ITEM_ID } = req.body;
      if (!userId) {
        return res.status(400).json({ error: true, message: 'userId is required' });
      }

      const result = reservationService.createHold(userId, itemId);
      res.json(result);
    } catch (err: any) {
      next(err);
    }
  });

  router.get('/user/:userId', (req, res, next) => {
    try {
      const { userId } = req.params;
      const itemId = (req.query.itemId as string) || SNEAKER_ITEM_ID;
      const userState = reservationService.getUserState(userId, itemId);
      res.json(userState);
    } catch (err) {
      next(err);
    }
  });

  router.post('/cancel', (req, res, next) => {
    try {
      const { reservationId, userId } = req.body;
      if (!reservationId) {
        return res.status(400).json({ error: true, message: 'reservationId is required' });
      }

      const cancelled = reservationService.cancelHold(reservationId, userId);
      res.json({ success: cancelled });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
