"""Cost-reduction model: predicts the probability that a subscription is wasted spend.

Gradient Boosting classifier on features: usage, cost per use, idle days, tenure, price hikes,
category and cost sharing. Labels come from a noisy latent 'waste' process (synthetic) so the model
learns a smooth decision surface; replace with real user feedback ("I cancelled it") when available.
Predictions come with plain-language reasons (explainable decision support) and nothing is cancelled automatically.
"""
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from .catalog import CATEGORY_INDEX

FEATURES = ["usage_per_month", "cost_per_use", "monthly_cost", "idle_days", "tenure_months",
            "price_hike_pct", "category_idx", "members"]


def _sigmoid(x):
    return 1 / (1 + np.exp(-x))


def build_dataset(n: int = 4000, seed: int = 11):
    rng = np.random.default_rng(seed)
    usage = rng.gamma(1.6, 4.0, n)  # sessions / month
    monthly = rng.choice([29, 99, 119, 149, 199, 299, 499, 649, 999, 1499, 1999], n).astype(float)
    idle = np.where(usage < 1, rng.integers(20, 150, n), rng.integers(0, 25, n)).astype(float)
    tenure = rng.integers(1, 36, n).astype(float)
    hike = rng.choice([0, 0, 0, 5, 10, 20, 30], n).astype(float)
    cat = rng.integers(0, 12, n).astype(float)
    members = rng.choice([1, 1, 1, 2, 3, 4], n).astype(float)
    eff_cost = monthly / members
    cpu = eff_cost / np.maximum(usage, 0.5)
    z = (0.012 * np.minimum(cpu, 400) - 0.35 * np.minimum(usage, 12) + 0.02 * np.minimum(idle, 120)
         + 0.025 * hike + 0.0004 * eff_cost - 0.8 + rng.normal(0, 0.6, n))
    y = (_sigmoid(z) > 0.5).astype(int)
    X = np.column_stack([usage, cpu, eff_cost, idle, tenure, hike, cat, members])
    return X, y


class CostModel:
    def __init__(self):
        X, y = build_dataset()
        Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25, random_state=3, stratify=y)
        self.clf = GradientBoostingClassifier(n_estimators=120, max_depth=3, learning_rate=0.08, random_state=1).fit(Xtr, ytr)
        pred, proba = self.clf.predict(Xte), self.clf.predict_proba(Xte)[:, 1]
        self.metrics = {
            "accuracy": round(accuracy_score(yte, pred), 4), "precision": round(precision_score(yte, pred), 4),
            "recall": round(recall_score(yte, pred), 4), "roc_auc": round(roc_auc_score(yte, proba), 4),
            "train_size": len(Xtr), "test_size": len(Xte),
            "note": "Measured on a held-out split of a synthetic dataset; re-measure on real usage data.",
        }

    def features(self, monthly_cost, usage, idle_days, tenure_months, hike, category, members):
        eff = monthly_cost / max(members, 1)
        cpu = eff / max(usage if usage is not None else 0.5, 0.5)
        return [usage if usage is not None else 0.0, cpu, eff, idle_days, tenure_months, hike,
                CATEGORY_INDEX.get(category, 11), members]

    def predict(self, feats: list[float]) -> float:
        return float(self.clf.predict_proba(np.array([feats]))[0][1])

    def importances(self) -> dict:
        return {f: round(float(v), 3) for f, v in zip(FEATURES, self.clf.feature_importances_)}


_model: CostModel | None = None


def get_model() -> CostModel:
    global _model
    if _model is None:
        _model = CostModel()
    return _model
