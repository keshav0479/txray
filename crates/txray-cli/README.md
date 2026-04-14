# txray-cli

> The unified `txray` binary - parse, analyze, build, and learn from one terminal entry point.

A clap-driven CLI that fronts every other crate in the workspace. The Next.js web app shells out to this same binary, so anything you can do in the browser you can also script from a shell.

## What it does

- Subcommands for parsing, analyzing, building, explaining, fingerprinting, advising, and inspecting transactions
- Pretty terminal output with color-coded warnings and famous-block annotations
- `txray fetch` pulls raw blocks/txs from public APIs (configurable via `TXRAY_MEMPOOL_API` and `TXRAY_ESPLORA_API`)
- `txray famous` browses the curated corpus of historically significant blocks
- `txray debug-script` and `txray inspect` for low-level investigation

## Subcommands

| Command | What it runs |
|---|---|
| `txray famous [name]` | List or look up famous blocks via `txray-corpus` |
| `txray fetch --block <id> \| --tx <id>` | Pull raw bytes via `txray-net` |
| `txray parse tx <fixture>` | Decode a fixture using `txray-core` |
| `txray analyze <blk> <rev> <xor>` | Run heuristics via `txray-sherlock` |
| `txray build <fixture>` | Construct a PSBT via `txray-smith` |
| `txray explain <fixture>` | Plain-English walkthrough via `txray-lens` |
| `txray fingerprint \| entropy \| advise` | Privacy suite via `txray-sherlock` |
| `txray debug-script <hex>` | Step a script through the interpreter |
| `txray inspect <psbt>` | Decode a base64 PSBT |

## Install

```bash
cargo install --path crates/txray-cli
```

## Used by

The Next.js web app under `web/` - every API route shells out to this binary. Path is overridable via `TXRAY_BIN`.
