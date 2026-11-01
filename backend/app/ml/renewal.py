"""Renewal-date prediction: regression on inter-payment gaps, shrunk toward the nominal billing cycle."""
import calendar
from datetime import date, timedelta
import numpy as np
from sklearn.linear_model import LinearRegression

NOMINAL_DAYS = {"weekly": 7, "monthly": 30.44, "quarterly": 91.31, "yearly": 365.25}
MONTH_STEP = {"monthly": 1, "quarterly": 3, "yearly": 12}


def add_months(d: date, months: int) -> date:
    m = d.month - 1 + months
    y, m = d.year + m // 12, m % 12 + 1
    return date(y, m, min(d.day, calendar.monthrange(y, m)[1]))


def advance(d: date, cycle: str) -> date:
    """Calendar-aware next due date (handles month lengths)."""
    if cycle == "weekly":
        return d + timedelta(days=7)
    return add_months(d, MONTH_STEP.get(cycle, 1))


def predict_next_renewal(payment_dates: list[date], cycle: str, scheduled_due: date | None = None) -> dict:
    nominal = NOMINAL_DAYS.get(cycle, 30.44)
    dates = sorted(set(payment_dates))
    gaps = np.array([(b - a).days for a, b in zip(dates, dates[1:])], dtype=float)
    if len(gaps) == 0:
        fallback = scheduled_due or (advance(dates[-1], cycle) if dates else None)
        return {"predicted_date": fallback.isoformat() if fallback else None, "confidence": 0.4,
                "method": "billing-cycle rule (no history yet)", "expected_gap_days": nominal}
    if len(gaps) >= 4:
        reg = LinearRegression().fit(np.arange(len(gaps)).reshape(-1, 1), gaps)
        raw_gap, method = float(reg.predict([[len(gaps)]])[0]), "linear regression on payment gaps"
    else:
        raw_gap, method = float(np.median(gaps)), "median of past payment gaps"
    w = len(gaps) / (len(gaps) + 3)  # more history -> trust data over nominal cycle
    gap = w * raw_gap + (1 - w) * nominal
    gap = float(np.clip(gap, nominal * 0.7, nominal * 1.3))
    predicted = dates[-1] + timedelta(days=round(gap))
    spread = float(np.std(gaps)) / nominal
    confidence = float(np.clip(0.95 - 3 * spread - 0.25 / (len(gaps) + 1), 0.3, 0.97))
    return {"predicted_date": predicted.isoformat(), "confidence": round(confidence, 2),
            "method": method, "expected_gap_days": round(gap, 1)}
