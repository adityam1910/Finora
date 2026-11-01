from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
from .. import insights as ins
from ..auth import current_user
from ..database import get_db
from ..ml.cost_model import get_model
from ..ml.detector import get_detector
from ..models import Subscription, User
from ..schemas import DetectIn
from ..seed import seed_demo

router = APIRouter(prefix="/api", tags=["ai"])


def _subs(db, user):
    return db.scalars(select(Subscription).where(Subscription.user_id == user.id)).all()


@router.get("/insights")
def insights(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return ins.build(_subs(db, user))


@router.get("/notifications")
def notifications(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return ins.notifications(_subs(db, user))


@router.post("/detect")
def detect(body: DetectIn, user: User = Depends(current_user)):
    """Paste an email / SMS: returns whether it is a recurring payment and the extracted fields. Nothing is saved."""
    return get_detector().analyse(body.text)


@router.get("/model-metrics")
def metrics():
    return {"detector": get_detector().metrics, "cost_model": {**get_model().metrics, "feature_importance": get_model().importances()}}


@router.post("/demo/seed")
def demo(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return {"added": seed_demo(db, user)}
