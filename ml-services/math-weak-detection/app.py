"""
Flask API for the AI-Based Math Weak Student Detection component.

Given a student's per-subcategory quiz stats (score out of 20, count of fully
correct answers out of 5) across the 8 Grade 7 math subcategories, this
service predicts the student's weakest subcategory using a trained
Logistic Regression classifier (84.0% accuracy / 84.0% F1-macro on held-out
test data, chosen over KNN, Gradient Boosting, and Random Forest — see
training/model_train_realistic.ipynb for the full comparison).

How the model is used
----------------------
The model does NOT just pick the lowest raw score. It's a multi-class
classifier over 24 engineered features (score, ratio-to-max, and correct-count
for each of the 8 subcategories) trained on ~4,900 labelled student profiles,
so it can weigh patterns across all subcategories at once rather than looking
at one number in isolation.

Artifacts loaded (all produced with scikit-learn 1.6.1 — see requirements.txt):

    models/model_best.pkl    LogisticRegression classifier
    models/model_scaler.pkl  StandardScaler (fit on the 24 training features)
    models/model_sub_enc.pkl LabelEncoder for the 8 subcategory names
    models/model_meta.pkl    dict: feature name order, accuracy, class list

The Next.js side (src/app/api/quiz/submit/route.ts) computes each student's
per-subcategory score/correct-count right after grading, calls this service's
/api/predict-weakness, and falls back to its own lowest-score rule if this
service is unreachable — same "AI enhances, app still works without it"
pattern as the sibling ml-services/meal-planning and video-recommendation.
"""
import os
import pickle

import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

app = Flask(__name__)
CORS(app)


def _load(name):
    with open(os.path.join(MODELS_DIR, name), "rb") as f:
        return pickle.load(f)


model = _load("model_best.pkl")
scaler = _load("model_scaler.pkl")
sub_enc = _load("model_sub_enc.pkl")
meta = _load("model_meta.pkl")

# Authoritative feature order the model/scaler were fit with.
FEATURE_NAMES = meta["features"]
SUB_LIST = list(sub_enc.classes_)


def _feature_row(category_stats):
    """Build the 24-feature vector in FEATURE_NAMES order from per-subcategory stats."""
    values = {}
    for sub in SUB_LIST:
        code = sub.lower().replace(" ", "_")
        stats = category_stats.get(sub) or {}
        score = float(stats.get("score", 0))
        correct = float(stats.get("correct", 0))
        values[f"{code}_score"] = score
        values[f"{code}_ratio"] = round(score / 20, 4)
        values[f"{code}_correct"] = correct
    return [values[name] for name in FEATURE_NAMES]


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify(
        {
            "status": "ok",
            "service": "math-weak-detection",
            "model": meta.get("best_model"),
            "accuracy": meta.get("accuracy"),
            "classes": SUB_LIST,
        }
    )


@app.route("/api/predict-weakness", methods=["POST"])
def predict_weakness():
    try:
        data = request.get_json(force=True, silent=True) or {}
        category_stats = data.get("categoryStats")
        if not category_stats:
            return jsonify({"success": False, "error": "Missing 'categoryStats'"}), 400

        row = _feature_row(category_stats)
        row_scaled = scaler.transform(np.array([row]))

        pred_idx = int(model.predict(row_scaled)[0])
        predicted_sub = sub_enc.inverse_transform([pred_idx])[0]
        proba = model.predict_proba(row_scaled)[0]

        probabilities = {
            sub_enc.inverse_transform([i])[0]: round(float(p), 4) for i, p in enumerate(proba)
        }

        return jsonify(
            {
                "success": True,
                "weakestCategory": predicted_sub,
                "confidence": round(float(proba[pred_idx]), 4),
                "probabilities": probabilities,
            }
        )
    except Exception as e:  # noqa: BLE001 - surface any error to the caller
        return jsonify({"success": False, "error": str(e)}), 400


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5004, debug=True)
