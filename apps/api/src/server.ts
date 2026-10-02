import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getDatabase, DBConfig } from './db/client.js';
import { InventoryService } from './services/inventory.service.js';
import { QueueService } from './services/queue.service.js';
import { ReservationService } from './services/reservation.service.js';
import { OrderService } from './services/order.service.js';
import { PaymentService } from './services/payment.service.js';
import { ReservationExpiryWorker } from './workers/reservation-expiry.worker.js';
import { errorHandler } from './middleware/error-handler.js';
import { createInventoryRouter } from './routes/inventory.js';
import { createReservationRouter } from './routes/reservations.js';
import { createQueueRouter } from './routes/queue.js';
import { createOrderRouter } from './routes/orders.js';
import { createPaymentRouter } from './routes/payments.js';

dotenv.config();

export function createApp(dbConfig?: DBConfig) {
  const app = express();
  const db = getDatabase(dbConfig);

  const inventoryService = new InventoryService(db);
  const queueService = new QueueService(db);
  const reservationService = new ReservationService(db, queueService);
  const orderService = new OrderService(db);
  const paymentService = new PaymentService(db, queueService);

  const expiryWorker = new ReservationExpiryWorker(db, reservationService);

  inventoryService.initializeInventory();

  app.use(cors());
  app.use(express.json());

  // Static files for the frontend UI
  const possiblePublicPaths = [
    path.resolve(process.cwd(), 'apps/web/public'),
    path.resolve(process.cwd(), '../web/public'),
    path.resolve(process.cwd(), 'public')
  ];

  for (const pubPath of possiblePublicPaths) {
    if (fs.existsSync(pubPath)) {
      app.use(express.static(pubPath));
      break;
    }
  }

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/inventory', createInventoryRouter(inventoryService));
  app.use('/api/reservations', createReservationRouter(reservationService));
  app.use('/api/queue', createQueueRouter(queueService));
  app.use('/api/orders', createOrderRouter(orderService));
  app.use('/api/payments', createPaymentRouter(paymentService, orderService));

  app.use(errorHandler);

  return {
    app,
    db,
    inventoryService,
    queueService,
    reservationService,
    orderService,
    paymentService,
    expiryWorker,
  };
}

const PORT = process.env.PORT || 3001;

const isMain = process.argv[1] && (
  process.argv[1].endsWith('server.js') || 
  process.argv[1].endsWith('server.ts')
) && process.env.NODE_ENV !== 'test';

if (isMain) {
  const { app, expiryWorker } = createApp();
  expiryWorker.start();

  app.listen(PORT, () => {
    console.log(`[SneakDrop] System running at http://localhost:${PORT}`);
    console.log(`[SneakDrop] UI accessible at http://localhost:${PORT}/`);
    console.log(`[SneakDrop] API endpoints active under /api/*`);
    console.log(`[SneakDrop] Reservation Expiry Worker active`);
  });
}
