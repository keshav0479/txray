<div align="center">
  <img src="web/public/icon.svg" alt="txray" width="96">
  <h1>txray</h1>
  <p>
    <strong>Understand Bitcoin transactions beyond the block explorer view.</strong>
  </p>
  <p>
    <a href="#why-txray">Why</a> |
    <a href="#how-it-works">How it works</a> |
    <a href="#security-model">Security</a> |
    <a href="#development-and-testing">Development</a>
  </p>
</div>

---

txray is a local-first Bitcoin transaction analysis toolkit. It parses transactions and blocks, explains money flow, surfaces privacy heuristics, fingerprints wallet behavior, and builds unsigned PSBTs from one shared Rust engine.

The same core powers the CLI, TUI, and web app, so output stays consistent across terminal workflows, visual inspection, and demos.

## Why txray?

- **Explains structure** - inputs, outputs, scripts, fees, weight, locktime, warnings, and address formats.
- **Shows privacy signals** - common-input ownership, change detection, address reuse, batching, consolidation, self-transfer patterns, and OP_RETURN usage.
- **Models ambiguity** - bounded entropy analysis for input-to-output link possibilities.
- **Fingerprints wallet behavior** - ordering, RBF, locktime, low-R signatures, input consistency, and change placement.
- **Builds unsigned transactions** - coin selection, fee estimation, dust handling, RBF, locktime, and PSBT inspection.
- **Works locally** - no private keys, no signing, no telemetry, and configurable Bitcoin data sources.

## How It Works

1. **Fetch or load data** - use a raw transaction, fixture, block file, mempool API, Esplora API, or curated Bitcoin history entry.
2. **Parse with Rust** - txray-core handles byte-level transaction, script, block, weight, and address logic.
3. **Analyze behavior** - txray-lens and txray-sherlock produce warnings, explanations, heuristics, entropy, fingerprints, and advice.
4. **Build safely** - txray-smith creates unsigned PSBTs and reports fee, dust, RBF, and change-output decisions.
5. **Inspect anywhere** - use the CLI for scripts, the TUI for local review, or the web app for visual analysis.

## Interfaces

| Interface | Use it for |
|---|---|
| CLI | Automation, fixtures, scripting, CI, and direct terminal analysis. |
| TUI | Keyboard-driven local review without a browser. |
| Web app | Visual transaction lookup, block lookup, Sherlock analysis, Smith builds, and documentation. |

## Architecture

<div align="center">
  <img src="assets/architecture.svg" alt="txray architecture" width="760">
</div>

The web app is intentionally thin. API routes call the same `txray` binary used in the terminal, while the Rust crates own parsing, heuristics, fingerprinting, entropy, and PSBT construction.

## Quick Start

```bash
git clone https://github.com/keshav0479/txray.git
cd txray

# Run the web app
docker compose up -d --build
```

Open [localhost:3000](http://localhost:3000).

For local development:

```bash
cargo run -p txray-cli -- famous pizza

cd web
npm install
npm run dev
```

## CLI

```bash
cargo install --path crates/txray-cli
```

Known Bitcoin history:

```console
$ txray famous genesis
The Genesis Block
Mined by Satoshi on 2009-01-03. Contains the famous Times headline.

$ txray famous pizza
The Bitcoin Pizza Transaction
10,000 BTC for two Papa John's pizzas in block 57043.
```

Common commands:

```bash
txray fetch --block 170
txray fetch --tx <txid>
txray parse tx fixture.json
txray analyze blk.dat
txray explain fixture.json
txray fingerprint fixture.json
txray entropy fixture.json
txray advise fixture.json
txray build fixture.json
txray inspect <base64-psbt>
txray debug-script 76a914<hash>88ac --script-sig <hex>
```

## TUI

```bash
cargo run -p txray-tui
cargo run -p txray-tui -- path/to/fixture.json
```

Tabs include dashboard, transaction detail, heuristics, famous blocks, and script debugging. Navigate with `Tab`, `Shift+Tab`, or number keys `1` to `5`.

## Tech Stack

| Layer | Technology |
|---|---|
| Core | Rust workspace, Bitcoin byte parsing, script utilities, block file support |
| Network | reqwest, mempool API, Esplora API, local cache |
| Analysis | Lens explanations, Sherlock heuristics, entropy, wallet fingerprints |
| Builder | Smith PSBT generation, coin selection, fee estimation, inspection |
| Terminal | CLI and Ratatui TUI |
| Web | Next.js 16, React, TypeScript, Tailwind CSS |
| Packaging | Docker, GHCR image publishing, GitHub Actions |

## Security Model

txray analyzes public Bitcoin data and unsigned transaction fixtures. It does not ask for wallet seeds, does not accept private keys, and does not sign transactions.

### What is protected

- **Private keys are out of scope** - txray never needs wallet seeds or signing keys.
- **Unsigned by design** - Smith outputs PSBTs for external review and signing.
- **Configurable data sources** - point `TXRAY_MEMPOOL_API` and `TXRAY_ESPLORA_API` at infrastructure you control.
- **Proxy-aware rate limiting** - forwarded client IP headers are ignored unless explicitly trusted.
- **Local result storage** - generated analysis results live under `TXRAY_DATA_DIR`.

### Known limitations

| Area | Details |
|---|---|
| Public API trust | If you use public mempool or Esplora endpoints, availability and response integrity depend on those providers. |
| Heuristic certainty | Privacy heuristics are signals, not proof. txray reports them as explainable analysis, not ground truth. |
| Browser surface | The web app should be run behind normal production controls if exposed publicly. |

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `TXRAY_BIN` | `/usr/local/bin/txray` | CLI binary used by the web layer. |
| `TXRAY_MEMPOOL_API` | `https://mempool.space/api` | Primary Bitcoin data source. |
| `TXRAY_ESPLORA_API` | `https://blockstream.info/api` | Fallback Bitcoin data source. |
| `TXRAY_DATA_DIR` | OS temp directory plus `/txray` | Writable runtime data directory for generated results. |
| `TXRAY_TRUST_PROXY_HEADERS` | `false` | Enable only behind a trusted proxy that overwrites client IP headers. |
| `PORT` / `HOSTNAME` | `3000` / `0.0.0.0` | Host and port for the Next.js server. |

## Development and Testing

```bash
# Rust
cargo fmt --check
cargo test
cargo clippy --workspace --all-targets -- -D warnings
cargo audit

# Web
cd web
npm run test -- --run
npm run typecheck
npm run lint
npm run build
```

## License

MIT
