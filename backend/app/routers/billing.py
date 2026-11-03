import hashlib, hmac, json,  os, time
import razorpay # type: ignore
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..auth import current_user
from ..database import get_db
from ..models import User

WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET")
KEY_ID = os.getenv("RAZORPAY_KEY_ID")
KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")
client = razorpay.Client(auth=(KEY_ID, KEY_SECRET)) if KEY_ID and KEY_SECRET else None
PRO_PRICE_PAISE = 14900  # ₹149, amounts are in paise

router = APIRouter(prefix="/api/billing", tags=["billing"])

@router.post("/create-order")
def create_order(user: User = Depends(current_user)):
    if client is None:
        raise HTTPException(503, "Payments are not configured.")
    order = client.order.create({
        "amount": PRO_PRICE_PAISE, "currency": "INR",
        "receipt": f"pro-{user.id}-{int(time.time())}",
        "notes": {"user_id": str(user.id)},
    })
    return {"order_id": order["id"], "amount": order["amount"], "currency": order["currency"], "key_id": KEY_ID}

class VerifyIn(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

@router.post("/verify")
def verify(body: VerifyIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    expected = hmac.new(KEY_SECRET.encode(), f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, body.razorpay_signature):
        raise HTTPException(400, "Payment verification failed.")
    if client.order.fetch(body.razorpay_order_id)["notes"].get("user_id") != str(user.id):
        raise HTTPException(403, "This order belongs to another account.")
    user.plan = "pro"
    db.commit()
    return {"plan": "pro"}
@router.post("/webhook")
async def webhook(request: Request, x_razorpay_signature: str = Header(None), db: Session = Depends(get_db)):
    raw = await request.body()  # the signature is computed on the raw body
    if not WEBHOOK_SECRET or not x_razorpay_signature:
        raise HTTPException(400, "Webhook is not configured.")
    expected = hmac.new(WEBHOOK_SECRET.encode(), raw, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, x_razorpay_signature):
        raise HTTPException(400, "Invalid signature.")
    event = json.loads(raw)
    if event.get("event") == "order.paid":
        notes = event["payload"]["order"]["entity"].get("notes", {})
        user_id = notes.get("user_id")
        if user_id:
            user = db.get(User, int(user_id))
            if user:
                user.plan = "pro"
                db.commit()
    return {"ok": True}
