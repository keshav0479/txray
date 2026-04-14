# txray-net

> Fetch raw Bitcoin blocks and transactions from public APIs.

A thin async client over mempool.space and Blockstream Esplora with retry, exponential backoff, and on-disk caching. Honors environment variables so operators can self-host without rebuilding.

## What it does

- Fetches raw block bytes by hash or height
- Fetches raw transactions by txid
- Retries failed requests three times with exponential backoff
- Caches block payloads on disk to avoid re-downloading
- Falls back from a primary source to a secondary source on transient failure

## Public API

| Symbol | Purpose |
|---|---|
| `ApiSource` (enum) | `MempoolSpace`, `Esplora`, or `Custom(url)` |
| `ApiSource::primary_from_env` | Reads `TXRAY_MEMPOOL_API` |
| `ApiSource::secondary_from_env` | Reads `TXRAY_ESPLORA_API` |
| `BlockId` (enum) | `Hash(String)` or `Height(u64)` |
| `fetch_block_hash(source, height)` | Resolve a height to its block hash |
| `fetch_raw_block(source, id)` | Cached raw block fetch |
| `fetch_raw_tx(source, txid)` | Raw tx fetch |
| `fetch_raw_block_with_fallback(id)` | Tries primary, then secondary |
| `fetch_raw_tx_with_fallback(txid)` | Tries primary, then secondary |
| `NetError` | Error type with `NotFound` / `Http` / `InvalidResponse` variants |

## Environment

| Variable | Default |
|---|---|
| `TXRAY_MEMPOOL_API` | `https://mempool.space/api` |
| `TXRAY_ESPLORA_API` | `https://blockstream.info/api` |

## Used by

`txray-cli` (the `fetch` subcommand) and any tool that wants live chain data.
