"""Run daily (cron / GitHub Actions / Render cron job): emails users about renewals due in 3 days, 1 day or today.
Without SMTP settings it just prints what it would send."""
import os, smtplib, sys
from email.message import EmailMessage
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from sqlalchemy import select
from app.database import SessionLocal
from app.insights import notifications
from app.models import Subscription, User


def main():
    host, port = os.getenv("SMTP_HOST"), int(os.getenv("SMTP_PORT", "587"))
    with SessionLocal() as db:
        for user in db.scalars(select(User)):
            subs = db.scalars(select(Subscription).where(Subscription.user_id == user.id)).all()
            items = notifications(subs)
            if not items:
                continue
            body = "Hi %s,\n\n%s\n\n- Finora" % (user.name, "\n".join(i["message"] for i in items))
            if not host:
                print(f"[dry run] to {user.email}:\n{body}\n"); continue
            msg = EmailMessage(); msg["Subject"] = "Upcoming renewals"; msg["From"] = os.getenv("SMTP_USER"); msg["To"] = user.email
            msg.set_content(body)
            with smtplib.SMTP(host, port) as s:
                s.starttls(); s.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASS")); s.send_message(msg)


if __name__ == "__main__":
    main()
