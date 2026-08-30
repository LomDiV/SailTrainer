# SBF Exam Question Catalog PDF to JSON & Image Extractor

This utility parses the official German Sportbootführerschein (SBF) exam question catalog PDFs for both inland waters (**Binnen**) and coastal/sea waters (**See**), exporting them into clean, structured JSON files and extracting all associated illustrations/diagrams into high-quality JPEG images.

---

## Prerequisites & Dependencies

### 1. System Dependencies (Poppler Utilities)
The conversion pipeline uses Poppler command-line utilities (`pdftohtml` and `pdftotext`) for accurate text layout and vector/raster image stream extraction.

- **Ubuntu / Debian:**
  ```bash
  sudo apt-get update
  sudo apt-get install poppler-utils
  ```
- **Fedora / RHEL:**
  ```bash
  sudo dnf install poppler-utils
  ```
- **macOS (Homebrew):**
  ```bash
  brew install poppler
  ```

### 2. Python Dependencies
- Python 3.8 or newer
- **Pillow** (`PIL`):
  ```bash
  pip install Pillow
  ```

---

## How to Run

Execute the conversion script from within this directory:

```bash
python3 convert_all.py
```

The script will:
1. Extract XML structure, text coordinates, and raw images from `Fragenkatalog-Binnen-August-2023.pdf` and `Fragenkatalog-See-August-2023.pdf`.
2. Composite and convert all diagrams, traffic boards, and sound signals into `.jpg` format inside the `images/` directory.
3. Parse all questions, sections, and answers, marking correct choices with `"correct": "Y"` and distractors with `"correct": "N"`.
4. Generate `Fragenkatalog-Binnen-August-2023.json` and `Fragenkatalog-See-August-2023.json`.

---

## ⛵ SBF Web Training Application

The interactive web training application is located in `~/W/Sail_training/src`.

### Launch Locally (Zero Dependencies)
```bash
python3 ../src/app.py
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser.

- **5-in-a-Row Mastery Tracking**: Automatically graduates questions once answered 5 times correctly in a row.
- **Mistakes Drill**: Dedicated review mode for tricky or missed questions.
- **Official Mock Exam Simulation**: 30 questions with timer and pass/fail grading.
- **100% Local Storage**: Progress is stored directly in your browser with JSON backup export/import.


---

## Input & Output Overview

### Input Files (placed in the working directory)
- `Fragenkatalog-Binnen-August-2023.pdf`
- `Fragenkatalog-See-August-2023.pdf`

### Generated Output Files
- **`Fragenkatalog-Binnen-August-2023.json`**: 300 questions across 3 sections (`Basisfragen`, `Spezifische Fragen Binnen`, `Spezifische Fragen Segeln`).
- **`Fragenkatalog-See-August-2023.json`**: 435 questions/sub-tasks across 18 sections (`Basisfragen`, `Spezifische Fragen See`, `Navigationsaufgaben` templates, and `Navigationsaufgabe 1` to `15`).
- **`images/`**: Folder containing all 173 standalone `.jpg` files referenced by questions and answer options.

---

## JSON Structure Specification

```json
{
  "document_name": "Fragenkatalog-See-August-2023",
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
        },
        {
          "id": "16",
          "text": "Welche Bedeutung hat folgendes Schallsignal?",
          "image": "see_q16.jpg",
          "answers": [
            {
              "text": "Bleib-weg-Signal, Gefahrenbereich sofort verlassen.",
              "image": "n/a",
              "correct": "Y"
            }
          ]
        }
      ]
    },
    {
      "name": "Navigationsaufgabe 1",
      "comment": "Ein Sportboot befindet sich am 05.05.2012 in der Deutschen Bucht auf der Reise von Borkum nach Cuxhaven. Die Fahrt über Grund beträgt 8 kn. Um 10:00 Uhr wird die Leuchttonne \"TG19/Weser 2\" nahebei passiert. Von dieser Tonne wird der Kurs auf die Ansteuerungstonne der alten Weser \"ST\" abgesetzt.",
      "questions": [
        {
          "id": "1",
          "text": "Wie lautet der rwK?",
          "image": "n/a",
          "answers": [
            {
              "text": "rwk = 079°",
              "image": "n/a",
              "correct": "Y"
            }
          ]
        }
      ]
    }
  ]
}
```

### Field Definitions

| Level | Field | Type | Description |
| :--- | :--- | :--- | :--- |
| **Root** | `document_name` | `string` | Base identifier of the catalog (e.g. `Fragenkatalog-Binnen-August-2023`). |
| **Root** | `sections` | `array` | List of section objects. |
| **Section** | `name` | `string` | Section title (e.g. `Basisfragen`, `Navigationsaufgabe 1`). |
| **Section** | `comment` | `string` | Introductory text or scenario description for navigation tasks; `"n/a"` if not applicable. |
| **Section** | `questions` | `array` | List of question objects belonging to the section. |
| **Question** | `id` | `string` | Question number/identifier. |
| **Question** | `text` | `string` | The question text prompt. |
| **Question** | `image` | `string` | Filename of the associated `.jpg` in `images/` (e.g. `binnen_q16.jpg`) or `"n/a"`. |
| **Question** | `answers` | `array` | List of answer option objects. |
| **Answer** | `text` | `string` | Answer text or solution result (`Ergebnis`). |
| **Answer** | `image` | `string` | Filename of the answer option illustration or `"n/a"`. |
| **Answer** | `correct` | `string` | `"Y"` if correct (always option `a` in official catalogs / navigation solution), `"N"` for distractors. |

---

## Technical Details

- **Image Extraction & Compositing**: If a question prompt includes multiple signboards or acoustic symbols, `save_image_group()` composites them horizontally onto a single white-background JPEG canvas with 10px spacing.
- **Transparency Handling**: PNG alpha channels and palette transparency are merged onto pure white background prior to saving as high-quality JPEG (quality 95).
- **Navigation Tasks (`Navigationsaufgabe 1..15`)**: Scenarios and 2-column tables (`Aufgabenstellung` vs. `Ergebnis`) are parsed using dynamic column gap detection to preserve complete solution formulas.
