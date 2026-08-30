#!/usr/bin/env python3
"""
Sail Training Web Application Server
A zero-dependency HTTP server built with Python standard library.
Serves question catalogs, images, and the single-page application frontend.
"""

import os
import sys
import json
import glob
import mimetypes
import argparse
from http import HTTPStatus
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, unquote

# Base directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

# Potential catalog search directories
SEARCH_DIRS = [
    os.path.join(BASE_DIR, "..", "input_documents"),
    os.path.join(BASE_DIR, "data"),
    os.path.join(BASE_DIR, "catalogs"),
    BASE_DIR,
]


def find_data_dir(custom_dir=None):
    """Find directory containing JSON question catalogs and images."""
    if custom_dir and os.path.isdir(custom_dir):
        return os.path.abspath(custom_dir)
    for d in SEARCH_DIRS:
        if os.path.isdir(d):
            json_files = glob.glob(os.path.join(d, "*.json"))
            if json_files:
                return os.path.abspath(d)
    return BASE_DIR


def get_available_catalogs(data_dir):
    """Scan data directory for catalog JSON files and return metadata summaries."""
    catalogs = []
    json_paths = sorted(glob.glob(os.path.join(data_dir, "*.json")))

    for path in json_paths:
        filename = os.path.basename(path)
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)

            doc_name = data.get("document_name", filename.replace(".json", ""))
            sections_summary = []
            total_questions = 0

            for sec in data.get("sections", []):
                sec_name = sec.get("name", "Unnamed Section")
                q_list = sec.get("questions", [])
                q_count = len(q_list)
                total_questions += q_count
                has_comment = sec.get("comment") not in (None, "n/a", "")
                sections_summary.append({
                    "name": sec_name,
                    "question_count": q_count,
                    "has_scenario": has_comment,
                })

            catalogs.append({
                "filename": filename,
                "document_name": doc_name,
                "title": doc_name.replace("-", " "),
                "total_questions": total_questions,
                "sections": sections_summary,
            })
        except Exception as err:
            print(f"Warning: Failed to parse catalog {filename}: {err}", file=sys.stderr)

    return catalogs


class SailTrainingHandler(SimpleHTTPRequestHandler):
    """HTTP Request Handler for Sail Training Web App."""

    data_dir = BASE_DIR

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def end_headers(self):
        """Add standard security and CORS headers."""
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-cache, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        """Handle CORS pre-flight requests."""
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_GET(self):
        """Handle GET requests for APIs, images, and static assets."""
        parsed_url = urlparse(self.path)
        path = unquote(parsed_url.path)

        # 1. API: List Catalogs
        if path == "/api/catalogs":
            return self.serve_catalogs_list()

        # 2. API: Get Specific Catalog
        if path.startswith("/api/catalog/"):
            filename = path.replace("/api/catalog/", "", 1)
            return self.serve_catalog_file(filename)

        # 3. API: Health Check
        if path == "/api/health":
            return self.send_json_response({"status": "ok", "app": "Sail Training SBF"})

        # 4. Images Route (/images/...)
        if path.startswith("/images/"):
            image_name = path.replace("/images/", "", 1)
            return self.serve_image(image_name)

        # 5. Root / SPA routes -> serve static files
        if path in ("", "/"):
            self.path = "/index.html"

        return super().do_GET()

    def send_json_response(self, data, status=HTTPStatus.OK):
        """Helper to send JSON response."""
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def serve_catalogs_list(self):
        """Return list of available catalogs."""
        catalogs = get_available_catalogs(self.data_dir)
        self.send_json_response({"catalogs": catalogs, "data_dir": self.data_dir})

    def serve_catalog_file(self, filename):
        """Return full JSON content for a requested catalog."""
        filename = os.path.basename(filename)
        if not filename.endswith(".json"):
            filename += ".json"

        target_file = os.path.join(self.data_dir, filename)
        if not os.path.isfile(target_file):
            self.send_json_response({"error": f"Catalog not found: {filename}"}, status=HTTPStatus.NOT_FOUND)
            return

        try:
            with open(target_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.send_json_response(data)
        except Exception as e:
            self.send_json_response({"error": f"Error reading catalog: {str(e)}"}, status=HTTPStatus.INTERNAL_SERVER_ERROR)

    def serve_image(self, image_name):
        """Serve images from the data directory's images/ subfolder."""
        image_name = os.path.basename(image_name)
        img_path = os.path.join(self.data_dir, "images", image_name)

        if not os.path.isfile(img_path):
            img_path = os.path.join(self.data_dir, image_name)

        if not os.path.isfile(img_path):
            self.send_response(HTTPStatus.NOT_FOUND)
            self.end_headers()
            self.wfile.write(b"Image not found")
            return

        mime_type, _ = mimetypes.guess_type(img_path)
        if not mime_type:
            mime_type = "image/jpeg"

        try:
            with open(img_path, "rb") as f:
                content = f.read()

            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", mime_type)
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "public, max-age=86400")
            self.end_headers()
            self.wfile.write(content)
        except Exception as err:
            self.send_response(HTTPStatus.INTERNAL_SERVER_ERROR)
            self.end_headers()
            self.wfile.write(str(err).encode("utf-8"))


def create_wsgi_app(data_dir=None):
    """WSGI callable for production deployments (Gunicorn, Render, Railway)."""
    resolved_data_dir = find_data_dir(data_dir)

    def application(environ, start_response):
        path = environ.get("PATH_INFO", "/")

        if path == "/api/catalogs":
            catalogs = get_available_catalogs(resolved_data_dir)
            body = json.dumps({"catalogs": catalogs, "data_dir": resolved_data_dir}, ensure_ascii=False).encode("utf-8")
            start_response("200 OK", [
                ("Content-Type", "application/json; charset=utf-8"),
                ("Content-Length", str(len(body))),
                ("Access-Control-Allow-Origin", "*"),
            ])
            return [body]

        if path.startswith("/api/catalog/"):
            filename = os.path.basename(path.replace("/api/catalog/", "", 1))
            if not filename.endswith(".json"):
                filename += ".json"
            target = os.path.join(resolved_data_dir, filename)
            if os.path.isfile(target):
                with open(target, "r", encoding="utf-8") as f:
                    content = f.read().encode("utf-8")
                start_response("200 OK", [
                    ("Content-Type", "application/json; charset=utf-8"),
                    ("Content-Length", str(len(content))),
                    ("Access-Control-Allow-Origin", "*"),
                ])
                return [content]
            else:
                body = json.dumps({"error": "Catalog not found"}).encode("utf-8")
                start_response("404 Not Found", [
                    ("Content-Type", "application/json"),
                    ("Content-Length", str(len(body))),
                ])
                return [body]

        if path.startswith("/images/"):
            img_name = os.path.basename(path.replace("/images/", "", 1))
            img_path = os.path.join(resolved_data_dir, "images", img_name)
            if not os.path.isfile(img_path):
                img_path = os.path.join(resolved_data_dir, img_name)
            if os.path.isfile(img_path):
                mime, _ = mimetypes.guess_type(img_path)
                mime = mime or "image/jpeg"
                with open(img_path, "rb") as f:
                    img_data = f.read()
                start_response("200 OK", [
                    ("Content-Type", mime),
                    ("Content-Length", str(len(img_data))),
                    ("Cache-Control", "public, max-age=86400"),
                ])
                return [img_data]
            else:
                start_response("404 Not Found", [("Content-Type", "text/plain")])
                return [b"Image not found"]

        rel_path = path.lstrip("/")
        if not rel_path or rel_path == "":
            rel_path = "index.html"
        static_file = os.path.join(STATIC_DIR, rel_path)
        if os.path.isfile(static_file):
            mime, _ = mimetypes.guess_type(static_file)
            mime = mime or "application/octet-stream"
            with open(static_file, "rb") as f:
                data = f.read()
            start_response("200 OK", [
                ("Content-Type", mime),
                ("Content-Length", str(len(data))),
            ])
            return [data]

        start_response("404 Not Found", [("Content-Type", "text/plain")])
        return [b"Not Found"]

    return application


app = create_wsgi_app()


def run_server(host="0.0.0.0", port=8000, data_dir=None):
    """Run standalone HTTP server."""
    resolved_data_dir = find_data_dir(data_dir)
    SailTrainingHandler.data_dir = resolved_data_dir

    server_address = (host, port)
    httpd = HTTPServer(server_address, SailTrainingHandler)

    print("=" * 60)
    print(" ⛵ Sail Training SBF Web App Server")
    print("=" * 60)
    print(f" Serving at:        http://localhost:{port}")
    if host == "0.0.0.0":
        print(f" Network access:    http://0.0.0.0:{port}")
    print(f" Static files:      {STATIC_DIR}")
    print(f" Data directory:    {resolved_data_dir}")
    catalogs = get_available_catalogs(resolved_data_dir)
    print(f" Catalogs detected: {len(catalogs)}")
    for cat in catalogs:
        print(f"   • {cat['document_name']} ({cat['total_questions']} questions)")
    print("=" * 60)
    print(" Press Ctrl+C to stop the server.\n")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sail Training Web Application Server")
    parser.add_argument("--host", default=os.getenv("HOST", "0.0.0.0"), help="Host to bind to (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=int(os.getenv("PORT", 8000)), help="Port to listen on (default: 8000)")
    parser.add_argument("--data-dir", default=os.getenv("DATA_DIR", None), help="Path to directory with JSON catalogs and images")

    args = parser.parse_args()
    run_server(host=args.host, port=args.port, data_dir=args.data_dir)
