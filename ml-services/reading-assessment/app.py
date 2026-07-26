"""
Flask API for the Reading Assessment component (Whisper-based).

Given a recorded audio clip of a student reading a passage aloud, plus the
reference text for that passage, this service:
  1. transcribes the audio with OpenAI Whisper,
  2. word-diffs the transcription against the reference text
     (difflib.SequenceMatcher, ported unchanged from the research notebook),
  3. scores accuracy and classifies a reading level (HIGH/MEDIUM/LOW).

The Next.js side (src/app/api/reading/assess/route.ts) owns the "what
difficulty comes next" decision and Firestore writes; this service is a pure
transcribe-and-score endpoint, structured the same way as the sibling
ml-services/meal-planning/ and ml-services/video-recommendation/ services
(own venv, requirements.txt, .gitignore).
"""
import difflib
import os
import re
import tempfile

import whisper
from flask import Flask, jsonify, request
from flask_cors import CORS

WHISPER_MODEL_NAME = os.environ.get("WHISPER_MODEL", "base")

app = Flask(__name__)
CORS(app)

model = whisper.load_model(WHISPER_MODEL_NAME)


def clean(text):
    return re.sub(r"[^\w\s]", "", str(text).lower()).split()


def compare_words(correct_words, student_words):
    matcher = difflib.SequenceMatcher(None, correct_words, student_words)
    correct_count = 0
    wrong_words = []
    missing_words = []
    extra_words = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            correct_count += i2 - i1
        elif tag == "replace":
            for correct_word, student_word in zip(correct_words[i1:i2], student_words[j1:j2]):
                wrong_words.append(f"{correct_word} -> {student_word}")
        elif tag == "delete":
            missing_words.extend(correct_words[i1:i2])
        elif tag == "insert":
            extra_words.extend(student_words[j1:j2])

    return correct_count, wrong_words, missing_words, extra_words


def classify_level(accuracy):
    if accuracy >= 80:
        return "HIGH"
    if accuracy >= 50:
        return "MEDIUM"
    return "LOW"


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model_loaded": model is not None, "model_name": WHISPER_MODEL_NAME})


@app.route("/api/assess-reading", methods=["POST"])
def assess_reading():
    audio_file = request.files.get("audio")
    correct_text = request.form.get("correctText", "")
    current_difficulty = request.form.get("currentDifficulty", "")

    if audio_file is None:
        return jsonify({"success": False, "error": "Missing 'audio' file"}), 400
    if not correct_text.strip():
        return jsonify({"success": False, "error": "Missing 'correctText'"}), 400

    suffix = os.path.splitext(audio_file.filename or "")[1] or ".webm"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            audio_file.save(tmp.name)
            tmp_path = tmp.name

        result = model.transcribe(tmp_path)
        transcribed = result.get("text", "").strip()

        correct_words = clean(correct_text)
        student_words = clean(transcribed)

        correct_count, wrong_words, missing_words, extra_words = compare_words(correct_words, student_words)
        accuracy = round(correct_count / len(correct_words) * 100, 1) if correct_words else 0.0
        level = classify_level(accuracy)

        return jsonify(
            {
                "success": True,
                "transcribed": transcribed,
                "accuracy": accuracy,
                "level": level,
                "wrongWords": wrong_words,
                "missingWords": missing_words,
                "extraWords": extra_words,
                "currentDifficulty": current_difficulty,
            }
        )
    except Exception as e:  # noqa: BLE001 - surface any error to the caller
        return jsonify({"success": False, "error": str(e)}), 400
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5003, debug=True)
