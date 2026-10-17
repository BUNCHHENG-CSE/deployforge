# ====================================================================
# Stage 1: Build Frontend Assets
# ====================================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN node node_modules/typescript/bin/tsc && node node_modules/vite/bin/vite.js build

# ====================================================================
# Stage 2: Production Python Application Runtime
# ====================================================================
FROM python:3.12-slim AS runner

WORKDIR /app

# Install security updates and curl for container healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend assets from stage 1 into frontend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Set environment
ENV PYTHONPATH=/app/backend
ENV PORT=8000
ENV ENVIRONMENT=production

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Launch uvicorn
CMD ["python", "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
