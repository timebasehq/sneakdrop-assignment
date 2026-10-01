import { Router } from "express";
import { getProducts } from "./product.controller";

const router = Router();

router.get("/", getProducts);

export default router;
