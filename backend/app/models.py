from datetime import date, datetime
from sqlalchemy import String, Integer, Float, Date, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    account_status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    subscriptions: Mapped[list["Subscription"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    plan: Mapped[str] = mapped_column(String(20), default="free")
    

class Subscription(Base):
    __tablename__ = "subscriptions"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    service_name: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(40), default="Other")
    amount: Mapped[float] = mapped_column(Float)
    billing_cycle: Mapped[str] = mapped_column(String(20), default="monthly")  # weekly|monthly|quarterly|yearly
    next_due_date: Mapped[date] = mapped_column(Date)
    start_date: Mapped[date] = mapped_column(Date, default=date.today)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active|cancelled
    usage_per_month: Mapped[float | None] = mapped_column(Float, nullable=True)  # user-supplied sessions/month
    last_used_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    price_hike_pct: Mapped[float] = mapped_column(Float, default=0.0)  # % increase since signup
    members: Mapped[int] = mapped_column(Integer, default=1)  # people sharing the cost
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    user: Mapped[User] = relationship(back_populates="subscriptions")
    payments: Mapped[list["Payment"]] = relationship(back_populates="subscription", cascade="all, delete-orphan")


class Payment(Base):
    """TransactionHistory entity from the ER diagram."""
    __tablename__ = "payments"
    id: Mapped[int] = mapped_column(primary_key=True)
    subscription_id: Mapped[int] = mapped_column(ForeignKey("subscriptions.id"), index=True)
    date_paid: Mapped[date] = mapped_column(Date)
    amount: Mapped[float] = mapped_column(Float)
    mode_of_payment: Mapped[str] = mapped_column(String(30), default="UPI")
    subscription: Mapped[Subscription] = relationship(back_populates="payments")
