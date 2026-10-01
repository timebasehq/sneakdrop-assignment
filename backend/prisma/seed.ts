import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '../src/config/prisma';

async function main() {
  // Clear old data (optional, only safe for seed)
  await prisma.paymentEvent.deleteMany();
  await prisma.order.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.productInventory.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // 1. Admin
  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.create({
    data: {
      username: process.env.INITIAL_ADMIN_USERNAME || "admin",
      password: adminPassword,
      role: "ADMIN"
    }
  });

  // 2. Test Customer
  const custPassword = await bcrypt.hash("password", 10);
  await prisma.user.create({
    data: {
      username: "testuser",
      password: custPassword,
      role: "CUSTOMER"
    }
  });

  // 3. Products
  const p1 = await prisma.product.create({
    data: {
      id: "p1",
      brand: "Balenciaga",
      title: "High Speed Sneakers",
      price: 65000,
      description: "We understand that some sneakers are greater than others and only worn once in a blue moon. So for those extra special occasions why not try this collaborative effort from Gyakusou and Nike with these...",
      statusColor: "bg-orange-500",
      variants: {
        create: {
          id: "v1",
          image: "/balenciaga_speed_sneaker_1790697391065.png",
          thumbnail: "/balenciaga_speed_sneaker_1790697391065.png",
          inventory: {
            create: [
              { size: 39, total: 20 },
              { size: 40, total: 5 },
              { size: 41, total: 5 },
              { size: 42, total: 5 },
              { size: 43, total: 5 },
            ]
          }
        }
      }
    }
  });

  const p2 = await prisma.product.create({
    data: {
      id: "p2",
      brand: "Armani",
      title: "Massive Sneakers",
      price: 55000,
      description: "Step up your game with these bold, architectural statement pieces. Engineered for maximum comfort with an unapologetic silhouette.",
      statusColor: "bg-neutral-800",
      variants: {
        create: {
          id: "v2",
          image: "/armani_massive_sneaker_1790697511077.png",
          thumbnail: "/armani_massive_sneaker_1790697511077.png",
          inventory: {
            create: [
              { size: 39, total: 10 },
              { size: 40, total: 10 },
              { size: 41, total: 15 },
              { size: 42, total: 10 },
            ]
          }
        }
      }
    }
  });

  const p3 = await prisma.product.create({
    data: {
      id: "p3",
      brand: "Neil Barrett",
      title: "Geo Sneakers",
      price: 48000,
      description: "Precision meets streetwear. The Geo sneaker features sharp geometric panels and a custom lightweight sole for all-day agility.",
      statusColor: "bg-blue-500",
      variants: {
        create: {
          id: "v3",
          image: "/neilbarrett_geo_sneaker_1790697492879.png",
          thumbnail: "/neilbarrett_geo_sneaker_1790697492879.png",
          inventory: {
            create: [
              { size: 40, total: 8 },
              { size: 41, total: 12 },
              { size: 42, total: 15 },
              { size: 43, total: 8 },
            ]
          }
        }
      }
    }
  });

  const p4 = await prisma.product.create({
    data: {
      id: "p4",
      brand: "Tom Ford",
      title: "Uptempo Sneakers",
      price: 89000,
      description: "Luxurious minimalism at its finest. Premium Italian leather crafted into a timeless athletic silhouette.",
      statusColor: "bg-emerald-600",
      variants: {
        create: {
          id: "v4",
          image: "/tomford_uptempo_sneaker_1790697424658.png",
          thumbnail: "/tomford_uptempo_sneaker_1790697424658.png",
          inventory: {
            create: [
              { size: 41, total: 5 },
              { size: 42, total: 5 },
              { size: 43, total: 5 },
              { size: 44, total: 5 },
            ]
          }
        }
      }
    }
  });

  console.log("Seed completed successfully!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
