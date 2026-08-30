import os
import re
import json
import subprocess
import xml.etree.ElementTree as ET
from PIL import Image

WORKSPACE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGES_DIR = os.path.join(WORKSPACE_DIR, "images")
TMP_DIR = "/tmp/pdf_extract_sbf"

os.makedirs(IMAGES_DIR, exist_ok=True)
os.makedirs(TMP_DIR, exist_ok=True)

def save_image_group(image_tuples, output_jpg_path):
    """
    Takes a list of (src_png_path, width, height) and saves as a single JPEG.
    If multiple images, aligns them horizontally with padding on a clean white background.
    """
    converted = []
    for src, w, h in image_tuples:
        if not os.path.exists(src):
            continue
        try:
            im = Image.open(src)
            if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
                bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
                if im.mode == "P":
                    im = im.convert("RGBA")
                bg.paste(im, (0, 0), mask=im.split()[-1])
                converted.append(bg.convert("RGB"))
            else:
                converted.append(im.convert("RGB"))
        except Exception as e:
            print(f"Error reading image {src}: {e}")

    if not converted:
        return False

    if len(converted) == 1:
        composite = converted[0]
    else:
        pad = 10
        total_w = sum(im.width for im in converted) + pad * (len(converted) - 1)
        max_h = max(im.height for im in converted)
        composite = Image.new("RGB", (total_w, max_h), (255, 255, 255))
        curr_x = 0
        for im in converted:
            y_off = (max_h - im.height) // 2
            composite.paste(im, (curr_x, y_off))
            curr_x += im.width + pad

    composite.save(output_jpg_path, "JPEG", quality=95)
    return True

def extract_pdf_xml(pdf_name, xml_name):
    pdf_path = os.path.join(WORKSPACE_DIR, pdf_name)
    xml_path = os.path.join(TMP_DIR, xml_name)
    cmd = ["pdftohtml", "-xml", "-nodrm", pdf_path, xml_path]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return xml_path

def process_binnen():
    print("Extracting Binnen XML and images...")
    xml_path = extract_pdf_xml("Fragenkatalog-Binnen-August-2023.pdf", "binnen.xml")
    tree = ET.parse(xml_path)
    root = tree.getroot()
    pages = root.findall("page")

    doc_elements = []
    for p in pages:
        p_num = int(p.get("number"))
        p_elems = []
        for img in p.findall("image"):
            top = int(img.get("top"))
            left = int(img.get("left"))
            w = int(img.get("width"))
            h = int(img.get("height"))
            src = img.get("src")
            if not os.path.isabs(src):
                src = os.path.join(TMP_DIR, src)
            if (w == 213 and h == 58) or (top < 150 and left > 400):
                continue
            p_elems.append(("IMAGE", top, left, (src, w, h)))

        for t in p.findall("text"):
            top = int(t.get("top"))
            left = int(t.get("left"))
            val = "".join(t.itertext()).strip()
            if not val:
                continue
            if val in [
                "ELWIS", "Sportschifffahrt", "Sportbootführerscheine",
                "Fragenkatalog Binnen", "Sie sind hier:", "Basisfragen",
                "Spezifische Fragen Binnen", "Spezifische Fragen Segeln",
                "Anmerkung:", "Antwort a ist immer die richtige.", "Hinweis:"
            ]:
                continue
            if val.startswith("ELWIS - Spezifische") or "https://" in val:
                continue
            if re.match(r"^\d+\s+von\s+\d+", val) or re.match(r"^\d\d\.\d\d\.\d\d\d\d", val):
                continue
            if val.startswith("Stand:") or val.startswith("© Wasserstraßen"):
                continue
            p_elems.append(("TEXT", top, left, val))

        p_elems.sort(key=lambda x: (x[1], x[2]))
        doc_elements.extend([(p_num, e[0], e[1], e[2], e[3]) for e in p_elems])

    questions = []
    cur_q = None
    cur_ans = None

    for p_num, e_type, top, left, data in doc_elements:
        if e_type == "TEXT":
            m_q = re.match(r"^(\d+)\.\s*(.*)", data)
            m_ans = re.match(r"^([a-d])\.\s*(.*)", data)
            if m_q:
                q_num = int(m_q.group(1))
                if cur_q is None or q_num > int(cur_q["id"]):
                    if cur_q:
                        if cur_ans:
                            cur_q["answers"].append(cur_ans)
                            cur_ans = None
                        questions.append(cur_q)
                    cur_q = {
                        "id": str(q_num),
                        "text": m_q.group(2).strip(),
                        "_raw_images": [],
                        "answers": []
                    }
                    cur_ans = None
                    continue
            elif m_ans and cur_q is not None:
                letter = m_ans.group(1)
                if cur_ans:
                    cur_q["answers"].append(cur_ans)
                cur_ans = {
                    "text": m_ans.group(2).strip(),
                    "_raw_images": [],
                    "correct": "Y" if letter == "a" else "N"
                }
                continue

            if cur_ans is not None:
                cur_ans["text"] += " " + data
            elif cur_q is not None:
                cur_q["text"] += " " + data

        elif e_type == "IMAGE":
            if cur_ans is not None and cur_q is not None:
                cur_ans["_raw_images"].append(data)
            elif cur_q is not None:
                cur_q["_raw_images"].append(data)

    if cur_q:
        if cur_ans:
            cur_q["answers"].append(cur_ans)
        questions.append(cur_q)

    # Process images and clean up temporary fields
    for q in questions:
        q["text"] = " ".join(q["text"].split())
        if q["_raw_images"]:
            img_filename = f"binnen_q{q['id']}.jpg"
            out_path = os.path.join(IMAGES_DIR, img_filename)
            if save_image_group(q["_raw_images"], out_path):
                q["image"] = img_filename
            else:
                q["image"] = "n/a"
        else:
            q["image"] = "n/a"
        del q["_raw_images"]

        for ans in q["answers"]:
            ans["text"] = " ".join(ans["text"].split())
            if ans["_raw_images"]:
                letter = "a" if ans["correct"] == "Y" else "x"
                img_filename = f"binnen_q{q['id']}_ans_{letter}.jpg"
                out_path = os.path.join(IMAGES_DIR, img_filename)
                if save_image_group(ans["_raw_images"], out_path):
                    ans["image"] = img_filename
                else:
                    ans["image"] = "n/a"
            else:
                ans["image"] = "n/a"
            del ans["_raw_images"]

    sections = [
        {
            "name": "Basisfragen",
            "comment": "n/a",
            "questions": [q for q in questions if 1 <= int(q["id"]) <= 72]
        },
        {
            "name": "Spezifische Fragen Binnen",
            "comment": "n/a",
            "questions": [q for q in questions if 73 <= int(q["id"]) <= 253]
        },
        {
            "name": "Spezifische Fragen Segeln",
            "comment": "n/a",
            "questions": [q for q in questions if 254 <= int(q["id"]) <= 300]
        }
    ]

    doc = {
        "document_name": "Fragenkatalog-Binnen-August-2023",
        "sections": sections
    }
    return doc


def process_see():
    print("Extracting See XML and images...")
    xml_path = extract_pdf_xml("Fragenkatalog-See-August-2023.pdf", "see.xml")
    tree = ET.parse(xml_path)
    root = tree.getroot()
    pages = root.findall("page")

    doc_elements = []
    for p in pages:
        p_num = int(p.get("number"))
        p_elems = []
        for img in p.findall("image"):
            top = int(img.get("top"))
            left = int(img.get("left"))
            w = int(img.get("width"))
            h = int(img.get("height"))
            src = img.get("src")
            if not os.path.isabs(src):
                src = os.path.join(TMP_DIR, src)
            if (w == 213 and h == 58) or (top < 150 and left > 400):
                continue
            p_elems.append(("IMAGE", top, left, (src, w, h)))

        for t in p.findall("text"):
            top = int(t.get("top"))
            left = int(t.get("left"))
            val = "".join(t.itertext()).strip()
            if not val:
                continue
            if val in [
                "ELWIS", "Sportschifffahrt", "Sportbootführerscheine",
                "Fragenkatalog See", "Sie sind hier:", "Basisfragen",
                "Spezifische Fragen See", "Navigationsaufgaben",
                "Anmerkung:", "Antwort a ist immer die richtige.", "Hinweis:"
            ]:
                continue
            if val.startswith("ELWIS - Spezifische") or "https://" in val:
                continue
            if re.match(r"^\d+\s+von\s+\d+", val) or re.match(r"^\d\d\.\d\d\.\d\d\d\d", val):
                continue
            if val.startswith("Stand:") or val.startswith("© Wasserstraßen"):
                continue
            p_elems.append(("TEXT", top, left, val))

        p_elems.sort(key=lambda x: (x[1], x[2]))
        doc_elements.extend([(p_num, e[0], e[1], e[2], e[3]) for e in p_elems])

    questions = []
    cur_q = None
    cur_ans = None

    for p_num, e_type, top, left, data in doc_elements:
        if e_type == "TEXT":
            m_q = re.match(r"^(\d+)\.\s*(.*)", data)
            m_ans = re.match(r"^([a-d])\.\s*(.*)", data)
            if m_q:
                q_num = int(m_q.group(1))
                if q_num > 285:
                    break
                if cur_q is None or q_num > int(cur_q["id"]):
                    if cur_q:
                        if cur_ans:
                            cur_q["answers"].append(cur_ans)
                            cur_ans = None
                        questions.append(cur_q)
                    cur_q = {
                        "id": str(q_num),
                        "text": m_q.group(2).strip(),
                        "_raw_images": [],
                        "answers": []
                    }
                    cur_ans = None
                    continue
            elif m_ans and cur_q is not None:
                letter = m_ans.group(1)
                if cur_ans:
                    cur_q["answers"].append(cur_ans)
                cur_ans = {
                    "letter": letter,
                    "text": m_ans.group(2).strip(),
                    "_raw_images": [],
                    "correct": "Y" if letter == "a" else "N"
                }
                continue

            if cur_ans is not None:
                cur_ans["text"] += " " + data
            elif cur_q is not None:
                cur_q["text"] += " " + data

        elif e_type == "IMAGE":
            if cur_ans is not None and cur_q is not None:
                cur_ans["_raw_images"].append(data)
            elif cur_q is not None:
                cur_q["_raw_images"].append(data)

    if cur_q:
        if cur_ans:
            cur_q["answers"].append(cur_ans)
        questions.append(cur_q)

    # Process images for 1..285
    for q in questions:
        q["text"] = " ".join(q["text"].split())
        if q["_raw_images"]:
            img_filename = f"see_q{q['id']}.jpg"
            out_path = os.path.join(IMAGES_DIR, img_filename)
            if save_image_group(q["_raw_images"], out_path):
                q["image"] = img_filename
            else:
                q["image"] = "n/a"
        else:
            q["image"] = "n/a"
        del q["_raw_images"]

        for ans in q["answers"]:
            ans["text"] = " ".join(ans["text"].split())
            letter = ans.pop("letter", "a")
            if ans["_raw_images"]:
                img_filename = f"see_q{q['id']}_ans_{letter}.jpg"
                out_path = os.path.join(IMAGES_DIR, img_filename)
                if save_image_group(ans["_raw_images"], out_path):
                    ans["image"] = img_filename
                else:
                    ans["image"] = "n/a"
            else:
                ans["image"] = "n/a"
            del ans["_raw_images"]

    # Questions 286 to 300
    subprocess.run(["pdftotext", "-f", "87", "-l", "88", os.path.join(WORKSPACE_DIR, "Fragenkatalog-See-August-2023.pdf"), "/tmp/see_p87_88.txt"])
    with open("/tmp/see_p87_88.txt", "r", encoding="utf-8") as f:
        p87_88_text = f.read()

    q_286_300 = []
    for m in re.finditer(r"(?:^|[\n\x0c])\s*(\d{3})\.\s+(.*?)(?=(?:[\n\x0c]\s*\d{3}\.|\n\s*Navigationsaufgabe|\n\s*Stand:|\Z))", p87_88_text, re.DOTALL):
        qid = m.group(1)
        qtext = " ".join(m.group(2).strip().split())
        q_286_300.append({
            "id": qid,
            "text": qtext,
            "image": "n/a",
            "answers": []
        })

    # Navigationsaufgabe 1..15
    subprocess.run(["pdftotext", "-layout", "-f", "87", "-l", "104", os.path.join(WORKSPACE_DIR, "Fragenkatalog-See-August-2023.pdf"), "/tmp/see_nav_layout.txt"])
    with open("/tmp/see_nav_layout.txt", "r", encoding="utf-8") as f:
        nav_layout_text = f.read()

    nav_pages = nav_layout_text.split("\x0c")

    # Extract Navigationsaufgaben overview comment from Page index 0
    overview_lines = [
        l.strip() for l in nav_pages[0].split("\n")
        if l.strip() and not any(k in l for k in ["ELWIS", "Sportschifffahrt", "Sportbootführerscheine", "Fragenkatalog", "Sie sind hier", "Navigationsaufgaben", "Hinweis:"])
    ]
    overview_comment = " ".join(overview_lines)

    nav_sections = []
    for nav_i in range(1, 16):
        p_idx = 2 if nav_i == 1 else (nav_i + 2)
        page_content = nav_pages[p_idx]
        if nav_i == 1 and len(nav_pages) > 3:
            page_content += "\n" + nav_pages[3]

        lines = page_content.split("\n")

        # Scenario extraction
        header_idx = -1
        for i, l in enumerate(lines):
            if re.match(rf"^\s*Navigationsaufgabe\s+{nav_i}\s*$", l):
                header_idx = i
                break

        num_idx = -1
        for i, l in enumerate(lines):
            if "Nummer" in l and "Aufgabenstellung" in l:
                num_idx = i
                break

        scenario = ""
        if header_idx != -1 and num_idx != -1:
            scen_lines = [l.strip() for l in lines[header_idx + 1:num_idx] if l.strip()]
            scenario = " ".join(scen_lines)

        erg_col = 80
        header_found = False
        table_lines = []
        for l in lines:
            if "Nummer" in l and "Ergebnis" in l:
                erg_col = l.find("Ergebnis")
                header_found = True
                continue
            if header_found:
                if l.strip().startswith("Stand:") or l.strip().startswith("© Wasserstraßen") or l.strip().startswith("*)"):
                    break
                if any(h in l for h in ["ELWIS", "Sportschifffahrt", "Fragenkatalog", "Sie sind hier", "Sportbootführerscheine"]):
                    continue
                table_lines.append(l)

        rows = []
        cur_row = None
        for l in table_lines:
            col1 = l[:erg_col].strip() if len(l) >= erg_col else l.strip()
            col2 = l[erg_col:].strip() if len(l) >= erg_col else ""

            m_num = re.match(r"^(\d+)\.\s*(.*)", col1)
            if m_num:
                if cur_row:
                    rows.append(cur_row)
                cur_row = {
                    "id": m_num.group(1),
                    "text": m_num.group(2).strip(),
                    "ans": col2
                }
            else:
                if cur_row:
                    if col1:
                        cur_row["text"] += " " + col1
                    if col2:
                        cur_row["ans"] += (" " if cur_row["ans"] else "") + col2

        if cur_row:
            rows.append(cur_row)

        formatted_rows = []
        for r in rows:
            q_text = " ".join(r["text"].split())
            ans_text = " ".join(r["ans"].split())
            formatted_rows.append({
                "id": str(r["id"]),
                "text": q_text,
                "image": "n/a",
                "answers": [
                    {
                        "text": ans_text,
                        "image": "n/a",
                        "correct": "Y"
                    }
                ] if ans_text else []
            })

        nav_sections.append({
            "name": f"Navigationsaufgabe {nav_i}",
            "comment": scenario if scenario else "n/a",
            "questions": formatted_rows
        })

    sections = [
        {
            "name": "Basisfragen",
            "comment": "n/a",
            "questions": [q for q in questions if 1 <= int(q["id"]) <= 72]
        },
        {
            "name": "Spezifische Fragen See",
            "comment": "n/a",
            "questions": [q for q in questions if 73 <= int(q["id"]) <= 285]
        },
        {
            "name": "Navigationsaufgaben",
            "comment": overview_comment if overview_comment else "n/a",
            "questions": q_286_300
        }
    ]
    for ns in nav_sections:
        sections.append({
            "name": ns["name"],
            "comment": ns["comment"],
            "questions": ns["questions"]
        })

    doc = {
        "document_name": "Fragenkatalog-See-August-2023",
        "sections": sections
    }
    return doc

def main():
    binnen_doc = process_binnen()
    binnen_json_path = os.path.join(WORKSPACE_DIR, "Fragenkatalog-Binnen-August-2023.json")
    with open(binnen_json_path, "w", encoding="utf-8") as f:
        json.dump(binnen_doc, f, ensure_ascii=False, indent=2)
    print(f"Saved {binnen_json_path}")

    see_doc = process_see()
    see_json_path = os.path.join(WORKSPACE_DIR, "Fragenkatalog-See-August-2023.json")
    with open(see_json_path, "w", encoding="utf-8") as f:
        json.dump(see_doc, f, ensure_ascii=False, indent=2)
    print(f"Saved {see_json_path}")

if __name__ == "__main__":
    main()
