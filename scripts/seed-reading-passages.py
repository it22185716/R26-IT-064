"""
One-time seed script: scripts/data/passages.xlsx -> Firestore "readingPassages".

Reads the Passage_ID / Passage / Difficulty columns (the Audio column is
ignored — no audio files are provided or needed, students record live in the
app) and writes one { passageId, text, difficulty } document per row.

Uses the Firestore REST API directly with the project's public web API key
(read from the repo's .env.local, same NEXT_PUBLIC_FIREBASE_* config
src/lib/firebaseServer.ts uses) rather than firebase-admin, so this script
needs no service-account credentials. This only works because the existing
Next.js API routes (e.g. src/app/api/meal-plan/generate/route.ts) already
write to Firestore unauthenticated via the client "firestore/lite" SDK —
same permission model, just called directly instead of through firebase-js-sdk.
If your Firestore rules require auth, this will fail with PERMISSION_DENIED
and you'll need to adjust rules or switch to firebase-admin with a service
account.

Usage:
    cd scripts
    python -m venv venv
    venv\\Scripts\\python.exe -m pip install -r requirements.txt
    venv\\Scripts\\python.exe seed-reading-passages.py [--limit N] [--dry-run]

Place the dataset at scripts/data/passages.xlsx before running (not included
in this change — 1000 rows, columns: Passage_ID, Passage, Difficulty, Audio).
"""
import argparse
import json
import os
import sys

import pandas as pd
import requests

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(BASE_DIR)
XLSX_PATH = os.path.join(BASE_DIR, "data", "passages.xlsx")
ENV_LOCAL_PATH = os.path.join(REPO_ROOT, ".env.local")

REQUIRED_COLUMNS = ["Passage_ID", "Passage", "Difficulty"]
VALID_DIFFICULTIES = {"Easy", "Medium", "Hard"}


def load_env_local(path):
    env = dict(os.environ)
    if not os.path.exists(path):
        return env
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            env.setdefault(key.strip(), value.strip())
    return env


def firestore_write(project_id, api_key, passage_id, text, difficulty):
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/readingPassages"
    body = {
        "fields": {
            "passageId": {"stringValue": passage_id},
            "text": {"stringValue": text},
            "difficulty": {"stringValue": difficulty},
        }
    }
    resp = requests.post(url, params={"key": api_key}, json=body, timeout=30)
    return resp


def main():
    parser = argparse.ArgumentParser(description="Seed Firestore readingPassages from passages.xlsx")
    parser.add_argument("--limit", type=int, default=None, help="Only seed the first N rows (for testing)")
    parser.add_argument("--dry-run", action="store_true", help="Parse and validate the sheet without writing to Firestore")
    args = parser.parse_args()

    if not os.path.exists(XLSX_PATH):
        sys.exit(f"Dataset not found at {XLSX_PATH}. Place passages.xlsx there before running this script.")

    env = load_env_local(ENV_LOCAL_PATH)
    project_id = env.get("NEXT_PUBLIC_FIREBASE_PROJECT_ID")
    api_key = env.get("NEXT_PUBLIC_FIREBASE_API_KEY")
    if not args.dry_run and (not project_id or not api_key):
        sys.exit(
            "Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID / NEXT_PUBLIC_FIREBASE_API_KEY "
            f"(checked {ENV_LOCAL_PATH} and the environment)."
        )

    df = pd.read_excel(XLSX_PATH, engine="openpyxl")
    missing_cols = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing_cols:
        sys.exit(f"passages.xlsx is missing expected column(s): {missing_cols}. Found: {list(df.columns)}")

    if args.limit is not None:
        df = df.head(args.limit)

    print(f"Loaded {len(df)} row(s) from {XLSX_PATH}")

    written = 0
    failures = []

    for i, row in df.iterrows():
        passage_id = str(row["Passage_ID"]).strip()
        text = str(row["Passage"]).strip()
        difficulty = str(row["Difficulty"]).strip()

        if difficulty not in VALID_DIFFICULTIES:
            failures.append((passage_id, f"Unknown difficulty '{difficulty}' (expected Easy/Medium/Hard)"))
            continue

        if args.dry_run:
            written += 1
            continue

        resp = firestore_write(project_id, api_key, passage_id, text, difficulty)
        if resp.status_code >= 300:
            failures.append((passage_id, f"{resp.status_code}: {resp.text}"))
            if written == 0:
                # First write failed — almost certainly a systemic problem
                # (bad key, permission-denied rules), not a per-row issue.
                # Abort immediately instead of repeating the same failure
                # 1000 times.
                sys.exit(
                    f"First write failed for passageId '{passage_id}': {resp.status_code} {resp.text}\n"
                    "Aborting — check Firestore rules / API key before retrying."
                )
        else:
            written += 1

        if (i + 1) % 100 == 0:
            print(f"  ...{i + 1}/{len(df)} processed")

    print(f"Done. {written} written, {len(failures)} failed.")
    if failures:
        print("Failures:")
        for passage_id, reason in failures[:20]:
            print(f"  {passage_id}: {reason}")
        if len(failures) > 20:
            print(f"  ...and {len(failures) - 20} more")


if __name__ == "__main__":
    main()
