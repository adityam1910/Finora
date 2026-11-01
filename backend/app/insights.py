"""Combines the ML models with rules to produce dashboard insights."""
from collections import defaultdict
from datetime import date
from .ml.catalog import OVERLAP_CATEGORIES, lookup
from .ml.cost_model import get_model
from .ml.renewal import advance, predict_next_renewal

CYCLE_MONTHS = {"weekly": 7 / 30.44, "monthly": 1, "quarterly": 3, "yearly": 12}


def monthly_cost(sub) -> float:
    return sub.amount / CYCLE_MONTHS.get(sub.billing_cycle, 1)


def share_cost(sub) -> float:
    return monthly_cost(sub) / max(sub.members, 1)


def assess(sub, today: date) -> dict:
    """ML waste assessment for one subscription, with plain-language reasons."""
    if sub.usage_per_month is None and sub.last_used_date is None:
        return {"subscription_id": sub.id, "service_name": sub.service_name, "verdict": "needs_data",
                "waste_probability": None, "monthly_saving": 0.0,
                "reasons": ["Add how often you use it so Finora can judge whether it is worth the cost."],
                "alternative": (lookup(sub.service_name) or (None,) * 4)[3]}
    idle = (today - sub.last_used_date).days if sub.last_used_date else (60 if (sub.usage_per_month or 0) < 1 else 5)
    tenure = max(1, (today - sub.start_date).days // 30)
    model = get_model()
    feats = model.features(monthly_cost(sub), sub.usage_per_month, idle, tenure, sub.price_hike_pct, sub.category, sub.members)
    p = model.predict(feats)
    eff = share_cost(sub)
    reasons = []
    if sub.usage_per_month is not None:
        if sub.usage_per_month < 1:
            reasons.append("You barely use it (under once a month).")
        else:
            reasons.append(f"Costs about ₹{eff / sub.usage_per_month:,.0f} per use.")
    if idle >= 30:
        reasons.append(f"Not used for {idle} days.")
    if sub.price_hike_pct >= 10:
        reasons.append(f"Price is up {sub.price_hike_pct:.0f}% since you signed up.")
    if sub.members > 1:
        reasons.append(f"Split between {sub.members} people.")
    verdict = "cancel" if p >= 0.7 else "review" if p >= 0.5 else "keep"
    saving = round(monthly_cost(sub) * (1 if verdict == "cancel" else 0.5 if verdict == "review" else 0), 2)
    alt = (lookup(sub.service_name) or (None,) * 4)[3]
    return {"subscription_id": sub.id, "service_name": sub.service_name, "verdict": verdict,
            "waste_probability": round(p, 3), "monthly_saving": saving, "reasons": reasons or ["Usage looks healthy."],
            "alternative": alt if verdict != "keep" else None}


def forecast(subs, months: int, today: date, skip_ids: set[int] | None = None) -> list[float]:
    """Cash outflow per month for the next `months` months, using each subscription's due date and cycle."""
    skip_ids = skip_ids or set()
    out = [0.0] * months
    for s in subs:
        if s.id in skip_ids:
            continue
        d = s.next_due_date
        while d < today:
            d = advance(d, s.billing_cycle)
        for i in range(months):
            end = date(today.year + (today.month - 1 + i + 1) // 12, (today.month - 1 + i + 1) % 12 + 1, 1)
            while d < end:
                out[i] += s.amount
                d = advance(d, s.billing_cycle)
    return [round(v, 2) for v in out]


def build(subs, today: date | None = None) -> dict:
    today = today or date.today()
    active = [s for s in subs if s.status == "active"]
    total_monthly = round(sum(monthly_cost(s) for s in active), 2)
    by_cat = defaultdict(float)
    for s in active:
        by_cat[s.category] += monthly_cost(s)

    assessments = [assess(s, today) for s in active]
    flagged = [a for a in assessments if a["verdict"] in ("cancel", "review")]
    flagged.sort(key=lambda a: a["monthly_saving"], reverse=True)

    groups = defaultdict(list)
    for s in active:
        if s.category in OVERLAP_CATEGORIES:
            groups[s.category].append(s)
    overlaps = [{"category": c, "services": [x.service_name for x in v],
                 "monthly_cost": round(sum(monthly_cost(x) for x in v), 2),
                 "tip": f"You pay for {len(v)} {c.lower()} services. Keeping one could save about ₹{sum(sorted(monthly_cost(x) for x in v)[:-1]):,.0f} a month."}
                for c, v in groups.items() if len(v) >= 2]

    cancel_ids = {a["subscription_id"] for a in assessments if a["verdict"] == "cancel"}
    now_fc, opt_fc = forecast(active, 6, today), forecast(active, 6, today, cancel_ids)
    monthly_saving = round(sum(a["monthly_saving"] for a in assessments), 2)

    renewals = []
    for s in active:
        d = s.next_due_date
        while d < today:
            d = advance(d, s.billing_cycle)
        pred = predict_next_renewal([p.date_paid for p in s.payments], s.billing_cycle, d) if s.payments else None
        renewals.append({"subscription_id": s.id, "service_name": s.service_name, "amount": s.amount,
                         "due_date": d.isoformat(), "days_left": (d - today).days,
                         "prediction": pred})
    renewals.sort(key=lambda r: r["days_left"])

    return {
        "summary": {"active_count": len(active), "monthly_total": total_monthly, "yearly_total": round(total_monthly * 12, 2),
                    "potential_monthly_saving": monthly_saving, "potential_yearly_saving": round(monthly_saving * 12, 2),
                    "due_in_7_days": sum(1 for r in renewals if r["days_left"] <= 7)},
        "by_category": [{"category": k, "monthly": round(v, 2)} for k, v in sorted(by_cat.items(), key=lambda kv: -kv[1])],
        "forecast": {"months": [_month_label(today, i) for i in range(6)], "current": now_fc, "optimised": opt_fc},
        "assessments": assessments, "flagged": flagged, "overlaps": overlaps, "renewals": renewals,
    }


def _month_label(today: date, i: int) -> str:
    m = (today.month - 1 + i) % 12
    return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m]


def notifications(subs, today: date | None = None) -> list[dict]:
    """In-app reminders at 3 days / 1 day / today, as described in the report."""
    today = today or date.today()
    out = []
    for r in build(subs, today)["renewals"]:
        n = r["days_left"]
        if n in (3, 1, 0) or n < 0:
            when = "today" if n == 0 else f"in {n} day{'s' if n != 1 else ''}"
            out.append({"subscription_id": r["subscription_id"], "service_name": r["service_name"],
                        "days_left": n, "message": f"{r['service_name']} renews {when} for ₹{r['amount']:,.0f}."})
    return out
