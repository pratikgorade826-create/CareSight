# CareSight Backend — Production Dockerfile for Google Cloud Run
# Python 3.12 slim base
FROM python:3.12-slim AS builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Final stage
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

# Create non-root user for security
RUN groupadd -r caresight && useradd -r -g caresight caresight

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application source
COPY app/ ./app/
COPY requirements.txt .

RUN mkdir -p uploads && chown -R caresight:caresight /app

USER caresight

EXPOSE 8080

# Cloud Run injects $PORT (default 8080)
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers 2
