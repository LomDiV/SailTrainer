# ⛵ SBF Sail Trainer & Exam Suite

[![Status](https://img.shields.io/badge/Status-Alpha%20(v0.1)-orange?style=flat&logo=target&logoColor=white)](#-alpha-status)
[![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![SBF Binnen & See](https://img.shields.io/badge/Catalogs-SBF%20Binnen%20%26%20See-0077B6?style=flat&logo=safari&logoColor=white)](#question-catalogs)
[![Zero Backend Dependencies](https://img.shields.io/badge/Dependencies-Zero%20External-success?style=flat)](src/app.py)
[![Docker Ready](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker&logoColor=white)](src/Dockerfile)

> [!NOTE]
> ### 🚧 Alpha Version Notice
> This project is currently in **Alpha (v0.1-alpha)**. Active development and testing are ongoing. Features, catalog parsing schemas, and UI elements may undergo iterative improvements. Feedback, issues, and contributions are welcome!

An interactive, responsive web application and data extraction toolset designed for learning, drilling, and mastering the official German boat license exam question catalogs (**Sportbootführerschein Binnen & Sportbootführerschein See**).

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Project Architecture](#-project-architecture)
- [Quick Start](#-quick-start)
  - [Run with Standard Python (Zero Dependencies)](#1-run-with-standard-python-zero-dependencies)
  - [Run with Docker](#2-run-with-docker)
  - [Run in VS Code Devcontainer](#3-run-in-vs-code--codespaces-devcontainer)
- [Web Application Details](#-web-application-details)
  - [Learning & Exam Modes](#learning--exam-modes)
  - [Keyboard Shortcuts](#keyboard-shortcuts)
  - [Data Storage & Privacy](#data-storage--privacy)
- [PDF Extraction Pipeline](#-pdf-extraction-pipeline)
  - [Prerequisites](#prerequisites)
  - [Running the Conversion Script](#running-the-conversion-script)
  - [JSON Catalog Schema](#json-catalog-schema)
- [Deployment](#-deployment)
  - [Render / Railway / Fly.io](#render--railway--flyio)
  - [Docker Container Deployment](#docker-container-deployment)
- [License & Attributions](#-license--attributions)

---

## 🧭 Overview

Preparing for the German **Sportbootführerschein (SBF)** involves memorizing hundreds of official exam questions, recognizing maritime signal boards and sound signals, and solving detailed navigation problems.

This repository provides an all-in-one solution:
1. **Interactive Web Application (`src/`)**: A fast, client-side progressive web application built with vanilla HTML5, CSS3, and JavaScript, backed by a lightweight Python standard library HTTP server.
2. **Automated PDF Extraction Engine (`input_documents/`)**: A Python pipeline that extracts text, answer choices, and composite vector/raster illustrations directly from the official BMDV/ELWIS question catalog PDFs into structured JSON and clean JPEG images.

---

## ✨ Key Features

### 🎓 Smart Learning System
- **5-in-a-Row Mastery (Spaced Repetition)**: Tracks consecutive correct answers for every question. Once answered correctly 5 times in a row, the question is marked as **Mastered** and graduated from the active training pool.
- **Mistakes Drill**: Dedicated filter mode to exclusively practice questions that were previously answered incorrectly.
- **Randomized Question Queue & Dynamic Answer Shuffling**: In official catalogs, choice `A` is always the correct answer. The app dynamically shuffles choices on every presentation to prevent position-based memorization.
- **Bookmarks & Favorites**: Flag challenging questions for targeted revision at any time.

### ⏱️ Official Exam Simulation
- **Timed Mock Exam**: Simulates the authentic exam format (30 randomly selected questions across required official categories with a 45-minute countdown timer).
- **Official Scoring Evaluation**: Accurate pass/fail grading based on official BMDV point thresholds (minimum 24/30 points required to pass).
- **Exam History**: Review past mock exam scores, completion dates, and detailed question breakdowns.

### 🗺️ Navigation Task Viewer
- **Full Navigation Scenarios**: Interactive viewer for coastal navigation exercises (`Navigationsaufgabe 1–15`), including scenario texts, bearings, coordinate calculations, and complete step-by-step mathematical solutions.

### 🎨 Modern UI & Audio Feedback
- **Maritime Design System**: Custom Dark and Light nautical themes with ambient glowing effects and glassmorphism styling.
- **Synthesized Audio**: Real-time sound effects via the Web Audio API for correct answers, mistakes, streaks, and masteries (muteable).
- **Full Keyboard Navigation**: Rapid desktop workflow with hotkeys (`1-4` for answer selection, `Space`/`Enter` to proceed, `M` to bookmark).

### 🔒 100% Client-Side & Private
- **Zero Server-Side User Tracking**: All learning statistics, streaks, mastery levels, and exam attempts are stored locally in the browser's `localStorage`.
- **JSON Backup Export & Import**: Seamlessly backup, restore, or transfer learning progress across devices and browsers.

---

## 📂 Project Architecture

```plaintext
Sail_training/
├── .devcontainer/                    # VS Code & Codespaces environment
│   ├── devcontainer.json            # Tooling and extension configurations
│   └── Dockerfile                   # Python 3.11 with Poppler & Pillow
│
├── input_documents/                  # Catalog source files & extraction pipeline
│   ├── Fragenkatalog-Binnen-August-2023.pdf   # Official SBF Binnen PDF
│   ├── Fragenkatalog-See-August-2023.pdf      # Official SBF See PDF
│   ├── Fragenkatalog-Binnen-August-2023.json  # Extracted Binnen questions (300)
│   ├── Fragenkatalog-See-August-2023.json     # Extracted See questions (435)
│   ├── convert_all.py                        # PDF-to-JSON & image extraction script
│   ├── README.md                             # Pipeline & schema documentation
│   └── images/                               # Extracted exam illustrations (173 JPGs)
│
├── src/                              # Web application
│   ├── app.py                       # Python HTTP server (zero external dependencies)
│   ├── Dockerfile                   # Production container definition
│   ├── Procfile                     # Web process definition for PaaS hosting
│   ├── render.yaml                  # Render.com blueprint specification
│   ├── requirements.txt             # Python dependencies documentation
│   ├── README.md                    # Web application guide
│   └── static/                      # Frontend Single Page Application (SPA)
│       ├── index.html               # Main application layout & modals
│       ├── css/
│       │   └── style.css            # Maritime design tokens, themes & animations
│       └── js/
│           ├── app.js               # Application coordinator & event bindings
│           ├── quiz_engine.js       # Quiz logic, exam simulation & shuffling
│           ├── storage.js           # LocalStorage state management & export/import
│           └── audio.js             # Web Audio API chime generator
│
├── .gitignore                        # Git exclusion rules
└── README.md                         # Project documentation (this file)
```

---

## 🚀 Quick Start

### 1. Run with Standard Python (Zero Dependencies)

No external package installation is required to run the web server. Simply launch `src/app.py` with Python 3.8+:

```bash
# Clone the repository
git clone https://github.com/LomDiV/SailTrainer.git
cd SailTrainer

# Start the web server
python3 src/app.py
```

Open your browser and navigate to:
👉 **[http://localhost:8000](http://localhost:8000)**

#### CLI Options
| Argument | Description | Default |
| :--- | :--- | :--- |
| `--port <int>` | TCP port to listen on (also respects `$PORT` env variable) | `8000` |
| `--host <ip>` | Network interface to bind to (also respects `$HOST` env variable) | `0.0.0.0` |
| `--data-dir <path>` | Custom path to folder containing catalog JSONs and `images/` | `../input_documents` |

---

### 2. Run with Docker

Build and run the self-contained container:

```bash
# Build the Docker image
docker build -t sbf-sail-trainer -f src/Dockerfile .

# Run the container mapping port 8000
docker run -d -p 8000:8000 --name sbf-trainer sbf-sail-trainer
```

Access the application at **[http://localhost:8000](http://localhost:8000)**.

---

### 3. Run in VS Code / Codespaces Devcontainer

If you use VS Code Remote Containers or GitHub Codespaces, open the repository and select **"Reopen in Container"**. The container includes:
- Python 3.11
- Poppler utilities (`pdftohtml`, `pdftotext`)
- Pre-installed Pillow, Ruff, and Pytest
- Port 8000 auto-forwarding

---

## 📱 Web Application Details

### Learning & Exam Modes

| Mode | Badge | Description |
| :--- | :--- | :--- |
| **All Questions** | `Alle` | Cycles through all questions in the selected catalog or category, prioritizing unmastered items. |
| **Mistakes Drill** | `Fehler` | Filters only questions where errors have been made in previous sessions. |
| **Bookmarks** | `Markiert` | Focuses on manually bookmarked questions. |
| **Exam Simulation** | `Prüfung` | 30-question timed mock exam (45 minutes) with official passing criteria. |
| **Mastered** | `Gemeistert` | Review questions that have reached the 5-in-a-row mastery threshold. |

### Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| `1`, `2`, `3`, `4` | Select answer option A, B, C, or D |
| `Space` or `Enter` | Submit selected answer / advance to next question |
| `M` | Bookmark / unbookmark the current question |
| `Escape` | Close active modal dialog |

### Data Storage & Privacy

- All learner state is stored locally inside the browser's `localStorage` under the key `sbf_trainer_data_v1`.
- To create a backup or migrate your progress:
  1. Open **Settings** (⚙️ icon in the header).
  2. Click **"Fortschritt als JSON herunterladen"** to download a `.json` backup file.
  3. On a new device or browser, click **"JSON Datei auswählen"** to restore.

---

## 🛠️ PDF Extraction Pipeline

The `input_documents/convert_all.py` script parses official PDF catalogs into structured JSON files and extracts all diagrams.

### Prerequisites

1. **System Utility**: `poppler-utils` (`pdftohtml`, `pdftotext`)
   ```bash
   # Debian / Ubuntu
   sudo apt-get install -y poppler-utils

   # macOS (Homebrew)
   brew install poppler
   ```

2. **Python Library**: `Pillow`
   ```bash
   pip install Pillow
   ```

### Running the Conversion Script

```bash
cd input_documents
python3 convert_all.py
```

The script will automatically:
1. Parse `Fragenkatalog-Binnen-August-2023.pdf` into `Fragenkatalog-Binnen-August-2023.json` (300 questions).
2. Parse `Fragenkatalog-See-August-2023.pdf` into `Fragenkatalog-See-August-2023.json` (435 questions & sub-tasks).
3. Extract and composite all 173 illustrations and signal boards into `input_documents/images/*.jpg`.

### JSON Catalog Schema

```json
{
  "document_name": "Fragenkatalog-Binnen-August-2023",
  "sections": [
    {
      "name": "Basisfragen",
      "comment": "n/a",
      "questions": [
        {
          "id": "1",
          "text": "Was ist zu tun, wenn vor Antritt der Fahrt nicht feststeht, wer Schiffsführer ist?",
          "image": "n/a",
          "answers": [
            {
              "text": "Der verantwortliche Schiffsführer muss bestimmt werden.",
              "image": "n/a",
              "correct": "Y"
            },
            {
              "text": "Der verantwortliche Schiffsführer muss gewählt werden.",
              "image": "n/a",
              "correct": "N"
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 🌐 Deployment

### Render / Railway / Fly.io

This repository includes a `src/render.yaml` and `src/Procfile` ready for zero-configuration PaaS deployment:

1. Link your repository to [Render](https://render.com) or [Railway](https://railway.app).
2. Configure the Start Command:
   ```bash
   python3 src/app.py --port $PORT --host 0.0.0.0
   ```
3. Deploy! The application will run smoothly on free and low-resource tiers.

### Docker Container Deployment

```bash
docker build -t sbf-sail-trainer -f src/Dockerfile .
docker run -p 80:8000 -e PORT=8000 sbf-sail-trainer
```

---

## 📜 License & Attributions

- **Code**: Licensed under the [MIT License](https://opensource.org/licenses/MIT).
- **Exam Content & Question Catalogs**: Official question catalogs are published by the German **Bundesministerium für Digitales und Verkehr (BMDV)** and **ELWIS** (Elektronischer Wasserstraßen-Informationsservice). Official publications are provided for public educational and examination purposes.
