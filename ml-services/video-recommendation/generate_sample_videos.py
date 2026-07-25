"""
Generates a SAMPLE video catalog (videos.csv) for the video-recommendation
backend.

IMPORTANT: This is placeholder/seed data so the recommendation pipeline can run
end-to-end with the real trained KNN model. The team should REPLACE videos.csv
with the real video catalog (real titles, real YouTube IDs / URLs, and the real
content_quality_score / student_suitability_score / duration_minutes that were
used when the model was trained).

Columns expected by app.py:
    video_id, title, weak_area, difficulty,
    content_quality_score, student_suitability_score, duration_minutes,
    youtube_id, url

- weak_area MUST be one of le_weak.classes_ (note: "Fractions to Decimals", plural)
- difficulty MUST be one of le_diff.classes_ ("Beginner"/"Intermediate"/"Advanced")
"""
import csv
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Must match le_weak.classes_ exactly (order not important here).
WEAK_AREAS = [
    "Addition",
    "Subtraction",
    "Multiplication",
    "Division",
    "Ordering Fractions",
    "Comparing Fractions",
    "Simplifying Fractions",
    "Fractions to Decimals",
]

# Must match le_diff.classes_ exactly.
DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"]

# A few plausible sample scores per difficulty so the KNN produces a spread of
# High/Medium/Low predictions. These are seed values only.
DIFF_PROFILE = {
    #                quality, suitability, duration
    "Beginner":     [(9.2, 9.4, 6), (8.6, 9.0, 8), (8.9, 8.7, 5)],
    "Intermediate": [(8.7, 8.6, 10), (8.2, 8.1, 12), (9.0, 8.9, 9)],
    "Advanced":     [(8.4, 7.9, 15), (7.9, 7.6, 18), (8.8, 8.3, 13)],
}

TOPIC_CODE = {
    "Addition": "ADD",
    "Subtraction": "SUB",
    "Multiplication": "MUL",
    "Division": "DIV",
    "Ordering Fractions": "ORD",
    "Comparing Fractions": "CMP",
    "Simplifying Fractions": "SIM",
    "Fractions to Decimals": "F2D",
}


def build_rows():
    rows = []
    for area in WEAK_AREAS:
        code = TOPIC_CODE[area]
        n = 1
        for difficulty in DIFFICULTIES:
            for quality, suitability, duration in DIFF_PROFILE[difficulty]:
                vid = f"{code}_{n:02d}"
                title = f"{area} — {difficulty} Lesson {n}"
                # youtube_id left blank for sample data; app.py/frontend fall
                # back to a search link when there is no real embed id.
                youtube_id = ""
                url = "https://www.youtube.com/results?search_query=" + (
                    (area + " " + difficulty + " math lesson").replace(" ", "+")
                )
                rows.append(
                    {
                        "video_id": vid,
                        "title": title,
                        "weak_area": area,
                        "difficulty": difficulty,
                        "content_quality_score": quality,
                        "student_suitability_score": suitability,
                        "duration_minutes": duration,
                        "youtube_id": youtube_id,
                        "url": url,
                    }
                )
                n += 1
    return rows


def main():
    rows = build_rows()
    fieldnames = [
        "video_id",
        "title",
        "weak_area",
        "difficulty",
        "content_quality_score",
        "student_suitability_score",
        "duration_minutes",
        "youtube_id",
        "url",
    ]
    out_path = os.path.join(BASE_DIR, "videos.csv")
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} sample videos to {out_path}")


if __name__ == "__main__":
    main()
