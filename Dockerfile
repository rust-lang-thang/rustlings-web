# Stage 1: Build Next.js static export
FROM node:22-slim AS ui-builder

WORKDIR /app
COPY package.json package-lock.json ./
COPY ui/package.json ./ui/
RUN npm ci

COPY ui/ ./ui/
RUN npm run build:ui

# Stage 2: Build Rust API
FROM rust:1 AS api-builder

WORKDIR /app
COPY api/ ./
RUN cargo build --release

# Stage 3: Runtime
# Keeps the full Rust toolchain because runner.rs spawns `cargo run`/`cargo test`
# at runtime to compile and execute user-submitted exercises.
FROM rust:1-slim

RUN apt-get update && apt-get install -y \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=api-builder /app/target/release/rustlings_api .
COPY --from=ui-builder /app/ui/out ./ui/out

RUN mkdir -p /data

ENV DATABASE_URL=sqlite:/data/rustlings.db
ENV UI_DIR=/app/ui/out

EXPOSE 3000

CMD ["sh", "-c", "./rustlings_api sync && ./rustlings_api serve"]
