# SneakDrop System - Architecture & Technical Documentation

## 1. Overview
SneakDrop is a high-concurrency, fault-tolerant reservation and order processing system designed for ultra-high-demand, limited-stock drops (e.g., 20 pairs of sneakers released to thousands of simultaneous buyers).

The system strictly enforces the business rules:
- **Total Stock Limit**: Exactly 20 pairs total. Never oversells even under thousands of concurrent requests.
- **5-Minute Hold**: Clicking **BUY** grants an active reservation for 300 seconds (5 minutes).
- **User Limits**: Maximum 1 active hold at a time; maximum 2 total completed purchases per user.
- **FIFO Waiting Line**: When available stock is 0, users join a strict FIFO queue. When any hold expires or is cancelled, the first person in line automatically receives that pair with a new 5-minute hold.
- **Unreliable Payment Handling**: Idempotent webhook processing, late payment handling (expired holds), duplicate event protection, and out-of-order sequence resolution.
- **Live Reactive Dashboard**: Displays real-time stock, hold countdown (`04:32 remaining`), waiting line position, and an interactive payment simulation tool.

---

## 2. Requirements & Setup

### Requirements
- **Node.js**: `v20.x` or `v22.x` (Recommended: `v22.23.3` or `v20.x`)
- **npm**: `10.x` or higher
- **OS**: Linux, macOS, or Windows
- **Database**: SQLite with WAL (`Write-Ahead Logging`) mode (embedded, zero external DB configuration required).

### Installation
```bash
# Clone or fork the repository
cd sneakdrop-assignment

# Install all workspace dependencies
npm install
```

### Starting the Applications

There is a single process. The API server also serves the UI, so there is no second dev server to launch and nothing to run on port 3000.

#### 1. Seed / Reset Initial Data
```bash
npm run seed
```

#### 2. Start the Application
```bash
npm run dev
# API and UI are both served at http://localhost:3001
# Open http://localhost:3001 in a browser
# Background expiration worker starts automatically
```

`npm run dev:api` starts the same server without the workspace wrapper if you prefer it.

#### 3. Run Unreliable Payment Simulation Script
```bash
npm run simulate:payments
```

---

## 3. Running the Test Suites

The test suite covers Unit, Integration, and Concurrency tests:

```bash
# Run all tests
npm test

# Run specific test suites:
npm run test:unit            # Tests reservation logic, queue logic, payment idempotency
npm run test:integration     # Tests end-to-end purchase flow, hold expiry, queue promotion
npm run test:concurrency     # Tests 100 simultaneous buys & concurrent duplicate payments
```

---

## 4. Architecture & Technical Design

### Project Structure
```text
sneakdrop-assignment/
├── README.md
├── NOTES.md
├── package.json
├── .env.example
├── .gitignore
├── docker-compose.yml
│
├── apps/
│   ├── web/                         # Frontend (Next.js / React)
│   │   ├── src/
│   │   │   ├── app/                 # Pages and global styles
│   │   │   ├── components/          # StockStatus, HoldCountdown, QueuePosition, PaymentStatus, SneakerDrop
│   │   │   ├── lib/api.ts           # API client
│   │   │   └── types/               # Type definitions
│   │   └── package.json
│   │
│   └── api/                         # Backend (Express / TypeScript / SQLite WAL)
│       ├── src/
│       │   ├── server.ts            # Server entrypoint & route registration
│       │   ├── routes/              # inventory, reservations, queue, orders, payments
│       │   ├── services/            # reservation, queue, order, payment, inventory services
│       │   ├── workers/             # reservation-expiry.worker.ts (5-min hold background worker)
│       │   ├── db/                  # client.ts, schema.ts
│       │   ├── middleware/          # error-handler.ts
│       │   └── types/               # Database row interfaces
│       └── package.json
│
├── packages/
│   └── shared/                      # Shared types, interfaces, constants (HOLD_DURATION, MAX_PURCHASES)
│       ├── src/
│       │   ├── types.ts
│       │   ├── constants.ts
│       │   └── index.ts
│       └── package.json
│
├── tests/
│   ├── unit/                        # reservation.test.ts, queue.test.ts, payment.test.ts
│   ├── integration/                 # purchase-flow.test.ts, queue-flow.test.ts, hold-expiry.test.ts
│   └── concurrency/                 # simultaneous-buy.test.ts, duplicate-payment.test.ts
│
└── scripts/
    ├── seed.ts                      # Seeds 20 pairs and test users
    └── simulate-payment.ts          # Simulates late, duplicate, and out-of-order payment events
```

---

## 5. Core Concurrency & Business Logic Solutions

### 1. Preventing Overselling Under High Concurrency
- **Problem**: When 5,000 users click Buy at the exact same millisecond, simple application-level checks (`if (stock > 0)`) cause race conditions and overselling.
- **Solution**:
  1. All reservation and stock operations run inside **atomic SQLite `IMMEDIATE` transactions** in **WAL mode**.
  2. Available stock is calculated dynamically and atomically inside the database transaction:
     $$\text{Available Stock} = \text{Total Stock} - \text{Sold Stock} - \text{Active Non-Expired Holds}$$
  3. Strict database check constraints guarantee `sold_stock <= total_stock` and `purchased_count <= 2`.
  4. Tested with 100 simultaneous concurrent HTTP requests: exactly 5 succeed when 5 pairs remain; all 95 other users are queued in strict FIFO order with zero overselling.

### 2. 5-Minute Hold & Automatic Queue Promotion
- When a user reserves a pair, `reservations` records an `expires_at = datetime('now', '+300 seconds')`.
- A background worker (`ReservationExpiryWorker`) scans for expired holds every 1,000ms.
- When an active hold expires or is cancelled:
  1. The reservation is marked `EXPIRED` or `CANCELLED`.
  2. Any pending order for that reservation is marked `EXPIRED`.
  3. The `QueueService.promoteNext(itemId)` method atomically selects the earliest waiting user (`ORDER BY created_at ASC, id ASC LIMIT 1`) with fewer than 2 purchases.
  4. The selected queue entry is marked `PROMOTED` and given a fresh active 5-minute hold.

### 3. Handling Unreliable Payment Events
The fake payment service handles all real-world webhook edge cases:
- **Idempotency & Duplicate Webhooks**: Webhook payloads contain a unique `eventId`. When a duplicate webhook arrives, the system checks `payment_events` table and returns the existing result immediately without re-processing, double-charging, or decrementing stock twice.
- **Delayed / Late Events**: If a payment event arrives after the user's 5-minute hold has expired and the pair was given to another buyer, the payment processor detects `isExpired` and safely rejects the order with `OrderStatus.EXPIRED` without exceeding total inventory.
- **Out-of-Order Events**: Every event payload carries a `sequenceNumber`. If a later state (e.g., `sequence 2` / `PAID`) was already processed, an older delayed event (e.g., `sequence 1` / `FAILED`) is rejected and cannot revert a completed purchase.

---

## 6. Screen Recordings

All recordings are committed under [`assets/`](./assets). Each link below is a direct play link — on GitHub a click opens the built-in video player for the file, and read locally it opens in your system video player. (GitHub strips `<video>` tags from markdown, so click-to-play links are the format that actually works there.)

`assets/intro.mp4` is the submission recording: it walks through what was built, the architecture, how inventory reservation stops two users buying the same pair, the 5-minute hold, the FIFO waiting queue and automatic promotion, how delayed / duplicate / out-of-order payment events are handled, and how the system was tested.

### Main Walkthrough

| Play | Duration | Covers |
| --- | --- | --- |
| [▶ intro.mp4](./assets/intro.mp4) | 5:00 | The full explanation: what was built, architecture, how inventory reservation prevents two users buying the same pair, the 5-minute hold, the FIFO waiting queue and automatic promotion, how delayed/duplicate/out-of-order payment events are handled, and how the system was tested |

### Supporting Demos

| Play | Duration | Command / Flow Shown |
| --- | --- | --- |
| [▶ seed.mp4](./assets/seed.mp4) | 0:11 | `npm run seed` — initialises 20 pairs and demo users |
| [▶ unit_test.mp4](./assets/unit_test.mp4) | 0:09 | `npm run test:unit` — reservation, queue, payment idempotency |
| [▶ integration_test.mp4](./assets/integration_test.mp4) | 0:10 | `npm run test:integration` — purchase flow, hold expiry, queue promotion |
| [▶ concurrency_tests.mp4](./assets/concurrency_tests.mp4) | 0:07 | `npm run test:concurrency` — simultaneous Buy and duplicate payment races |
| [▶ all_tests.mp4](./assets/all_tests.mp4) | 0:15 | `npm test` — the complete suite (18 tests, 8 suites) |
| [▶ payments.mp4](./assets/payments.mp4) | 0:11 | Payment webhook completing a purchase |
| [▶ payments_simulation.mp4](./assets/payments_simulation.mp4) | 0:10 | `npm run simulate:payments` — duplicate, delayed and out-of-order events |

Each clip maps to the section of this document it demonstrates:

- `concurrency_tests.mp4` → [Section 5.1](#1-preventing-overselling-under-high-concurrency)
- `unit_test.mp4`, `integration_test.mp4` → [Section 5.2](#2-5-minute-hold--automatic-queue-promotion)
- `payments.mp4`, `payments_simulation.mp4` → [Section 5.3](#3-handling-unreliable-payment-events)

> `README.md` is the original assignment brief and is left unmodified; all project documentation and submission notes live in this file.
