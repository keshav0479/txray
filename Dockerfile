# Stage 1: Build Rust CLI
FROM rust:1.90-slim AS rust-builder

WORKDIR /build

# Install dependencies for building
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy Rust project files
COPY Cargo.toml Cargo.lock ./
COPY crates ./crates

# Build the CLI in release mode and strip debug symbols
RUN cargo build --release --bin txray && strip target/release/txray

# Stage 2: Build Next.js application
FROM node:22-slim AS web-builder

WORKDIR /build

# Copy web application files
COPY web/package.json web/package-lock.json ./
RUN npm ci

COPY web ./
RUN npm run build

# Stage 3: Production runtime
FROM node:22-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Create a dedicated non-root user. The image runs as `txray` from here on.
RUN groupadd --system txray \
 && useradd --system --gid txray --home-dir /app --shell /usr/sbin/nologin txray

# Copy Rust binary from rust-builder
COPY --from=rust-builder /build/target/release/txray /usr/local/bin/txray

# Copy Next.js build from web-builder, owned by the non-root user
COPY --from=web-builder --chown=txray:txray /build/.next/standalone ./
COPY --from=web-builder --chown=txray:txray /build/.next/static ./.next/static
COPY --from=web-builder --chown=txray:txray /build/public ./public

# Verify txray binary works (still as root, before USER switch)
RUN txray --version

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV TXRAY_BIN=/usr/local/bin/txray
ENV TXRAY_MEMPOOL_API=https://mempool.space/api
ENV TXRAY_ESPLORA_API=https://blockstream.info/api
ENV TXRAY_DATA_DIR=/tmp/txray
ENV TXRAY_TRUST_PROXY_HEADERS=false

USER txray

# Expose port
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "server.js"]
