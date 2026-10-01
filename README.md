# Sneakdrop

## Submission Requirements

- **Source Code:** This repository contains both the frontend and backend.
- **Setup Instructions:** See [`NOTES.md`](./NOTES.md).
- **Project Walkthrough:** [Watch the Loom Recording](https://www.loom.com/share/abce1f2bac0d4679a0cc869fdaf551f8)

> `NOTES.md` contains the complete instructions for running the frontend, backend, database, environment variables, and other project requirements.

---

## Overview

Sneakdrop is a full-stack, limited-edition sneaker e-commerce system designed specifically to solve the complex concurrency challenges of high-demand product drops. When the brand releases 20 pairs of special-edition sneakers, thousands of users might attempt to purchase them simultaneously. This system guarantees fair, race-safe, and consistent inventory allocation.

## Core Technical Approach

The foundational principle of this architecture is:

> **PostgreSQL is the single source of truth for inventory and critical business state.**

The frontend acts purely as a presentation layer and is never trusted as the authority for inventory, reservation validity, or payment state.

### High-Level Data Flow
```text
Next.js Frontend
        ↓
REST API (HTTP)
        ↓
Express + TypeScript Backend
        ↓
Prisma ORM
        ↓
PostgreSQL
```

### Real-time Synchronization
```text
Backend (Socket.IO)
        ↓
Real-time Frontend Updates
```

Each layer has a distinct responsibility. The database handles strict constraints and transactions, the backend processes business logic and validates requests, and the frontend consumes real-time state to provide a seamless user experience.

## Problem & Solution Implementation

Building a high-concurrency reservation system requires mitigating race conditions and ensuring data consistency. Here is how the major challenges were addressed:

### 1. Preventing Overselling Under High Concurrency
With only 20 pairs available and thousands of simultaneous requests, a naive read-then-update approach would oversell inventory.
**Solution:** The system relies on PostgreSQL as the source of truth, performing atomic, conditional inventory updates via Prisma. A reservation only succeeds if `total - sold - reserved > 0`. This strictly protects the invariant: `reserved + sold <= total`. 

### 2. Temporary Reservation Model
Users who successfully secure a pair do not immediately own them; they are granted a temporary reservation. The reservation is marked as `ACTIVE` with a backend-controlled `expiresAt` timestamp. The frontend merely displays a countdown based on this timestamp.

### 3. Reservation Expiration
Unpaid reservations must eventually expire to release inventory for other users.
**Solution:** A background `node-cron` worker continuously polls for expired reservations. When found, it transitions their status to `EXPIRED`, decrements the reserved inventory count, and automatically triggers the waitlist allocation process.

### 4. Enforcing One Active Reservation Per User
To prevent a single user from hoarding inventory across concurrent requests, the system implements a PostgreSQL partial unique index on the `Reservation` table for `userId` `WHERE status = 'ACTIVE'`. This guarantees at the database level that no user can hold more than one active reservation simultaneously.

### 5. Purchase Limits
The brand restricts each user to a maximum of two completed purchases. The backend validates the user's completed order history transactionally before allowing any new reservations or purchases to proceed.

### 6. Handling Sold-Out Inventory
Once the atomic inventory calculation (`total - sold - reserved = 0`) determines that no pairs remain, the database rejects further allocations. At this point, the backend gracefully transitions subsequent users into a waitlist.

### 7. FIFO Waitlist
Users who miss the initial drop can join a waitlist. The system uses `createdAt` ordering to maintain strict First-In-First-Out (FIFO) behavior. To prevent race conditions when allocating from the waitlist, the backend utilizes PostgreSQL row locking (`FOR UPDATE SKIP LOCKED`).

### 8. Automatic Waitlist Allocation
When an active reservation expires and inventory is released, the system automatically selects the next eligible waitlist user, creates a new `ACTIVE` reservation for them, and assigns a fresh expiration timestamp.

### 9. Late Payment Protection
A user attempting to complete a payment after their countdown has ended must be rejected. Payment endpoints strictly validate against the actual database state (`status = ACTIVE` AND `expiresAt > NOW()`). Expired reservations cannot be resurrected.

### 10. Duplicate Payment Handling
To ensure a single payment event doesn't trigger multiple completed orders, payment processing is idempotent. The system persists payment event identifiers (`PaymentEvent` model) to track and reject duplicate webhook/payment events.

### 11. Payment vs. Expiration Race Conditions
If a user pays at the exact millisecond the expiration worker runs, the system resolves the race by relying exclusively on transactional database state rather than the frontend timer.

### 12. Real-Time UI Updates
The application uses Socket.IO to broadcast crucial state changes instantly. Events such as `reservation.created`, `reservation.expired`, `inventory.updated`, `waitlist.updated`, and `order.completed` keep the client synchronized. Socket.IO acts as a synchronization mechanism, not the source of inventory truth.

### 13. Socket Security
Socket connections are authenticated, and users are assigned to user-specific rooms. This ensures private events (like a user's reservation expiring) are only broadcast to the correct client.

### 14. Frontend as a Presentation Layer
The frontend is strictly a presentation layer. It does not determine inventory availability, reservation validity, payment validity, purchase limits, or the final order state.

### 15. Database Consistency
Data integrity is maintained through Prisma transactions, PostgreSQL constraints, atomic updates, and row-level locking.

### 16. Product and Size-Level Inventory
Inventory is tracked not just by product, but down to the specific shoe size. A product is only considered completely out of stock when all of its sizes have zero available inventory.

### 17. Concurrency Testing
The system's concurrency handling can be validated using k6 (`load-test.js`), targeting deliberately constrained inventory to ensure no overselling occurs under heavy load.

## Features

- Secure JWT Authentication
- Dynamic Product Catalog
- Size-level Inventory Tracking
- High-concurrency Temporary Reservations
- Real-time Reservation Countdown
- Simulated Idempotent Payments
- Strict Purchase Limits (Max 2 per user)
- FIFO Waitlist with Automatic Allocation
- Background Reservation Expiration Worker
- Real-time Socket.IO State Synchronization
- Admin Dashboard for Inventory Management
- Responsive, Modern UI

## Architecture

```text
Frontend
Next.js + React + TypeScript
        │
        ├── REST API
        │
        └── Socket.IO
                │
                ▼
Backend
Express + TypeScript
        │   ├── Background Worker (node-cron)
        │   └── Socket.IO Server
        ▼
Prisma ORM
        │
        ▼
PostgreSQL
        │
        └── Transactions / Constraints / Row Locks
```

## Database Design

The system relies on a structured relational schema defined in Prisma:

- **User**: Stores authentication and role data (`CUSTOMER`, `ADMIN`).
- **Product & ProductVariant**: Defines the overarching product and its specific stylistic variants (images, thumbnails).
- **ProductInventory**: The critical table tracking `total`, `reserved`, and `sold` inventory counts per specific `size`.
- **Reservation**: Tracks temporary holds on inventory. Includes `status` (`ACTIVE`, `COMPLETED`, `EXPIRED`) and `expiresAt`. Enforces one active reservation per user.
- **WaitlistEntry**: Tracks users waiting for inventory to free up.
- **Order**: Represents a completed, paid purchase.
- **PaymentEvent**: Stores idempotent payment identifiers to prevent duplicate processing.

## API Overview

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Authenticate user and receive session
- `POST /api/auth/logout` - Terminate session
- `GET /api/auth/me` - Get current user profile

### Products & Inventory
- `GET /api/products` - Retrieve all products
- `GET /api/products/:id` - Retrieve specific product details
- `GET /api/inventory/:variantId` - Get real-time inventory counts for all sizes

### Reservations
- `POST /api/reservations` - Attempt to reserve a specific sneaker size
- `GET /api/reservations/active` - Retrieve the user's currently active reservation

### Payments
- `POST /api/payments/checkout` - Submit payment for an active reservation

### Waitlist
- `POST /api/waitlist` - Join the waitlist for a specific size
- `GET /api/waitlist/status` - Check the user's current waitlist status

### Admin
- `GET /api/admin/inventory` - View system-wide inventory and allocation states
- `POST /api/admin/inventory/restock` - Adjust inventory totals

## Tech Stack

**Frontend:**
- Next.js (v16.3.6)
- React (v19)
- TypeScript
- Tailwind CSS (v4)
- HeroUI (`@heroui/react`)
- Framer Motion
- Socket.IO Client

**Backend:**
- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Socket.IO
- node-cron (Background processing)
- Vitest (Testing)
- k6 (Load Testing)

## Project Structure

```text
/
├── backend/
│   ├── prisma/             # Database schema and migrations
│   ├── src/
│   │   ├── config/         # Environment and application config
│   │   ├── middleware/     # Auth, error handling, etc.
│   │   ├── modules/        # Domain-driven feature modules (auth, reservations, etc.)
│   │   ├── workers/        # node-cron expiration workers
│   │   ├── app.ts          # Express setup
│   │   └── server.ts       # Entry point
│   ├── tests/
│   └── load-test.js        # k6 load testing script
├── sneakdrop-ps-frontend/
│   ├── app/                # Next.js App Router
│   ├── components/         # Reusable React components
│   ├── lib/                # Utility functions and Socket.IO client
│   └── ...
├── NOTES.md                # Detailed setup instructions
└── README.md               # Project documentation
```

## Local Setup

For the complete and detailed setup process, please refer to the [`NOTES.md`](./NOTES.md) file.

**Quick Start:**
1. Start PostgreSQL.
2. In `/backend`: Run `npm install`, setup `.env`, run `npm run prisma:generate`, `npm run prisma:migrate`, and `npm run dev`.
3. In `/sneakdrop-ps-frontend`: Run `pnpm install`, setup `.env.local`, and run `pnpm dev`.

## Environment Variables

### Backend (`/backend/.env`)
- `PORT`: The API port (e.g., 4000)
- `NODE_ENV`: Environment mode (`development` or `production`)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for signing authentication tokens
- `FRONTEND_URL`: CORS origin for the frontend
- `COOKIE_NAME`: Session cookie identifier
- `RESERVATION_DURATION_MINUTES`: How long a temporary hold lasts
- `INITIAL_ADMIN_USERNAME`: Default admin setup

### Frontend (`/sneakdrop-ps-frontend/.env.local`)
- `NEXT_PUBLIC_API_URL`: Points to the backend API

## Important Engineering Decisions

- **PostgreSQL as the Source of Truth:** Relying on the frontend for inventory validation is insecure and prone to race conditions. All inventory logic happens transactionally at the database layer.
- **Atomic Conditional Updates:** Using Prisma to perform updates like `total - sold - reserved > 0` directly within the SQL query ensures safety under load without requiring complex distributed locks.
- **Backend-Controlled Expiration:** The client-side countdown timer is purely cosmetic. The real expiration is determined by the backend database state and enforced by background workers.
- **Idempotent Payment Processing:** Validating payment identifiers guarantees that a network retry won't result in a user accidentally purchasing two pairs for a single request.
- **Socket.IO over Polling:** Using websockets minimizes unnecessary database reads during the high-load drop window, pushing state changes only when necessary.

## Concurrency Model

When 1,000 users attempt to reserve 20 pairs simultaneously:
1. Requests arrive concurrently at the Express backend.
2. The backend validates user eligibility (no active reservations, max purchase limits not exceeded).
3. PostgreSQL performs the atomic inventory allocation.
4. Exactly 20 pairs are successfully reserved.
5. Once `total - sold - reserved = 0`, the database safely rejects the 21st user and beyond.
6. The frontend prompts rejected users to enter the waitlist.
7. If any of the 20 successful users fail to pay before expiration, the background worker releases their inventory.
8. The worker automatically allocates the released pair to the first person in the waitlist.

## Security & Correctness

- **Authentication:** Uses HTTP-only cookies to securely store JWTs, mitigating XSS risks.
- **Real-time Security:** Socket.IO connections require authentication and utilize user-specific rooms to prevent data leakage.
- **Data Integrity:** Strict PostgreSQL constraints prevent invalid states (e.g., negative inventory).
- **Idempotency:** Payment endpoints check for existing processed payment events before acting.

## Known Limitations & Scale Considerations

- **Background Workers:** The current `node-cron` implementation runs within the Express instance. This is suitable for a single-instance MVP, but if the backend scales horizontally across multiple nodes, the workers will require distributed coordination (e.g., Redis-based locking or a dedicated job queue like BullMQ) to prevent redundant processing.
- **Waitlist Scaling:** Extremely large waitlists might require dedicated queueing infrastructure to manage efficient, locked allocation without straining the primary database.

## Demo

[Watch the Loom Recording](https://www.loom.com/share/abce1f2bac0d4679a0cc869fdaf551f8)

> A screen recording demonstrating the application flow, reservation system, concurrency handling, expiration/waitlist behavior, and technical implementation.
