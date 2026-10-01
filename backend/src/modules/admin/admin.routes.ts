import { Router } from "express";
import { authenticate, requireAdmin } from "../../middleware/auth";
import { getAdminInventory, updateAdminInventory } from "./admin.controller";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/inventory", getAdminInventory);
router.patch("/inventory/:id", updateAdminInventory);

export default router;
