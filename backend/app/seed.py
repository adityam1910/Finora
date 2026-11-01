from datetime import date, timedelta
from sqlalchemy import select, func
from .ml.renewal import add_months
from .models import Payment, Subscription

# (name, category, amount, cycle, days_to_due, usage/month, days idle, hike %, members)
DEMO = [
    ("Netflix", "Entertainment", 649, "monthly", 3, 2, 41, 20, 1),
    ("Amazon Prime", "Entertainment", 1499, "yearly", 40, 6, 3, 0, 1),
    ("Disney+ Hotstar", "Entertainment", 299, "monthly", 9, 0.5, 95, 10, 1),
    ("Spotify", "Music", 119, "monthly", 1, 25, 0, 0, 1),
    ("YouTube Premium", "Music", 149, "monthly", 14, 18, 1, 0, 1),
    ("ChatGPT Plus", "Productivity", 1999, "monthly", 6, 20, 1, 0, 1),
    ("Notion", "Productivity", 800, "monthly", 22, 1, 60, 0, 1),
    ("Google One", "Cloud", 130, "monthly", 11, 30, 0, 0, 1),
    ("iCloud+", "Cloud", 75, "monthly", 17, 8, 2, 0, 1),
    ("Cult.fit", "Fitness", 1500, "monthly", 5, 1, 70, 0, 1),
    ("HDFC Life", "Insurance", 12000, "yearly", 120, None, None, 0, 1),
    ("Xbox Game Pass", "Gaming", 549, "monthly", 25, 3, 12, 0, 2),
]


def seed_demo(db, user) -> int:
    if db.scalar(select(func.count()).select_from(Subscription).where(Subscription.user_id == user.id)):
        return 0
    today = date.today()
    for name, cat, amt, cyc, due, use, idle, hike, mem in DEMO:
        step = {"monthly": 1, "yearly": 12}[cyc]
        sub = Subscription(user_id=user.id, service_name=name, category=cat, amount=amt, billing_cycle=cyc,
                           next_due_date=today + timedelta(days=due), start_date=add_months(today, -14),
                           usage_per_month=use, last_used_date=(today - timedelta(days=idle)) if idle is not None else None,
                           price_hike_pct=hike, members=mem)
        db.add(sub); db.flush()
        d = add_months(sub.next_due_date, -step)
        for _ in range(6 if cyc == "monthly" else 2):
            db.add(Payment(subscription_id=sub.id, date_paid=d, amount=amt, mode_of_payment="UPI"))
            d = add_months(d, -step)
    db.commit()
    return len(DEMO)
