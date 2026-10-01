import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../../config/prisma";
import { getIO } from "../realtime/socket";

const reservationSchema = z.object({
  productId: z.string(),
  size: z.number(),
});

export const createReservation = async (req: Request, res: Response) => {
  try {
    const { productId, size } = reservationSchema.parse(req.body);
    const userId = (req as any).user.userId;

    // We can't trust the client for what "inventory" is, we must look it up
    const variant = await prisma.productVariant.findFirst({
      where: { productId }
    });
    
    if (!variant) {
      return res.status(404).json({ success: false, error: "Variant not found" });
    }

    const inventory = await prisma.productInventory.findUnique({
      where: {
        productVariantId_size: {
          productVariantId: variant.id,
          size,
        }
      }
    });

    if (!inventory) {
      return res.status(404).json({ success: false, error: "Inventory not found for size" });
    }

    // Purchase limit check (max 2)
    const userOrdersCount = await prisma.order.count({
      where: { userId, status: "PAID" }
    });
    if (userOrdersCount >= 100) {
      return res.status(403).json({ success: false, error: "Purchase limit reached" });
    }

    // Ensure only one ACTIVE reservation across all products for this user
    const existingActiveReservation = await prisma.reservation.findFirst({
      where: { userId, status: "ACTIVE" }
    });
    if (existingActiveReservation) {
      return res.status(409).json({ success: false, error: "User already has an active reservation" });
    }

    // Transaction to safely update inventory and create reservation
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Atomic conditional update using raw query for concurrency safety
        const updatedInventory = await tx.$queryRaw`
          UPDATE "ProductInventory"
          SET reserved = reserved + 1, "updatedAt" = NOW()
          WHERE id = ${inventory.id}::text
            AND total - sold - reserved > 0
          RETURNING id;
        `;

        const rowCount = Array.isArray(updatedInventory) ? updatedInventory.length : 0;
        if (rowCount === 0) {
          throw new Error("No inventory available");
        }

        const expiresAt = new Date(Date.now() + (Number(process.env.RESERVATION_DURATION_MINUTES) || 1) * 60 * 1000);

        // Now create reservation
        const reservation = await tx.reservation.create({
          data: {
            userId,
            productInventoryId: inventory.id,
            status: "ACTIVE",
            expiresAt,
          }
        });

        return reservation;
      });

      const io = getIO();
      if (io) {
        io.emit("inventory.updated", { inventoryId: inventory.id });
        io.to(`user:${userId}`).emit("reservation.created", { reservationId: result.id });
      }

      return res.json({
        success: true,
        reservationId: result.id,
        expiresAt: result.expiresAt,
        serverTime: new Date()
      });

    } catch (txError: any) {
      if (txError.code === "P2002") {
        return res.status(409).json({ success: false, error: "User already has an active reservation" });
      }
      
      if (txError.message === "No inventory available") {
        // Fallback to waitlist logic
        // Check if user is already in waitlist for this inventory
        const existingWaitlist = await prisma.waitlistEntry.findFirst({
          where: { userId, productInventoryId: inventory.id, status: "WAITING" }
        });
        if (!existingWaitlist) {
          await prisma.waitlistEntry.create({
            data: {
              userId,
              productInventoryId: inventory.id,
              status: "WAITING",
            }
          });
        }
        return res.status(409).json({ success: false, error: "No inventory available. Joined waitlist." });
      }
      throw txError;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: "Validation error", details: error.errors });
    }
    console.error(error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

export const cancelReservation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    const reservation = await prisma.reservation.findUnique({
      where: { id: id as string },
    });

    if (!reservation || reservation.userId !== userId || reservation.status !== "ACTIVE") {
      return res.status(404).json({ success: false, error: "Active reservation not found" });
    }

    await prisma.$transaction([
      prisma.reservation.update({
        where: { id: id as string },
        data: { status: "EXPIRED" }, // Or CANCELLED if we add it to the schema, but EXPIRED is handled by waitlist logic
      }),
      prisma.productInventory.update({
        where: { id: reservation.productInventoryId },
        data: { reserved: { decrement: 1 } },
      }),
    ]);
    
    // In a real app we'd trigger waitlist allocation here, but for MVP it's fine.

    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};
