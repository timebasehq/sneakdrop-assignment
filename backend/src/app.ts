import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import pino from "pino";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "./modules/auth/auth.routes";
import productRoutes from "./modules/products/product.routes";
import inventoryRoutes from "./modules/inventory/inventory.routes";
import reservationRoutes from "./modules/reservations/reservation.routes";
import adminRoutes from "./modules/admin/admin.routes";
import paymentRoutes from "./modules/payments/payment.routes";
import waitlistRoutes from "./modules/waitlist/waitlist.routes";

const app = express();
const logger = pino({ level: process.env.LOG_LEVEL || "info" });

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Ignore pino-http for healthcheck and tests to avoid noise
if (process.env.NODE_ENV !== "test") {
  app.use(pinoHttp({ logger }));
}

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/waitlist", waitlistRoutes);

// Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err);
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ success: false, error: message });
});

export default app;
