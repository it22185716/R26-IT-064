"""
Flask API for the AI-Driven Adaptive Content Delivery component.

Given a student's weak area, it ranks the candidate videos in videos.csv using
the trained KNN model (models/best_model.pkl) and returns the top 3.

How the model is used
---------------------
The KNN model (KNeighborsClassifier) does NOT output videos directly. It
classifies a *single video's* feature vector into a suitability class:
High / Medium / Low. The 5 features (order fixed by scaler.feature_names_in_):

    weak_area_encoded, difficulty_encoded,
    content_quality_score, student_suitability_score, duration_minutes

So /recommend:
  1. filters videos.csv to the requested weak_area,
  2. builds + scales each candidate video's feature vector,
  3. asks the model for P(High) / P(Medium) / P(Low),
  4. ranks by a suitability score and returns the top 3.

Artifacts loaded (all produced with scikit-learn 1.6.1 / numpy 1.26.x — see
requirements.txt; best_model.pkl is a joblib dump, so we load everything with
joblib which also reads plain pickles):

    models/best_model.pkl  KNeighborsClassifier
    models/scaler.pkl      StandardScaler (feature order lives here)
    models/le_weak.pkl     LabelEncoder for weak_area  (8 topics)
    models/le_diff.pkl     LabelEncoder for difficulty (Beginner/Intermediate/Advanced)
    models/le_class.pkl    LabelEncoder for target     (High/Low/Medium)
    videos.csv             candidate video catalog (weak_area, video_title, video_url,
                            video_duration "MM:SS", difficulty_level, content_quality_score,
                            student_suitability_score)
"""
import os

import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

app = Flask(__name__)
CORS(app)


def _load_model(name):
    return joblib.load(os.path.join(MODELS_DIR, name))


def _parse_duration_minutes(value):
    """Convert an "MM:SS" or "H:MM:SS" duration string to float minutes."""
    parts = [int(p) for p in str(value).split(":")]
    if len(parts) == 2:
        minutes, seconds = parts
        return minutes + seconds / 60.0
    if len(parts) == 3:
        hours, minutes, seconds = parts
        return hours * 60 + minutes + seconds / 60.0
    return float(value)


model = _load_model("best_model.pkl")
scaler = _load_model("scaler.pkl")
le_weak = _load_model("le_weak.pkl")
le_diff = _load_model("le_diff.pkl")
le_class = _load_model("le_class.pkl")

videos = pd.read_csv(os.path.join(BASE_DIR, "videos.csv"))
videos = videos.rename(
    columns={
        "video_title": "title",
        "video_url": "url",
        "difficulty_level": "difficulty",
    }
)
videos["duration_minutes"] = videos["video_duration"].apply(_parse_duration_minutes)

# Feature order is authoritative — comes from the fitted scaler.
FEATURE_ORDER = list(getattr(scaler, "feature_names_in_", [
    "weak_area_encoded",
    "difficulty_encoded",
    "content_quality_score",
    "student_suitability_score",
    "duration_minutes",
]))

# Map each target class label ("High"/"Medium"/"Low") to its column index in
# model.predict_proba output (columns are ordered by model.classes_).
CLASS_LABELS = list(le_class.inverse_transform(model.classes_))
LABEL_TO_COL = {label: i for i, label in enumerate(CLASS_LABELS)}

# Weight each suitability class when scoring a video. High is best.
CLASS_WEIGHT = {"High": 1.0, "Medium": 0.5, "Low": 0.0}


def _feature_row(video_row):
    """Build the 5-feature vector for one candidate video, in FEATURE_ORDER."""
    values = {
        "weak_area_encoded": int(le_weak.transform([video_row["weak_area"]])[0]),
        "difficulty_encoded": int(le_diff.transform([video_row["difficulty"]])[0]),
        "content_quality_score": float(video_row["content_quality_score"]),
        "student_suitability_score": float(video_row["student_suitability_score"]),
        "duration_minutes": float(video_row["duration_minutes"]),
    }
    return [values[name] for name in FEATURE_ORDER]


def _clean(value, default=""):
    if value is None:
        return default
    if isinstance(value, float) and np.isnan(value):
        return default
    return value


def _health_payload():
    return {
        "status": "ok",
        "service": "video-recommendation",
        "model": type(model).__name__,
        "model_loaded": model is not None,
        "scaler_loaded": scaler is not None,
        "videos_loaded": int(len(videos)),
        "weak_areas": list(le_weak.classes_),
        "difficulties": list(le_diff.classes_),
        "suitability_classes": CLASS_LABELS,
        "feature_order": FEATURE_ORDER,
    }


@app.route("/", methods=["GET"])
@app.route("/health", methods=["GET"])
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify(_health_payload())


@app.route("/recommend", methods=["POST"])
def recommend():
    try:
        data = request.get_json(force=True, silent=True) or {}
        weak_area = str(data.get("weak_area", "")).strip()
        top_n = int(data.get("top_n", 3))

        if not weak_area:
            return jsonify({"success": False, "error": "Missing 'weak_area'."}), 400

        if weak_area not in set(le_weak.classes_):
            return (
                jsonify(
                    {
                        "success": False,
                        "error": f"Unknown weak_area '{weak_area}'.",
                        "valid_weak_areas": list(le_weak.classes_),
                    }
                ),
                400,
            )

        candidates = videos[videos["weak_area"] == weak_area].copy()
        if candidates.empty:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": f"No videos in catalog for weak_area '{weak_area}'.",
                    }
                ),
                404,
            )

        # The dataset repeats the same video many times with jittered scores
        # (synthetic augmentation for model training). Collapse to one row per
        # (title, url) before ranking, keeping the highest-scoring copy, so
        # /recommend doesn't return the same video multiple times.
        candidates = candidates.sort_values("student_suitability_score", ascending=False)
        candidates = candidates.drop_duplicates(subset=["title", "url"], keep="first")

        # Build + scale features for every candidate in one batch.
        feature_matrix = np.array([_feature_row(row) for _, row in candidates.iterrows()])
        scaled = scaler.transform(feature_matrix)
        proba = model.predict_proba(scaled)  # columns ordered by model.classes_

        p_high = proba[:, LABEL_TO_COL["High"]]
        p_medium = proba[:, LABEL_TO_COL["Medium"]]
        p_low = proba[:, LABEL_TO_COL["Low"]]

        # Suitability score: weighted mix of class probabilities, with the
        # student_suitability_score as a small tie-breaker.
        scores = (
            CLASS_WEIGHT["High"] * p_high
            + CLASS_WEIGHT["Medium"] * p_medium
            + 0.001 * candidates["student_suitability_score"].to_numpy()
        )

        predicted_encoded = model.predict(scaled)
        predicted_labels = le_class.inverse_transform(predicted_encoded)

        candidates = candidates.reset_index(drop=True)
        ranked_idx = np.argsort(-scores)[:top_n]

        recommendations = []
        for rank, i in enumerate(ranked_idx, start=1):
            row = candidates.iloc[i]
            recommendations.append(
                {
                    "rank": rank,
                    "video_id": _clean(row.get("video_id")),
                    "title": _clean(row.get("title")),
                    "weak_area": _clean(row.get("weak_area")),
                    "difficulty": _clean(row.get("difficulty")),
                    "predicted_suitability": str(predicted_labels[i]),
                    "score": round(float(scores[i]), 4),
                    "content_quality_score": float(row["content_quality_score"]),
                    "student_suitability_score": float(row["student_suitability_score"]),
                    "duration_minutes": float(row["duration_minutes"]),
                    "video_duration": str(_clean(row.get("video_duration"))),
                    "youtube_id": str(_clean(row.get("youtube_id"))),
                    "url": str(_clean(row.get("url"))),
                    "probabilities": {
                        "High": round(float(p_high[i]), 4),
                        "Medium": round(float(p_medium[i]), 4),
                        "Low": round(float(p_low[i]), 4),
                    },
                }
            )

        return jsonify(
            {
                "success": True,
                "weak_area": weak_area,
                "candidate_count": int(len(candidates)),
                "recommendations": recommendations,
            }
        )

    except Exception as e:  # noqa: BLE001 - surface any error to the caller
        return jsonify({"success": False, "error": str(e)}), 400


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5002, debug=True)
