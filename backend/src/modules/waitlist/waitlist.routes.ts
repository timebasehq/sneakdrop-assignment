import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { getMyWaitlist } from "./waitlist.controller";

const router = Router();

router.get("/me", authenticate, getMyWaitlist);

export default router;
