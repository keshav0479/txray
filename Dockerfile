# Stage 1: Build Rust CLI
FROM rust:1.83-slim AS rust-builder

WORKDIR /build

# Install dependencies for building
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy Rust project files
COPY Cargo.toml Cargo.lock ./
COPY crates ./crates

# Build the CLI in release mode
RUN cargo build --release --bin txray

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

# Copy Rust binary from rust-builder
COPY --from=rust-builder /build/target/release/txray /usr/local/bin/txray

# Copy Next.js build from web-builder
COPY --from=web-builder /build/.next/standalone ./
COPY --from=web-builder /build/.next/static ./.next/static
COPY --from=web-builder /build/public ./public

# Verify txray binary works and strip debug symbols
RUN txray --version && strip /usr/local/bin/txray

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Expose port
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]
