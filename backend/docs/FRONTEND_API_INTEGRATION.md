# Frontend API Integration Contract

## 1. Base URL
**Local**: `http://localhost:4000`

## 2. Authentication
- **Mechanism**: JWT stored in an HTTP-only cookie.
- **Cookie Name**: `sneakdrop_session` (configurable via `COOKIE_NAME` env var).
- **Credentials**: The frontend must send requests with `credentials: "include"` (or Axios equivalent) to pass the cookie. Do not expose JWTs to `localStorage`.
- **Roles**: `CUSTOMER`, `ADMIN`.

## 3. CORS/Credentials
- **Allowed Origin**: `http://localhost:3000` (configurable via `FRONTEND_URL` env var).
- **Credentials**: `credentials: true` is enabled on the backend. Do not weaken CORS to `origin: "*"`.

## 4. API Endpoint Table

| Method | Endpoint | Auth Required | Purpose |
|--------|----------|---------------|---------|
| GET | `/health` | No | Check API health |
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login and receive cookie |
| POST | `/api/auth/logout` | No | Clear auth cookie |
| GET | `/api/auth/me` | Yes | Get current user info |
| GET | `/api/products` | No | List all products w/ variants & inventory |
| GET | `/api/inventory` | No | List inventory items |
| POST | `/api/reservations` | Yes | Reserve a shoe size |
| POST | `/api/payments/simulate` | Yes | Simulate payment for a reservation |
| GET | `/api/admin/inventory` | Yes (Admin) | Get inventory items for admin |
| PATCH | `/api/admin/inventory/:id`| Yes (Admin) | Update total inventory count |

## 5. Request Examples

### Auth
**POST `/api/auth/login`**
```json
{ "username": "user", "password": "password" }
```

### Reservations
**POST `/api/reservations`**
```json
{ "productId": "uuid-of-product", "size": 9 }
```

### Payments
**POST `/api/payments/simulate`**
```json
{ "reservationId": "uuid-of-reservation" }
```

### Admin
**PATCH `/api/admin/inventory/:id`**
```json
{ "total": 100 }
```

## 6. Response Examples

### Auth
**Success (200) `POST /api/auth/login` & `GET /api/auth/me`**
```json
{ "success": true, "user": { "id": "uuid", "username": "user", "role": "CUSTOMER" } }
```

### Products
**Success (200) `GET /api/products`**
```json
{
  "success": true,
  "products": [
    {
      "id": "uuid",
      "brand": "Brand",
      "title": "Title",
      "price": 200,
      "images": ["url1"],
      "variants": [{ "id": "uuid", "image": "url", "thumbnail": "url" }],
      "sizes": [9, 10, 11],
      "composition": [{ "name": "POLYAMIDE", "value": 100 }],
      "description": "Desc",
      "statusColor": "red"
    }
  ]
}
```

### Inventory
**Success (200) `GET /api/inventory`**
```json
{
  "success": true,
  "inventory": [
    {
      "id": "uuid",
      "productTitle": "Shoe",
      "size": 9,
      "total": 100,
      "reserved": 10,
      "sold": 50,
      "available": 40
    }
  ]
}
```

### Reservations
**Success (200) `POST /api/reservations`**
```json
{
  "success": true,
  "reservationId": "uuid",
  "expiresAt": "2026-09-30T10:05:00.000Z",
  "serverTime": "2026-09-30T10:00:00.000Z"
}
```

## 7. Error Format
All errors follow a standard format.
```json
{ "success": false, "error": "Error message description" }
```
Validation errors include a `details` array.
- **401**: Invalid credentials / Unauthorized
- **403**: Forbidden / Purchase limit reached
- **404**: Not found
- **409**: Conflict (e.g., User already has an active reservation / Joined waitlist)

## 8. Reservation Lifecycle
- User selects a size and calls `POST /api/reservations`.
- Backend atomically allocates inventory and returns `expiresAt`.
- Frontend displays countdown based **only** on the backend-provided `expiresAt`. The frontend must NEVER calculate the expiration independently.
- If the user pays before `expiresAt`, `POST /api/payments/simulate` processes it.
- If the reservation expires, the backend worker marks it `EXPIRED`.

## 9. Payment Lifecycle
- The payment simulation endpoint `POST /api/payments/simulate` is idempotent. It returns the existing `orderId` if previously successful.
- Payment succeeds only if `expiresAt > NOW()` checked within the database transaction. It is race-safe against the expiration worker.
- Duplicate payments return success without charging again.

## 10. Waitlist Lifecycle
- Triggered automatically if a reservation request finds `0` available stock (`POST /api/reservations` returns 409 and joins waitlist).
- FIFO ordering is enforced exclusively by the backend/database.
- **Currently**, the frontend cannot determine waitlist status, position, or allocation directly via REST. (Identified as a required fix).

## 11. Socket.IO Events
- **Connection URL**: `http://localhost:4000`
- **Authentication**: Currently unauthenticated (Identified as a required fix).
- **Events emitted by backend**:
  - `inventory.updated`: Payload `{ inventoryId: string }`
  - `reservation.created`: Payload `{ reservationId: string }`
  - `reservation.expired`: Payload `{ reservationId: string }`
  - `waitlist.updated`: Payload `{ waitlistId: string }`
  - `reservation.allocated`: Payload `{ reservationId: string }`
  - `order.completed`: Payload `{ orderId: string }`
- Socket.IO is for **realtime UI updates only**, not for transactional correctness.

## 12. Frontend Responsibilities
- Include `credentials: "include"` on all requests.
- Read `available` stock directly from `GET /api/inventory` (do not calculate manually).
- Drive UI countdown using the backend's `expiresAt`.
- Handle predictable HTTP errors gracefully (e.g., redirecting to waitlist UI on 409).
- Use Socket.IO strictly for updating the UI state, relying on REST for actual user actions.

## 13. Backend Responsibilities
- Act as the sole authoritative source of truth for: inventory quantity, reservation state/expiration, user identity, purchase count, waitlist position, and payment status.
- Ensure strict FIFO ordering for waitlist allocations.
- Enforce purchase limits and active reservation limits per user.

## 14. Important Concurrency Rules
- `total - sold - reserved >= 0` is strictly enforced by the database at the row level (`$queryRaw`).
- The admin API never permits `total < sold + reserved`.
- The partial unique index for `userId WHERE status = ACTIVE` is required to ensure concurrent request safety for user limits (Identified as a required fix).

## 15. Environment Variables Required by Frontend
`.env.local` must include:
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```
