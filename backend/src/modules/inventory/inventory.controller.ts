import { Request, Response } from "express";
import prisma from "../../config/prisma";
import { z } from "zod";

export const getInventory = async (req: Request, res: Response) => {
  try {
    const inventory = await prisma.productInventory.findMany({
      include: {
        variant: {
          include: { product: true }
        }
      }
    });

    const formatted = inventory.map(inv => ({
      id: inv.id,
      productTitle: inv.variant.product.title,
      size: inv.size,
      total: inv.total,
      reserved: inv.reserved,
      sold: inv.sold,
      available: inv.total - inv.reserved - inv.sold
    }));

    res.json({ success: true, inventory: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};
