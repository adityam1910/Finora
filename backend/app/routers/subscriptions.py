from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..auth import current_user
from ..database import get_db
from ..ml.renewal import advance
from ..models import Payment, Subscription, User
from ..schemas import PayIn, SubscriptionIn, SubscriptionOut

router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])


def _own(db: Session, user: User, sub_id: int) -> Subscription:
    sub = db.get(Subscription, sub_id)
    if not sub or sub.user_id != user.id:  # one user can never reach another's records
        raise HTTPException(404, "Subscription not found.")
    return sub


@router.get("", response_model=list[SubscriptionOut])
def list_subs(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return db.scalars(select(Subscription).where(Subscription.user_id == user.id).order_by(Subscription.next_due_date)).all()


@router.post("", response_model=SubscriptionOut, status_code=201)
def create(body: SubscriptionIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    sub = Subscription(user_id=user.id, **body.model_dump())
    db.add(sub); db.commit(); db.refresh(sub)
    return sub


@router.put("/{sub_id}", response_model=SubscriptionOut)
def update(sub_id: int, body: SubscriptionIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    sub = _own(db, user, sub_id)
    for k, v in body.model_dump().items():
        setattr(sub, k, v)
    db.commit(); db.refresh(sub)
    return sub


@router.post("/{sub_id}/cancel", response_model=SubscriptionOut)
def cancel(sub_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    """Marks the subscription as cancelled in Finora. The user cancels with the provider; Finora never does it for them."""
    sub = _own(db, user, sub_id)
    sub.status = "cancelled"
    db.commit(); db.refresh(sub)
    return sub


@router.post("/{sub_id}/pay", response_model=SubscriptionOut)
def mark_paid(sub_id: int, body: PayIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    sub = _own(db, user, sub_id)
    db.add(Payment(subscription_id=sub.id, date_paid=date.today(), amount=sub.amount, mode_of_payment=body.mode_of_payment))
    sub.next_due_date = advance(max(sub.next_due_date, date.today()), sub.billing_cycle)
    db.commit(); db.refresh(sub)
    return sub


@router.delete("/{sub_id}", status_code=204)
def delete(sub_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    db.delete(_own(db, user, sub_id)); db.commit()
