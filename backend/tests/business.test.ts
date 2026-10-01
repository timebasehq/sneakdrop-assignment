import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/config/prisma";
import bcrypt from "bcryptjs";

describe("Backend Business Rules Tests", () => {
  let userToken = "";
  let productId = "";
  
  beforeAll(async () => {
    // Basic setup
    const password = await bcrypt.hash("test1234", 10);
    const user = await prisma.user.upsert({
      where: { username: "test_business_user" },
      update: {},
      create: { username: "test_business_user", password, role: "CUSTOMER" }
    });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "test_business_user", password: "test1234" });
    
    userToken = res.headers["set-cookie"][0].split(";")[0];

    const prod = await prisma.product.findFirst({ include: { variants: { include: { inventory: true } } } });
    if(prod) {
      productId = prod.id;
      // create inventory if not exists
      if (!prod.variants[0].inventory.find(i => i.size === 39)) {
        await prisma.productInventory.create({
          data: { productVariantId: prod.variants[0].id, size: 39, total: 10 }
        });
      }
    }
  });

  it("1. User can reserve when inventory exists", async () => {
    const res = await request(app)
      .post("/api/reservations")
      .set("Cookie", userToken)
      .send({ productId, size: 39 });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reservationId).toBeDefined();
  });

  it("2. User cannot create a second active reservation", async () => {
    const res = await request(app)
      .post("/api/reservations")
      .set("Cookie", userToken)
      .send({ productId, size: 39 });
    
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("3. Expired reservation cannot be paid for", async () => {
    // 1. Manually expire the user's active reservation
    const activeRes = await prisma.reservation.findFirst({ where: { userId: (await prisma.user.findUnique({ where: { username: "test_business_user" } }))!.id, status: "ACTIVE" } });
    expect(activeRes).toBeDefined();

    await prisma.reservation.update({
      where: { id: activeRes!.id },
      data: { expiresAt: new Date(Date.now() - 10000) } // past
    });

    // 2. Attempt payment
    const paymentRes = await request(app)
      .post("/api/payments/simulate")
      .set("Cookie", userToken)
      .send({ reservationId: activeRes!.id, dummyCard: "1111" });

    expect(paymentRes.status).toBe(400);
    expect(paymentRes.body.success).toBe(false);
    expect(paymentRes.body.error).toBe("Reservation has expired");

    // Ensure it didn't change status to COMPLETED
    const checkRes = await prisma.reservation.findUnique({ where: { id: activeRes!.id } });
    expect(checkRes!.status).not.toBe("COMPLETED");
  });
});
