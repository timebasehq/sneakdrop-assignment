import { Router } from 'express';
import { InventoryService } from '../services/inventory.service.js';
import { SNEAKER_ITEM_ID } from '@sneakdrop/shared';

export function createInventoryRouter(inventoryService: InventoryService): Router {
  const router = Router();

  router.get('/status', (req, res, next) => {
    try {
      const itemId = (req.query.itemId as string) || SNEAKER_ITEM_ID;
      const status = inventoryService.getInventoryStatus(itemId);
      res.json(status);
    } catch (err) {
      next(err);
    }
  });

  router.post('/reset', (req, res, next) => {
    try {
      const itemId = (req.body.itemId as string) || SNEAKER_ITEM_ID;
      const totalStock = req.body.totalStock ? Number(req.body.totalStock) : 20;
      inventoryService.resetAll(itemId, totalStock);
      const status = inventoryService.getInventoryStatus(itemId);
      res.json({ message: 'Inventory reset successfully', status });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
