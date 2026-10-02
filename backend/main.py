import asyncio
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from threading import Lock

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

HOLD_SECONDS = 5 * 60
MAX_PAIRS_PER_USER = 2
TOTAL_STOCK = 1
SWEEP_INTERVAL_SECONDS = 5


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(sweeper_loop())
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

lock = Lock()

# username -> {"password": str}
users = {}
# token -> username
sessions = {}

stock_available = TOTAL_STOCK
# hold_id -> {"username": str, "status": "holding"|"paid"|"expired", "expires_at": datetime}
holds = {}
# username -> hold_id, only while status == "holding"
active_hold_by_user = {}
# list of usernames, in line order (FIFO)
queue = []
# username -> count of pairs actually paid for
purchased_count = {}
# payment_ids we've already acted on, so duplicates are a no-op
processed_payments = set()


# ---------- request/response models ----------

class Credentials(BaseModel):
    username: str
    password: str


class ConfirmPaymentBody(BaseModel):
    hold_id: str
    payment_id: str


# ---------- auth helpers ----------

def get_current_user(authorization: str = Header(default="")) -> str:
    token = authorization.removeprefix("Bearer ").strip()
    username = sessions.get(token)
    if not username:
        raise HTTPException(status_code=401, detail="not authenticated")
    return username


@app.post("/signup")
def signup(body: Credentials):
    if body.username in users:
        raise HTTPException(status_code=400, detail="username already taken")
    users[body.username] = {"password": body.password}
    purchased_count[body.username] = 0
    token = str(uuid.uuid4())
    sessions[token] = body.username
    return {"token": token}


@app.post("/login")
def login(body: Credentials):
    user = users.get(body.username)
    if not user or user["password"] != body.password:
        raise HTTPException(status_code=401, detail="wrong username or password")
    token = str(uuid.uuid4())
    sessions[token] = body.username
    return {"token": token}


# ---------- core logic ----------

def _queue_position(username: str) -> int | None:
    if username not in queue:
        return None
    return queue.index(username) + 1


@app.get("/status")
def get_status(authorization: str = Header(default="")):
    username = get_current_user(authorization)
    with lock:
        hold_id = active_hold_by_user.get(username)
        hold_info = None
        if hold_id:
            h = holds[hold_id]
            hold_info = {"id": hold_id, "expires_at": h["expires_at"]}

        return {
            "available": stock_available,
            "purchased_count": purchased_count.get(username, 0),
            "hold": hold_info,
            "queue_position": _queue_position(username),
            "sold_out": stock_available == 0 and not active_hold_by_user and not queue,
        }


@app.post("/buy")
def buy_now(authorization: str = Header(default="")):
    global stock_available
    username = get_current_user(authorization)

    with lock:
        if username in active_hold_by_user:
            return {"status": "already_holding"}

        if purchased_count.get(username, 0) >= MAX_PAIRS_PER_USER:
            return {"status": "limit_reached"}

        if username in queue:
            return {"status": "queued", "position": _queue_position(username)}

        if stock_available > 0:
            stock_available -= 1
            hold_id = str(uuid.uuid4())
            expires_at = datetime.now(timezone.utc) + timedelta(seconds=HOLD_SECONDS)
            holds[hold_id] = {"username": username, "status": "holding", "expires_at": expires_at}
            active_hold_by_user[username] = hold_id
            return {"status": "holding", "hold_id": hold_id, "expires_at": expires_at}

        queue.append(username)
        return {"status": "queued", "position": _queue_position(username)}


@app.post("/confirm_payment")
def confirm_payment(body: ConfirmPaymentBody, authorization: str = Header(default="")):
    username = get_current_user(authorization)

    with lock:
        if body.payment_id in processed_payments:
            return {"status": "already_processed"}

        hold = holds.get(body.hold_id)
        valid = (
            hold is not None
            and hold["username"] == username
            and hold["status"] == "holding"
            and hold["expires_at"] >= datetime.now(timezone.utc)
        )

        processed_payments.add(body.payment_id)

        if not valid:
            return {"status": "hold_expired"}

        hold["status"] = "paid"
        purchased_count[username] = purchased_count.get(username, 0) + 1
        del active_hold_by_user[username]
        return {"status": "paid"}


@app.post("/leave_queue")
def leave_queue(authorization: str = Header(default="")):
    username = get_current_user(authorization)
    with lock:
        if username in queue:
            queue.remove(username)
            return {"status": "left"}
        return {"status": "not_in_queue"}


@app.post("/logout")
def logout(authorization: str = Header(default="")):
    username = get_current_user(authorization)
    token = authorization.removeprefix("Bearer ").strip()
    with lock:
        _release_hold(username)
        if username in queue:
            queue.remove(username)
        sessions.pop(token, None)
    return {"status": "logged_out"}


def _release_hold(username: str):
    """Give up a user's active hold: promote the next queued person into it,
    or hand the pair back to stock if nobody's waiting. Caller must hold `lock`."""
    global stock_available
    hold_id = active_hold_by_user.pop(username, None)
    if not hold_id:
        return
    holds[hold_id]["status"] = "expired"

    if queue:
        next_user = queue.pop(0)
        new_hold_id = str(uuid.uuid4())
        holds[new_hold_id] = {
            "username": next_user,
            "status": "holding",
            "expires_at": datetime.now(timezone.utc) + timedelta(seconds=HOLD_SECONDS),
        }
        active_hold_by_user[next_user] = new_hold_id
    else:
        stock_available += 1


def release_expired_holds():
    """Expire holds past their 5 minutes; give the pair to the next person
    in line (fresh 5 minutes), or back to stock if nobody is waiting."""
    now = datetime.now(timezone.utc)

    with lock:
        expired_usernames = [
            h["username"]
            for h in holds.values()
            if h["status"] == "holding" and h["expires_at"] < now
        ]
        for username in expired_usernames:
            _release_hold(username)


async def sweeper_loop():
    while True:
        await asyncio.sleep(SWEEP_INTERVAL_SECONDS)
        release_expired_holds()
