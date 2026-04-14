# txray web

Next.js frontend for [txray](../README.md). Shells out to the `txray` Rust CLI for all analysis work.

## Dev

```bash
cargo build --release -p txray-cli   # from repo root
npm install
npm run dev
```

The dev server looks for the binary at `../target/release/txray` or `../target/debug/txray`. Set `TXRAY_BIN` to override.

## Routes

- `/lens` - transaction analysis
- `/sherlock` - privacy / heuristic analysis
- `/smith` - PSBT builder
- `/api/health` - liveness probe (verifies the CLI binary is reachable)

## Production

Use the repo-root `Dockerfile` / `docker-compose.yml` - it builds the Rust CLI and the Next.js standalone bundle into a single image.
