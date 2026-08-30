FROM python:3.11-slim

WORKDIR /app

# Copy application sources
COPY src/ /app/
# Copy catalogs and images
COPY input_documents/ /app/data/

ENV PORT=8000
ENV DATA_DIR=/app/data
EXPOSE 8000

CMD ["python3", "app.py", "--port", "8000", "--host", "0.0.0.0", "--data-dir", "/app/data"]
