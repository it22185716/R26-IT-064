import os
import pickle

import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

from helper_functions import calculate_bmi, get_meal_goal

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"]
MAX_OPTIONS_PER_MEAL = 6

app = Flask(__name__)
CORS(app)

# Load the trained model, feature scaler, and label encoders once at startup so requests don't pay that cost.
with open(os.path.join(MODELS_DIR, "meal_plan_model.pkl"), "rb") as f:
    model = pickle.load(f)
with open(os.path.join(MODELS_DIR, "scaler.pkl"), "rb") as f:
    scaler = pickle.load(f)
with open(os.path.join(MODELS_DIR, "encoders.pkl"), "rb") as f:
    encoders = pickle.load(f)

food_db = pd.read_pickle(os.path.join(MODELS_DIR, "food_database.pkl"))

FEATURE_NAMES = encoders.get("feature_names", ["age_years", "height_cm", "weight_kg", "bmi", "gender_encoded"])


# Accepts either a comma-separated string or a list and turns it into a lowercase set for matching.
def normalize_allergies(raw):
    if raw is None:
        return set()
    items = raw.split(",") if isinstance(raw, str) else raw
    return {str(a).strip().lower() for a in items if str(a).strip()}


# A food is unsafe if any of its allergen tags overlap with the student's allergy set.
def food_is_safe(unsafe_field, allergy_set):
    if not allergy_set:
        return True
    tags = {t.strip().lower() for t in str(unsafe_field).split(",") if t.strip()}
    tags.discard("none")
    return not (tags & allergy_set)


def serialize_food(row):
    return {
        "food_id": row["food_id"],
        "name": row["food_item"],
        "calories_kcal": float(row["calories_kcal"]),
        "protein_g": float(row["protein_g"]),
        "carbs_g": float(row["carbs_g"]),
        "fat_g": float(row["fat_g"]),
        "fiber_g": float(row["fiber_g"]),
        "cuisine": row["cuisine"],
    }


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify(
        {
            "status": "ok",
            "model_loaded": model is not None,
            "scaler_loaded": scaler is not None,
            "encoders_loaded": bool(encoders),
            "food_items_loaded": int(len(food_db)),
        }
    )


# Predicts nutritional status from the student's profile, then returns allergy-safe meal options for each meal type.
@app.route("/api/predict-meal-plan", methods=["POST"])
def predict_meal_plan():
    try:
        data = request.get_json(force=True, silent=True) or {}

        missing = [f for f in ("age", "height", "weight", "gender") if data.get(f) in (None, "")]
        if missing:
            return jsonify({"success": False, "error": f"Missing required field(s): {', '.join(missing)}"}), 400

        age = float(data["age"])
        height_cm = float(data["height"])
        weight_kg = float(data["weight"])
        gender = str(data["gender"]).strip()
        allergy_set = normalize_allergies(data.get("allergies"))

        if gender not in encoders["gender"].classes_:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": f"Unknown gender '{gender}'. Expected one of {list(encoders['gender'].classes_)}",
                    }
                ),
                400,
            )

        bmi = calculate_bmi(weight_kg, height_cm)
        gender_encoded = int(encoders["gender"].transform([gender])[0])

        # Built as a dict and reordered via FEATURE_NAMES so the column order always matches what the model was trained on.
        feature_values = {
            "age_years": age,
            "height_cm": height_cm,
            "weight_kg": weight_kg,
            "bmi": bmi,
            "gender_encoded": gender_encoded,
        }
        features = np.array([[feature_values[name] for name in FEATURE_NAMES]])
        # Scale with the same scaler fit during training so inputs match the model's expected distribution.
        features_scaled = scaler.transform(features)

        predicted_encoded = model.predict(features_scaled)[0]
        nutritional_status = encoders["nutritional_status"].inverse_transform([int(predicted_encoded)])[0]

        # Only available for models that support probability estimates.
        confidence = None
        if hasattr(model, "predict_proba"):
            confidence = float(np.max(model.predict_proba(features_scaled)[0]))

        meal_goal = get_meal_goal(nutritional_status)

        # Filter out foods containing any of the student's allergens before building meal options.
        safe_mask = food_db["unsafe_for_allergies"].apply(lambda tags: food_is_safe(tags, allergy_set))
        safe_foods = food_db[safe_mask]

        # Cap each meal type to a fixed number of options so the response stays a manageable size.
        meal_options = {}
        for meal_type in MEAL_TYPES:
            subset = safe_foods[safe_foods["meal_type"] == meal_type].head(MAX_OPTIONS_PER_MEAL)
            meal_options[meal_type.lower()] = [serialize_food(row) for _, row in subset.iterrows()]

        return jsonify(
            {
                "success": True,
                "profile": {
                    "age": age,
                    "height_cm": height_cm,
                    "weight_kg": weight_kg,
                    "gender": gender,
                    "bmi": bmi,
                    "allergies": sorted(allergy_set),
                },
                "nutritional_status": nutritional_status,
                "meal_goal": meal_goal,
                "confidence": confidence,
                "meal_options": meal_options,
            }
        )

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


if __name__ == "__main__":
    app.run(debug=True, port=5001)
