# Reading Assessment Service (Whisper-based)

Flask API that transcribes a student's recorded reading of a passage with
OpenAI Whisper and scores it against the reference text. Structured to match
the sibling `ml-services/meal-planning/` and `ml-services/video-recommendation/`
services (own venv, `requirements.txt`, `.gitignore`) — no `models/` folder
here since Whisper ships its own pretrained weights, downloaded on first run.

## What the model actually does

`whisper.load_model(WHISPER_MODEL)` (default `"base"`, configurable via the
`WHISPER_MODEL` env var) transcribes the uploaded audio to English text. The
transcription is then word-diffed against the passage's reference text with
`difflib.SequenceMatcher` to produce an accuracy score and a `HIGH` / `MEDIUM`
/ `LOW` reading level. The next-passage difficulty decision (Easy/Medium/Hard
transitions) is *not* made here — that logic lives in
`src/app/api/reading/assess/route.ts` on the Next.js side, same separation of
concerns as the meal-planning and video-recommendation components.

## Requires ffmpeg

Whisper shells out to `ffmpeg` to decode the uploaded audio, so it must be on
your system `PATH` (not just inside the venv). Install it via your OS package
manager (`choco install ffmpeg` / `winget install ffmpeg` on Windows, `brew
install ffmpeg` on macOS, `apt install ffmpeg` on Linux) and confirm with
`ffmpeg -version`.

## Run

```bash
cd ml-services/reading-assessment
python -m venv venv
venv\Scripts\python.exe -m pip install -r requirements.txt
venv\Scripts\python.exe app.py
```

Runs on **port 5003** (meal-planning uses 5001, video-recommendation uses
5002).

### ⚠️ Windows: `WinError 206: filename too long`

`torch` (a Whisper dependency) ships a deeply-nested license folder
(`torch-*.dist-info\licenses\...\civetweb\examples\rest\cJSON`). If your clone
path is long enough — e.g. deeply nested under `Desktop\` — combined with
`venv\Lib\site-packages\...`, the full path can exceed Windows' 260-character
`MAX_PATH`, and `pip install` fails partway through with that error.

Fix options (either works):
1. **Enable Windows long paths** (needs an admin PowerShell, one-time,
   machine-wide): `Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name LongPathsEnabled -Value 1`, then reopen your shell.
2. **Create the venv at a short path instead**, e.g. `python -m venv C:\venvs\reading-assessment`, then run
   `C:\venvs\reading-assessment\Scripts\python.exe -m pip install -r requirements.txt` and
   `C:\venvs\reading-assessment\Scripts\python.exe app.py` from this folder.

Health check: `GET http://127.0.0.1:5003/api/health` → `{"status": "ok", "model_loaded": true}`.

Assess: `POST http://127.0.0.1:5003/api/assess-reading` as `multipart/form-data`
with fields `audio` (file), `correctText` (string), `currentDifficulty` (string).

The Next.js app proxies this through `src/app/api/reading/assess/route.ts`
(same pattern as `src/app/api/meal-plan/generate/route.ts`), configurable via
the `READING_SERVICE_URL` env var (defaults to `http://127.0.0.1:5003`).
