# Stage 1: Build Next.js standalone
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
# Needs the full Rust toolchain because runner.rs spawns `cargo run`/`cargo test`
# at runtime to compile and execute user-submitted exercises.
# Also needs Node.js to run the Next.js standalone server.
FROM rust:1-slim

RUN apt-get update && apt-get install -y \
    nodejs libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Rust API binary
COPY --from=api-builder /app/target/release/rustlings_api .

# Next.js standalone bundle
# In a monorepo, Next.js nests the output under the package directory.
# standalone/ contains ui/server.js (not server.js at the root).
# Copying standalone/ to /app puts server.js at /app/ui/server.js.
COPY --from=ui-builder /app/ui/.next/standalone/    ./
COPY --from=ui-builder /app/ui/.next/static         ./ui/.next/static
COPY --from=ui-builder /app/ui/public               ./ui/public

RUN mkdir -p /data

ENV DATABASE_URL=sqlite:/data/rustlings.db
# API_BASE_URL is used by Next.js rewrites to reach the Rust API internally
ENV API_BASE_URL=http://localhost:3000
# Next.js standalone listens on this port (Fly.io exposes 8080)
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

EXPOSE 8080

# Boot sequence:
#   1. Sync exercises from GitHub into SQLite
#   2. Start Rust API in the background on port 3000
#   3. Start Next.js in the foreground on port 8080
CMD ["sh", "-c", "./rustlings_api sync && ./rustlings_api serve & node ui/server.js"]
