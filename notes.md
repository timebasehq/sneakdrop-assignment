# Sneaker Drop — Notes

## What this is

A limited-stock (20 pairs) sale system built to survive a "thousands of people click Buy
at the same second" scenario without overselling. All the core logic — stock control,
5-minute holds, auto-expiry, waiting line, payment idempotency — lives in one small
Python file. Nothing fancy: in-memory data guarded by a single lock, and a background
loop that sweeps expired holds every few seconds.

Stack: **React (Vite) + Tailwind CSS** frontend, **FastAPI (Python)** backend. No
database — state lives in memory in the backend process. That's a deliberate
simplification for this assignment: it keeps the one rule that actually matters (never
oversell under concurrency) easy to see and explain, without a database transaction
layer in the way. It does mean stock/holds/queue reset if the backend restarts.

## Project layout

```
backend/main.py          -- the entire backend: data, logic, API routes, background sweep
backend/requirements.txt
app/                     -- the React (Vite + Tailwind) frontend
app/src/api.js           -- talks to the backend over plain fetch()
app/src/components/      -- AuthForm, Dashboard, StockStatus, HoldPanel, QueuePanel, Countdown
```

## How to run it

### 1. Backend
Requires Python 3.10+.
```
cd backend
python -m venv venv
venv\Scripts\activate        # on Windows
# source venv/bin/activate   # on Mac/Linux
pip install -r requirements.txt
uvicorn main:app --reload
```
Runs on `http://localhost:8000`.

### 2. Frontend
```
cd app
cp .env.example .env         # defaults to http://localhost:8000, change if needed
npm install
npm run dev
```
Open the printed localhost URL. Sign up with any username/password (stored in memory,
nothing real).

## How the core logic works (all in `backend/main.py`)

- **`buy_now()`** — one function, wrapped in a single `lock`. Checks the caller doesn't
  already have a hold, hasn't already bought 2 pairs, then either takes a pair (`stock_available -= 1`
  and creates a hold with a 5-minute expiry) or adds them to the `queue` list if stock is 0.
  Because the whole check-and-decrement happens inside one `with lock:` block, two
  requests arriving at the same instant can't both grab the last pair — one of them
  always executes first and finishes before the other is allowed to read `stock_available`.
- **`confirm_payment()`** — handles the fake "payment succeeded" message. Looks up
  `payment_id` in a `processed_payments` set first — if it's already there, the message
  is a duplicate and is ignored. Otherwise checks the hold is still valid (not expired,
  not already paid) before marking it paid. A message that arrives *after* the hold
  expired (late webhook) is rejected as `hold_expired` rather than re-granting the pair.
- **`release_expired_holds()`** — runs on a timer (`sweeper_loop`, every 5 seconds, started
  via FastAPI's lifespan hook). Finds holds past their `expires_at`, expires them, and
  for each one either promotes the next person in `queue` (giving them a fresh hold) or
  puts the pair back into `stock_available` if nobody's waiting.
- **`get_status()`** — what the frontend polls every 2 seconds: current stock, the
  caller's own hold (with countdown), or their queue position, plus a `sold_out` flag
  (stock is 0 AND nobody is holding AND nobody is queued — i.e. every pair has actually
  been paid for and nothing will ever free up).
- **`leave_queue()`** — removes the caller from `queue` if they're in it. Called both by
  an explicit "Leave queue" button and, best-effort, via a `beforeunload` handler in the
  frontend when someone closes the tab while queued — so people behind them don't wait
  on a slot that was never coming. (Best-effort because tab-close network calls aren't
  guaranteed to land; if it's missed, that user simply stays queued until they'd have
  been promoted anyway, at which point the next `buy_now`/refresh cycle just skips them
  — no pair is lost either way.)
- **`logout()`** — called by the frontend's "Sign out" button before clearing the local
  session. If the caller is holding a pair, it's released immediately via the same
  `_release_hold()` helper the expiry sweep uses (promotes the next queued person, or
  returns the pair to stock if nobody's waiting) — so logging out while holding doesn't
  sit on a pair for the full 5 minutes. Also drops them from `queue` if they were waiting,
  and invalidates their session token.

## Fake payment

There's no real payment gateway and no separate webhook script. In the browser, the
"Pay now" button simulates the payment provider's callback directly: it generates a
random payment ID, shows a plain `alert("Payment succeeded")`, then calls
`POST /confirm_payment` with that ID.

## Known simplifications (by design)

- In-memory storage, single process — fine for this assignment's scope (20 items), not
  meant to survive a restart or scale past one process.
- Auth is intentionally minimal: username/password stored in plain memory, a random
  token issued on login, no hashing/JWT — enough to give each user a stable identity for
  enforcing "1 hold, max 2 pairs," not meant to be production security.
- No real payment integration, no separate fake-payment microservice — simulated
  in-browser instead.

## Manually testing the hard cases

- **Overselling**: sign up several users (or script it) and call `POST /buy` concurrently
  with stock at 20 — exactly 20 should get `status: holding`, the rest `status: queued`,
  and `stock_available` should never go negative.
- **Expiry + auto-promotion**: get a hold, wait 5 minutes (or lower `HOLD_SECONDS` in
  `main.py` for faster testing), confirm the next queued user automatically gets a fresh
  hold once the sweep runs.
- **Duplicate/late payment**: click "Pay now" then resend the same payment ID — the
  second call reports `already_processed`. Let a hold expire, then try paying its old
  hold ID — reports `hold_expired`.
- **Limits**: try buying a 3rd pair after 2 successful purchases (rejected), or clicking
  Buy Now twice while already holding (rejected).
- **Sold out**: drive stock to 0 with no one queued or holding — `/status` returns
  `sold_out: true` and the UI shows "Out of stock." instead of the Buy Now button.
