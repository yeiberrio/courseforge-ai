# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:18-slim AS builder

WORKDIR /app

# Install build dependencies for canvas (native module)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    python3 \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN npx nest build

# ── Stage 2: Production ────────────────────────────────────────
FROM node:18-slim AS runner

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    ffmpeg \
    python3 \
    python3-pip \
    && pip3 install --break-system-packages edge-tts \
    && rm -rf /var/lib/apt/lists/*

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p uploads/documents uploads/generated

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
