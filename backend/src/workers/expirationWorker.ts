import cron from "node-cron";
import { Server } from "socket.io";
import prisma from "../config/prisma";

export const startExpirationWorker = (io: Server) => {
  // Run every 5 seconds for MVP
  cron.schedule("*/5 * * * * *", async () => {
    try {
      const now = new Date();

      // Find all active reservations that have expired
      const expiredReservations = await prisma.reservation.findMany({
        where: {
          status: "ACTIVE",
          expiresAt: {
            lte: now,
          },
        },
      });

      for (const res of expiredReservations) {
        // Process each in a transaction
        try {
          await prisma.$transaction(async (tx) => {
            // Re-fetch with row lock (pseudo-lock since Prisma doesn't have SELECT FOR UPDATE directly in findUnique)
            const lockedRes = await tx.$queryRaw`
              SELECT * FROM "Reservation" WHERE id = ${res.id}::text FOR UPDATE;
            ` as any[];

            if (!lockedRes.length || lockedRes[0].status !== "ACTIVE" || lockedRes[0].expiresAt > now) {
              return; // Someone else handled it or it's not expired anymore
            }

            // Mark expired
            await tx.reservation.update({
              where: { id: res.id },
              data: { status: "EXPIRED" },
            });

            // Decrement reserved inventory
            const updatedInventory = await tx.productInventory.update({
              where: { id: res.productInventoryId },
              data: { reserved: { decrement: 1 } },
            });

            if (io) {
              io.to(`user:${res.userId}`).emit("reservation.expired", { reservationId: res.id });
            }

            // Waitlist processing
            // Find earliest WAITING eligible user for this inventory
            const waitlistEntries = await tx.$queryRaw`
              SELECT * FROM "WaitlistEntry"
              WHERE "productInventoryId" = ${res.productInventoryId}::text
                AND status = 'WAITING'
              ORDER BY "createdAt" ASC
              FOR UPDATE SKIP LOCKED;
            ` as any[];

            for (const wl of waitlistEntries) {
              // Verify user eligibility (no active reservation, max 2 purchases)
              const userActiveRes = await tx.reservation.findFirst({
                where: { userId: wl.userId, status: "ACTIVE" }
              });

              const userOrdersCount = await tx.order.count({
                where: { userId: wl.userId, status: "PAID" }
              });

              if (!userActiveRes && userOrdersCount < 100) {
                // Re-increment reserved inventory
                await tx.productInventory.update({
                  where: { id: res.productInventoryId },
                  data: { reserved: { increment: 1 } },
                });

                // Create reservation
                const newRes = await tx.reservation.create({
                  data: {
                    userId: wl.userId,
                    productInventoryId: res.productInventoryId,
                    status: "ACTIVE",
                    expiresAt: new Date(Date.now() + (Number(process.env.RESERVATION_DURATION_MINUTES) || 1) * 60 * 1000),
                  }
                });

                // Mark waitlist allocated
                await tx.waitlistEntry.update({
                  where: { id: wl.id },
                  data: { status: "ALLOCATED" }
                });

                if (io) {
                  io.to(`user:${wl.userId}`).emit("waitlist.updated", { waitlistId: wl.id });
                  io.to(`user:${wl.userId}`).emit("reservation.allocated", { reservationId: newRes.id });
                }

                break; // allocated to one person, break out
              } else {
                // Not eligible anymore, we could just mark it as something else, or leave it. 
                // We'll leave it but ideally it should be marked ineligible.
              }
            }
          });
        } catch (err) {
          console.error("Error processing expired reservation", err);
        }
      }
    } catch (err) {
      console.error("Worker error", err);
    }
  });
};
