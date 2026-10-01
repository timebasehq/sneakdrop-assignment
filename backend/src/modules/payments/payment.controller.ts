import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../../config/prisma";
import { Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { getIO } from "../realtime/socket";

const simulatePaymentSchema = z.object({
  reservationId: z.string(),
  dummyCard: z.string().optional(),
});

export const simulatePayment = async (req: Request, res: Response) => {
  try {
    const { reservationId } = simulatePaymentSchema.parse(req.body);
    const userId = (req as any).user.userId;

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { productInventory: { include: { variant: { include: { product: true } } } } }
    });

    if (!reservation) {
      return res.status(404).json({ success: false, error: "Reservation not found" });
    }

    if (reservation.userId !== userId) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    // Fake payment event generation
    const eventId = uuidv4();
    const amount = reservation.productInventory.variant.product.price; // Just an example, realistically subtotal + GST

    // Idempotent Payment processing transaction
    const result = await processPaymentEvent(eventId, userId, reservationId, amount);

    if (!result.success) {
       return res.status(400).json(result);
    }

    const io = getIO();
    if (io && result.orderId) {
       io.to(`user:${userId}`).emit("order.completed", { orderId: result.orderId });
    }

    return res.json({ success: true, orderId: result.orderId });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: "Validation error", details: error.errors });
    }
    console.error("Payment error", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

type ProcessPaymentResult = 
  | { success: true; orderId?: string | null; message?: string; error?: string }
  | { success: false; error: string };

async function processPaymentEvent(eventId: string, userId: string, reservationId: string, amount: number): Promise<ProcessPaymentResult> {
  try {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Check idempotency
      const existingEvent = await tx.paymentEvent.findUnique({
        where: { id: eventId }
      });

      if (existingEvent) {
        if (existingEvent.status === "SUCCESS") {
           return { success: true, orderId: existingEvent.orderId, message: "Idempotent success" } as ProcessPaymentResult;
        }
        return { success: false, error: "Payment previously failed" } as ProcessPaymentResult;
      }

      // 2. Lock reservation
      const lockedRes = await tx.$queryRaw`
        SELECT * FROM "Reservation" WHERE id = ${reservationId}::text FOR UPDATE;
      ` as any[];

      if (!lockedRes.length) {
         throw new Error("Reservation not found");
      }

      const res = lockedRes[0];

      if (res.status === "EXPIRED" || new Date(res.expiresAt) < new Date()) {
         // Log payment event as failed due to expiration
         await tx.paymentEvent.create({
           data: { id: eventId, userId, status: "FAILED_EXPIRED", amount }
         });
         return { success: false, error: "Reservation has expired" } as ProcessPaymentResult;
      }
      
      if (res.status === "COMPLETED") {
         return { success: true, error: "Reservation already completed" } as ProcessPaymentResult;
      }

      // 3. Process the payment (simulate success)
      
      // Update Reservation
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: "COMPLETED" }
      });

      // Update Inventory (reserved - 1, sold + 1)
      await tx.productInventory.update({
        where: { id: res.productInventoryId },
        data: {
          reserved: { decrement: 1 },
          sold: { increment: 1 },
        }
      });

      // Create Order
      const order = await tx.order.create({
        data: {
          userId,
          productInventoryId: res.productInventoryId,
          pricePaid: amount,
          status: "PAID"
        }
      });

      // Record Payment Event
      await tx.paymentEvent.create({
        data: {
          id: eventId,
          userId,
          orderId: order.id,
          status: "SUCCESS",
          amount,
        }
      });

      return { success: true, orderId: order.id } as ProcessPaymentResult;
    });
  } catch (err: any) {
    return { success: false, error: err.message || "Payment processing failed" } as ProcessPaymentResult;
  }
}
