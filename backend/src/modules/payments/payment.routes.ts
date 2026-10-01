import { Router } from "express";
import { simulatePayment } from "./payment.controller";
import { authenticate } from "../../middleware/auth";

const router = Router();

router.post("/simulate", authenticate, simulatePayment);

export default router;
