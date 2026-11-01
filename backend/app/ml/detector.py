"""Subscription detection from email / SMS text.

Stage 1 (ML): TF-IDF + Logistic Regression decides whether a message is a recurring-payment message.
Stage 2 (NLP rules): regex / dictionary extraction of service, amount, billing cycle and due date.
Trained on a synthetic corpus generated at start-up; swap `build_corpus()` for a real labelled dataset
(e.g. your own anonymised inbox) to improve it.
"""
import random
import re
from datetime import date, datetime
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import precision_score, recall_score, f1_score, accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from .catalog import CATALOG, lookup

_SERVICES = [v[0] for v in CATALOG.values()]

POS_TEMPLATES = [
    "Your {s} subscription of Rs.{a} will renew on {d}. Manage your plan anytime.",
    "Invoice: {s} monthly membership INR {a} charged to your card. Next billing date {d}.",
    "Auto-debit of ₹{a} for {s} scheduled on {d}. Maintain balance to avoid failure.",
    "Thank you for your payment of Rs {a} towards {s} subscription. Your plan renews automatically on {d}.",
    "{s}: your yearly plan renews on {d} for INR {a}. Cancel before the renewal date to avoid charges.",
    "Reminder: {s} auto-renewal of Rs.{a} due on {d}. UPI mandate will be executed.",
    "Receipt from {s}. Recurring charge ₹{a}. Billing cycle: monthly. Next payment {d}.",
    "Your {s} free trial ends soon. You will be charged Rs.{a} on {d} unless you cancel.",
    "E-mandate created for {s}. Amount INR {a} will be debited every month starting {d}.",
    "Premium due: {s} policy premium of Rs.{a} is due on {d}. Pay to keep your cover active.",
    "EMI of Rs.{a} for {s} will be auto-debited on {d}. Ensure sufficient balance.",
    "{s} quarterly subscription charged ₹{a}. Your next invoice will be generated on {d}.",
]
NEG_TEMPLATES = [
    "{o} is your one time password for login. Do not share it with anyone.",
    "Big sale! Flat 50% off on fashion this weekend only. Shop now at {s}.",
    "Your order #{o} has been shipped and will be delivered by {d}.",
    "Rs.{a} credited to your account from a friend. Available balance updated.",
    "Hi, are we still meeting on {d}? Let me know when you are free.",
    "Your OTP for transaction of Rs.{a} is {o}. Valid for 5 minutes.",
    "Welcome to {s}! Explore new releases and recommendations picked for you.",
    "Rs.{a} spent at a restaurant using your debit card. Thank you for banking with us.",
    "Your ride has been completed. Total fare Rs.{a}. Rate your driver.",
    "Newsletter: top ten study tips before the semester exams on {d}.",
    "Security alert: new sign-in to your {s} account from a new device.",
    "Your package from {s} was delivered today. We hope you enjoyed shopping.",
    "Cashback of Rs.{a} added to your wallet. Use before {d}.",
    "Your one-time purchase of Rs.{a} at {s} is confirmed. Thank you for shopping.",
    "Payment of Rs.{a} to {s} successful. Transaction ID {o}. Thank you.",
    "Subscribe to our newsletter for weekly offers from {s}. Unsubscribe anytime.",
    "Rs.{a} debited from your account for ATM withdrawal on {d}. Available balance updated.",
    "Your bill of Rs.{a} for dinner at {s} is attached. Hope to see you again.",
    "{s} invoice for your one-time order #{o}, total INR {a}. Delivered on {d}.",
    "Pay Rs.{a} by {d} to claim your cashback offer at {s}. Limited time.",
]
_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def _rand_date(rng: random.Random) -> str:
    d, m, y = rng.randint(1, 28), rng.randint(0, 11), rng.choice([2026, 2027])
    return rng.choice([f"{d:02d}/{m+1:02d}/{y}", f"{d} {_MONTHS[m]} {y}", f"{_MONTHS[m]} {d}, {y}", f"{y}-{m+1:02d}-{d:02d}"])


def build_corpus(n: int = 1500, seed: int = 7):
    rng = random.Random(seed)
    X, y = [], []
    for _ in range(n):
        s, a, d, o = rng.choice(_SERVICES), rng.choice([99, 149, 199, 299, 499, 649, 1499, 2499, 799]), _rand_date(rng), rng.randint(100000, 999999)
        if rng.random() < 0.5:
            X.append(rng.choice(POS_TEMPLATES).format(s=s, a=a, d=d, o=o)); y.append(1)
        else:
            X.append(rng.choice(NEG_TEMPLATES).format(s=s, a=a, d=d, o=o)); y.append(0)
        if rng.random() < 0.04:  # label noise, like real-world annotation mistakes
            y[-1] = 1 - y[-1]
    return X, y


class Detector:
    def __init__(self):
        X, y = build_corpus()
        Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)
        self.pipe = Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True, lowercase=True)),
            ("clf", LogisticRegression(max_iter=500, C=4.0)),
        ]).fit(Xtr, ytr)
        pred = self.pipe.predict(Xte)
        self.metrics = {
            "accuracy": round(accuracy_score(yte, pred), 4),
            "precision": round(precision_score(yte, pred), 4),
            "recall": round(recall_score(yte, pred), 4),
            "f1": round(f1_score(yte, pred), 4),
            "train_size": len(Xtr), "test_size": len(Xte),
            "note": "Measured on a held-out split of a synthetic corpus; re-measure on real messages.",
        }

    # ---------- extraction ----------
    AMOUNT = re.compile(r"(?:₹|rs\.?|inr|\$)\s*([\d,]+(?:\.\d{1,2})?)", re.I)
    DATE_PATTERNS = [
        (re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b"), lambda g: date(int(g[0]), int(g[1]), int(g[2]))),
        (re.compile(r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b"), lambda g: date(int(g[2]), int(g[1]), int(g[0]))),
        (re.compile(r"\b(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?,?\s+(\d{4})\b"),
         lambda g: date(int(g[2]), _MONTHS.index(g[1].title()) + 1, int(g[0]))),
        (re.compile(r"\b([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b"),
         lambda g: date(int(g[2]), _MONTHS.index(g[0].title()) + 1, int(g[1]))),
    ]

    def _cycle(self, t: str) -> str:
        t = t.lower()
        if re.search(r"year|annual", t): return "yearly"
        if re.search(r"quarter", t): return "quarterly"
        if re.search(r"week", t): return "weekly"
        return "monthly"

    def _date(self, text: str):
        for rx, build in self.DATE_PATTERNS:
            for m in rx.finditer(text):
                try:
                    return build(m.groups())
                except (ValueError, IndexError):
                    continue
        return None

    def _service(self, text: str):
        hit = lookup(text)
        if hit:
            return hit[0], hit[1]
        m = re.search(r"(?:your|for|from|towards)\s+([A-Z][\w+&.-]*(?:\s[A-Z][\w+&.-]*)?)\s+(?:subscription|plan|membership|premium|policy|invoice)", text)
        if m:
            return m.group(1), "Other"
        m = re.match(r"\s*([A-Z][\w+&.-]*(?:\s[A-Z][\w+&.-]*)?)\s*:", text)
        return (m.group(1), "Other") if m else (None, "Other")

    def analyse(self, text: str) -> dict:
        prob = float(self.pipe.predict_proba([text])[0][1])
        is_sub = prob >= 0.5
        service, category = self._service(text)
        amt = self.AMOUNT.search(text)
        amount = float(amt.group(1).replace(",", "")) if amt else None
        due = self._date(text)
        fields = {
            "service_name": service, "category": category, "amount": amount,
            "billing_cycle": self._cycle(text), "next_due_date": due.isoformat() if due else None,
        }
        missing = [k for k in ("service_name", "amount", "next_due_date") if fields[k] is None]
        return {
            "is_subscription": is_sub, "confidence": round(prob, 3), "fields": fields, "missing_fields": missing,
            "message": ("Looks like a recurring payment. Review the details and save." if is_sub
                        else "This doesn't look like a recurring payment."),
        }


_detector: Detector | None = None


def get_detector() -> Detector:
    global _detector
    if _detector is None:
        _detector = Detector()
    return _detector
