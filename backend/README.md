# Sneakdrop Backend MVP

This is the standalone Node.js, Express, and TypeScript backend for the Sneakdrop limited-sneaker e-commerce MVP. It focuses on absolute concurrency safety, preventing overselling even under heavy load.

## Features

- **Robust Reservation Engine**: Uses database row locking (via raw PostgreSQL `FOR UPDATE`) to ensure zero overselling.
- **Idempotent Fake Payment Simulator**: Handles duplicate payments, out of order payments, and prevents an expired reservation from being resurrected.
- **Strict FIFO Waitlist Engine**: Safely allocates inventory to waitlist users when a reservation expires.
- **Node-Cron Expiration Worker**: Automatically cleans up expired reservations and manages waitlist processing asynchronously.
- **Socket.IO Real-time Events**: Emits `inventory.updated`, `reservation.created`, `reservation.expired`, `reservation.allocated`, and `order.completed` events.
- **PostgreSQL + Prisma**: Database forms the authoritative state of inventory and orders.

## Installation

1. Create a PostgreSQL database (e.g. `sneakdrop`).
2. Copy `.env.example` to `.env` and fill in your details (especially `DATABASE_URL`).
3. Install dependencies:
   ```bash
   npm install
   ```
4. Generate the Prisma Client and migrate the database:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```
5. Seed the database (creates 1 admin, 1 test user, and limited sneaker products):
   ```bash
   npm run prisma:seed
   ```

## Start Server

### Development
```bash
npm run dev
```
Runs on `http://localhost:4000`.

### Production
```bash
npm run build
npm run start
```

## Testing

Run business logic and heavy concurrency load tests using Vitest:

```bash
npm run test
```

## API Endpoints

### Auth
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Products & Inventory
- `GET /api/products` (Formatted product data)
- `GET /api/inventory` (Available sizes, sold, reserved data)

### Reservations
- `POST /api/reservations` - Requires Auth. Expects `{ productId, size }`. Allocates inventory or places user in waitlist.

### Payments
- `POST /api/payments/simulate` - Requires Auth. Expects `{ reservationId, dummyCard }`. Completes payment and finalizes order.

### Admin
- `GET /api/admin/inventory` - Requires Admin Auth.
- `PATCH /api/admin/inventory/:id` - Requires Admin Auth. Expects `{ total: number }`.

## Connecting to the Frontend
The frontend should be running on `http://localhost:3000`. Ensure that `FRONTEND_URL` in the `.env` file matches exactly.

Changes to make on the frontend:
- Setup Socket.IO client pointing to `http://localhost:4000` to listen for inventory updates.
- Refactor the current `POST /api/buy` endpoint in the frontend Next.js API routes to proxy/direct requests to the backend `POST /api/reservations` and `POST /api/payments/simulate`.
- Use the actual backend session cookies for auth (`Credentials: true` is configured in CORS).
- Product listing shouldn't use `data/mock.ts` anymore, instead fetch from `GET /api/products`.
