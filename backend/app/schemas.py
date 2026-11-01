from datetime import date
from typing import Literal
from pydantic import BaseModel, Field, field_validator

Cycle = Literal["weekly", "monthly", "quarterly", "yearly"]
CATEGORIES = ["Entertainment", "Music", "Productivity", "Cloud", "Fitness", "Education", "Insurance", "Finance", "News", "Gaming", "Utilities", "Other"]


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=128)
    phone: str | None = None


class LoginIn(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    user: UserOut


class SubscriptionIn(BaseModel):
    service_name: str = Field(min_length=1, max_length=120)
    category: str = "Other"
    amount: float = Field(gt=0, lt=10_000_000)
    billing_cycle: Cycle = "monthly"
    next_due_date: date
    usage_per_month: float | None = Field(default=None, ge=0)
    last_used_date: date | None = None
    price_hike_pct: float = Field(default=0.0, ge=0, le=500)
    members: int = Field(default=1, ge=1, le=50)

    @field_validator("category")
    @classmethod
    def _cat(cls, v: str) -> str:
        return v if v in CATEGORIES else "Other"


class SubscriptionOut(SubscriptionIn):
    id: int
    status: str
    start_date: date
    model_config = {"from_attributes": True}


class PayIn(BaseModel):
    mode_of_payment: str = "UPI"


class DetectIn(BaseModel):
    text: str = Field(min_length=5, max_length=5000)
