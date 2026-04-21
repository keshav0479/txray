# txray-lens

> Transaction and block analysis - parse, explain, and generate warnings.

The "Lens" tool. Wraps `txray-core` with a higher-level analysis layer that turns raw bytes into an annotated, JSON-serializable story you can render in a browser, a terminal, or a TUI.

## What it does

- Reads txray fixture JSON, decodes the contained tx, and emits structured analysis
- Loads `blk*.dat` / `rev*.dat` / xor files and analyzes every tx in the block
- Generates plain-English warnings and explanations for unusual structure
- Owns the canonical JSON output schema consumed by the web UI

## Public API

| Symbol | Purpose |
|---|---|
| `analyze_transaction(fixture_path)` | Fixture file -> analysis JSON string |
| `analyze_block(blk, rev, xor)` | Block files -> per-tx analysis JSON |
| `explain` (module) | Human-readable walkthroughs for each script type |
| `warnings` (module) | Heuristic-free structural warnings (dust, weird sequence, ...) |

## Used by

`txray-cli` (the `parse`, `explain` subcommands) and the Next.js `/api/analyze` route.
