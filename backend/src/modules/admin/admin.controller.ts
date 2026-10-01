import { Request, Response } from "express";
import prisma from "../../config/prisma";
import { z } from "zod";

export const getAdminInventory = async (req: Request, res: Response) => {
  try {
    const inventory = await prisma.productInventory.findMany({
      include: {
        variant: {
          include: { product: true }
        }
      }
    });
    res.json({ success: true, inventory });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
};

const updateInventorySchema = z.object({
  total: z.number().min(0)
});

export const updateAdminInventory = async (req: Request, res: Response) => {
  try {
    const { total } = updateInventorySchema.parse(req.body);
    const id = req.params.id as string;

    const inventory = await prisma.productInventory.findUnique({ where: { id } });
    if (!inventory) {
      return res.status(404).json({ success: false, error: "Inventory not found" });
    }

    const result = await prisma.$executeRaw`
      UPDATE "ProductInventory"
      SET total = ${total}
      WHERE id = ${id}::text AND ${total} >= sold + reserved
    `;

    if (result === 0) {
       return res.status(400).json({ 
         success: false, 
         error: "Cannot reduce total below already sold + reserved quantity or inventory not found" 
       });
    }

    const updated = await prisma.productInventory.findUnique({ where: { id } });

    res.json({ success: true, inventory: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: "Validation error", details: err.errors });
    }
    res.status(500).json({ success: false, error: "Server error" });
  }
};
