import os
os.environ["DATABASE_URL"] = "sqlite:///./test_finora.db"
from datetime import date, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.ml.renewal import add_months, predict_next_renewal


def auth(c, email="a@x.com"):
    r = c.post("/api/auth/register", json={"name": "Asha", "email": email, "password": "password123"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_flow_and_isolation():
    with TestClient(app) as c:
        h1, h2 = auth(c, "one@x.com"), auth(c, "two@x.com")
        assert c.post("/api/demo/seed", headers=h1).json()["added"] == 12
        subs = c.get("/api/subscriptions", headers=h1).json()
        assert len(subs) == 12 and c.get("/api/subscriptions", headers=h2).json() == []
        assert c.delete(f"/api/subscriptions/{subs[0]['id']}", headers=h2).status_code == 404
        ins = c.get("/api/insights", headers=h1).json()
        assert ins["summary"]["monthly_total"] > 0 and ins["flagged"]
        assert any(a["verdict"] == "cancel" for a in ins["assessments"])
        assert ins["overlaps"]
        bad = c.post("/api/subscriptions", headers=h1, json={"service_name": "X", "amount": -5, "next_due_date": "2026-12-01"})
        assert bad.status_code == 422
        assert c.post("/api/auth/login", json={"email": "one@x.com", "password": "wrong"}).status_code == 401


def test_detect():
    with TestClient(app) as c:
        h = auth(c, "d@x.com")
        r = c.post("/api/detect", headers=h, json={"text": "Your Netflix subscription of Rs.649 will renew on 15 Nov 2026. Manage your plan."}).json()
        assert r["is_subscription"] and r["fields"]["service_name"] == "Netflix"
        assert r["fields"]["amount"] == 649 and r["fields"]["next_due_date"] == "2026-11-15"
        r2 = c.post("/api/detect", headers=h, json={"text": "123456 is your one time password for login. Do not share it."}).json()
        assert not r2["is_subscription"]


def test_renewal_prediction():
    last = date(2026, 6, 15)
    dates = [add_months(last, -i) for i in range(5, -1, -1)]
    p = predict_next_renewal(dates, "monthly")
    assert abs((date.fromisoformat(p["predicted_date"]) - add_months(last, 1)).days) <= 3
