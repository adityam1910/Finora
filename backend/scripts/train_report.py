"""Prints real, measured metrics for both models - copy these into the report instead of estimates."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from app.ml.cost_model import get_model
from app.ml.detector import get_detector
print(json.dumps({"detector": get_detector().metrics, "cost_model": get_model().metrics,
                  "feature_importance": get_model().importances()}, indent=2))
