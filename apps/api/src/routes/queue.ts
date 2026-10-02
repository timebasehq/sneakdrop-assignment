import { Router } from 'express';
import { QueueService } from '../services/queue.service.js';
import { SNEAKER_ITEM_ID } from '@sneakdrop/shared';

export function createQueueRouter(queueService: QueueService): Router {
  const router = Router();

  router.post('/join', (req, res, next) => {
    try {
      const { userId, itemId = SNEAKER_ITEM_ID } = req.body;
      if (!userId) {
        return res.status(400).json({ error: true, message: 'userId is required' });
      }

      const queueEntry = queueService.joinQueue(userId, itemId);
      res.json({ success: true, queueEntry });
    } catch (err) {
      next(err);
    }
  });

  router.get('/status/:userId', (req, res, next) => {
    try {
      const { userId } = req.params;
      const itemId = (req.query.itemId as string) || SNEAKER_ITEM_ID;
      const queueInfo = queueService.getQueueStatus(userId, itemId);
      res.json({ queueInfo });
    } catch (err) {
      next(err);
    }
  });

  router.post('/leave', (req, res, next) => {
    try {
      const { userId, itemId = SNEAKER_ITEM_ID } = req.body;
      if (!userId) {
        return res.status(400).json({ error: true, message: 'userId is required' });
      }

      const left = queueService.leaveQueue(userId, itemId);
      res.json({ success: left });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
