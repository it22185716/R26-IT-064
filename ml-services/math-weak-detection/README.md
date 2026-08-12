# Math Weak Student Detection Service

Flask API that predicts a Grade 7 student's weakest math subcategory using a
trained **Logistic Regression** classifier — chosen over KNN, Gradient
Boosting, and Random Forest after a 4-way comparison (see
`training/model_train_realistic.ipynb`). Structured to match the sibling
`ml-services/meal-planning/` and `ml-services/video-recommendation/` services
(own venv, `requirements.txt`, `.gitignore`, `models/`).

## What the model actually does

Rather than just taking whichever subcategory has the lowest raw score, the
model looks at **24 features** — for each of the 8 subcategories (Addition,
Subtraction, Multiplication, Division, Comparing/Ordering/Simplifying
Fractions, Fraction to Decimal): score out of 20, score-to-max ratio, and
count of fully-correct answers out of 5 — and classifies which subcategory is
the true weak spot, trained on ~4,900 labelled student profiles
(`training/dataset_wide_balanced.csv`, balanced so no class dominates).

```
models/model_best.pkl    LogisticRegression (class_weight="balanced", C=0.1, solver="lbfgs")
models/model_scaler.pkl  StandardScaler fit on the 24 training features
models/model_sub_enc.pkl LabelEncoder for the 8 subcategory names
models/model_meta.pkl    feature order, accuracy (84.0%), F1-macro, all 4 models' scores
```

**Test-set performance**: 84.0% accuracy / 84.0% F1-macro (random-chance
baseline for 8 classes is 12.5%). Full confusion matrix and the 4-algorithm
comparison chart are reproducible from the training notebook.

## Run

```bash
cd ml-services/math-weak-detection
python -m venv venv
venv\Scripts\python.exe -m pip install -r requirements.txt
venv\Scripts\python.exe app.py
```

Runs on **port 5004** (meal-planning uses 5001, video-recommendation uses
5002, reading-assessment uses 5003).

Health check: `GET http://127.0.0.1:5004/api/health` → `{"status": "ok", "model": "Logistic Regression", "accuracy": 0.84, ...}`.

Predict: `POST http://127.0.0.1:5004/api/predict-weakness` with:
```json
{
  "categoryStats": {
    "Addition": { "score": 18, "correct": 4 },
    "Subtraction": { "score": 16, "correct": 3 },
    "Multiplication": { "score": 4, "correct": 1 },
    "Division": { "score": 14, "correct": 3 },
    "Ordering Fractions": { "score": 6, "correct": 1 },
    "Comparing Fractions": { "score": 14, "correct": 3 },
    "Simplifying Fractions": { "score": 16, "correct": 4 },
    "Fraction to Decimal": { "score": 20, "correct": 5 }
  }
}
```
→ `{"success": true, "weakestCategory": "Multiplication", "confidence": 0.69, "probabilities": {...}}`.

The Next.js app calls this from `src/app/api/quiz/submit/route.ts` right
after grading a quiz (same proxy pattern as `meal-plan/generate/route.ts`),
configurable via the `MATH_WEAKNESS_SERVICE_URL` env var (defaults to
`http://127.0.0.1:5004`). If this service is unreachable, the route falls
back to its own lowest-score rule so quiz submission never fails because of
this service being down.
