import { Request, Response } from "express";
import prisma from "../../config/prisma";

export const getMyWaitlist = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const waitlistEntries = await prisma.waitlistEntry.findMany({
      where: { userId },
      include: {
        productInventory: {
          include: {
            variant: {
              include: {
                product: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const result = await Promise.all(waitlistEntries.map(async (entry) => {
      let position = null;
      if (entry.status === "WAITING") {
        const count = await prisma.waitlistEntry.count({
          where: {
            productInventoryId: entry.productInventoryId,
            status: "WAITING",
            createdAt: { lt: entry.createdAt }
          }
        });
        position = count + 1;
      }

      return {
        waitlistId: entry.id,
        productInventoryId: entry.productInventoryId,
        status: entry.status,
        createdAt: entry.createdAt,
        position,
        product: {
          title: entry.productInventory.variant.product.title,
          brand: entry.productInventory.variant.product.brand,
          image: entry.productInventory.variant.image,
          size: entry.productInventory.size
        }
      };
    }));

    return res.json({ success: true, waitlist: result });
  } catch (error) {
    console.error("Waitlist API error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};
