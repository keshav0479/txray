# txray-sherlock

> Chain analysis heuristics - CIOH, change detection, CoinJoin, wallet fingerprinting.

The "Sherlock" tool. Runs every txray privacy heuristic over a single transaction or a whole block and rolls the results up into a privacy score, a fee-rate distribution, and a set of concrete recommendations.

## What it does

- Applies eight heuristics: common-input-ownership, change detection, address reuse, equal-output CoinJoin, consolidation, peel chain, …
- Computes Boltzmann mixing entropy
- Detects wallet fingerprints (Bitcoin Core, Electrum, Wasabi, Samourai, …)
- Rolls per-tx findings into a 1–10 privacy score and an `AnalysisSummary`
- Generates concrete `advise` output ("use a different wallet for change", "consolidate during low-fee windows", …)

## Public API

| Symbol | Purpose |
|---|---|
| `analyze_block_file(blk, rev, xor)` | Top-level block analysis |
| `BlockOutput` / `AnalysisSummary` | Structured results |
| `generate_markdown` | Render results as a markdown report |
| `compute_fee_stats` | Per-block fee-rate histogram |
| `heuristics::*` | Individual heuristic functions, each pure and testable |
| `entropy::compute_boltzmann_entropy` | Mixing entropy score |
| `fingerprint::*` | Wallet fingerprint detection |
| `advisor::generate_advice` | Plain-English recommendations |

## Used by

`txray-cli` (`analyze`, `fingerprint`, `entropy`, `advise`) and the Next.js `/api/sherlock/*` routes.
