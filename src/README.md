# SBF Sail Trainer - Web Application

A responsive web application for learning and mastering the official German Sportbootführerschein (SBF Binnen & SBF See) question catalogs.

## Key Features

- **Spaced Repetition & 5-in-a-Row Mastery**: Automatically graduates questions once answered 5 times consecutively. Mastered questions are removed from the active training pool.
- **Mistakes Drill**: Filter and train only questions with recorded mistakes.
- **Randomized Question Queue & Shuffled Answers**: Shuffles answer choices so that the correct answer (option A in official catalogs) is randomized every time.
- **Exam Simulation Mode**: Official 30-question mock exam with a 45-minute timer and pass/fail grading.
- **Navigation Scenario Viewer**: Displays nautical scenarios, formulas, and flashcard solutions.
- **100% Client-Side Local Storage**: All stats, streaks, bookmarks, and history are kept in browser `localStorage`. No database or user account required.
- **Backup Export & Import**: Download your learning progress as a JSON file and transfer it to another browser/device anytime.
- **Sound Effects & Keyboard Shortcuts**: Web Audio feedback and shortcuts (`1-4` for answers, `Space`/`Enter` for next question, `M` for bookmark).
- **Dark & Light Mode**: Maritime-themed design system.

---

## How to Run Locally

### Zero Dependencies (Standard Python 3)

From the project root:

```bash
python3 src/app.py
```

Or from within the `src/` directory:

```bash
cd src
python3 app.py
```

Open your browser at:
👉 **[http://localhost:8000](http://localhost:8000)**

### CLI Arguments

- `--port <number>`: Port to listen on (default: `8000` or `$PORT` env variable)
- `--host <ip>`: Host interface (default: `0.0.0.0` or `$HOST` env variable)
- `--data-dir <path>`: Custom directory with JSON catalogs and images (default: auto-detected `../input_documents`)

---

## How to Deploy / Host Online

### Option A: Render / Railway / Fly.io (Free / Easy)
1. Push this repository to GitHub.
2. Connect to Render (render.com) or Railway (railway.app).
3. Set Start Command to: `python3 src/app.py --port $PORT --host 0.0.0.0`
4. The service will build and host automatically!

### Option B: Docker Container
```bash
docker build -t sbf-trainer -f src/Dockerfile .
docker run -p 8000:8000 sbf-trainer
```
