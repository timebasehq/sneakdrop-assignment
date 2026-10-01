import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { createReservation, cancelReservation } from "./reservation.controller";

const router = Router();

router.post("/", authenticate, createReservation);
router.delete("/:id", authenticate, cancelReservation);

export default router;
