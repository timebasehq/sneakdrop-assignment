import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/config/prisma";
import bcrypt from "bcryptjs";

describe("Concurrency Test", () => {
  let productId = "";

  beforeEach(async () => {
    await prisma.reservation.deleteMany({ where: { user: { username: { startsWith: "concurrent_user" } } } });
    await prisma.reservation.deleteMany({ where: { user: { username: "same_user_concurrent" } } });
    await prisma.user.deleteMany({ where: { username: { startsWith: "concurrent_user" } } });
    await prisma.user.deleteMany({ where: { username: "same_user_concurrent" } });
    await prisma.reservation.deleteMany({ where: { productInventory: { variant: { productId: "concurrency_prod" } } } });
    await prisma.productInventory.deleteMany({ where: { variant: { productId: "concurrency_prod" } } });
    await prisma.productVariant.deleteMany({ where: { productId: "concurrency_prod" } });
    await prisma.product.deleteMany({ where: { id: "concurrency_prod" } });

    // 1. Create a special product for concurrency
    const prod = await prisma.product.create({
      data: {
        id: "concurrency_prod",
        brand: "Concurrency",
        title: "Test",
        price: 100,
        description: "Test",
        statusColor: "bg-black",
        variants: {
          create: {
            id: "concurrency_v1",
            image: "test",
            thumbnail: "test",
            inventory: {
              create: [
                { size: 42, total: 20 } // EXACTLY 20
              ]
            }
          }
        }
      }
    });
    productId = prod.id;
  });

  it("Should not oversell under heavy load", async () => {
    const numUsers = 100;
    const tokens: string[] = [];

    const password = await bcrypt.hash("test", 10);
    for (let i = 0; i < numUsers; i++) {
      const username = `concurrent_user_${i}`;
      await prisma.user.upsert({
        where: { username },
        update: {},
        create: { username, password, role: "CUSTOMER" }
      });
      const res = await request(app).post("/api/auth/login").send({ username, password: "test" });
      tokens.push(res.headers["set-cookie"][0].split(";")[0]);
    }

    // Fire 100 simultaneous reservation requests
    const promises = tokens.map(token => 
      request(app).post("/api/reservations")
        .set("Cookie", token)
        .send({ productId, size: 42 })
    );

    const results = await Promise.all(promises);

    // Count how many succeeded
    const successes = results.filter(r => r.body.success === true);
    expect(successes.length).toBeLessThanOrEqual(20);

    // Verify DB
    const inventory = await prisma.productInventory.findFirst({
      where: { size: 42, variant: { productId } }
    });
    expect(inventory?.reserved).toBe(successes.length);
    expect(inventory?.sold).toBe(0);
    
    const available = inventory!.total - inventory!.reserved - inventory!.sold;
    expect(available).toBeGreaterThanOrEqual(0);
    
    const activeReservations = await prisma.reservation.count({
      where: { productInventoryId: inventory?.id, status: "ACTIVE" }
    });
    expect(activeReservations).toBe(successes.length);
  }, 120000);

  it("Should not allow same user to get multiple reservations concurrently", async () => {
    const username = "same_user_concurrent";
    const password = await bcrypt.hash("test", 10);
    await prisma.user.upsert({
      where: { username },
      update: {},
      create: { username, password, role: "CUSTOMER" }
    });
    const res = await request(app).post("/api/auth/login").send({ username, password: "test" });
    const token = res.headers["set-cookie"][0].split(";")[0];

    // Fire 20 simultaneous reservation requests from SAME user
    const promises = Array(20).fill(0).map(() => 
      request(app).post("/api/reservations")
        .set("Cookie", token)
        .send({ productId, size: 42 })
    );

    const results = await Promise.all(promises);

    const successes = results.filter(r => r.body.success === true);
    expect(successes.length).toBe(1);

    const userObj = await prisma.user.findUnique({ where: { username } });
    const activeReservations = await prisma.reservation.count({
      where: { userId: userObj!.id, status: "ACTIVE" }
    });
    expect(activeReservations).toBe(1);
  }, 10000);
});
