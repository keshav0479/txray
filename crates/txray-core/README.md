# txray-core

> Core Bitcoin primitives - transaction parsing, script classification, address derivation, block parsing.

Zero-dependency-on-bitcoin-rs implementation of the byte-level pieces every other txray crate builds on. Everything walks raw bytes directly so the toolkit stays portable, testable, and free of crate-version churn.

## What it does

- Decodes raw transactions (legacy and segwit) into structured `ParsedTx` values
- Classifies output scripts (P2PKH, P2SH, P2WPKH, P2WSH, P2TR, OP_RETURN, multisig, ...)
- Derives addresses for every standard script type
- Parses raw `blk*.dat` blocks plus `rev*.dat` UTXO undo files
- Computes txids, wtxids, weights, and merkle roots
- Defines the shared `TxrayError` type used across the workspace

## Public API

| Symbol | Purpose |
|---|---|
| `tx::parser::parse_raw_tx` | bytes -> `ParsedTx` |
| `tx::hash::compute_txid` / `compute_wtxid` | canonical hashing |
| `tx::weight::compute_weight_info` | virtual size / weight units |
| `tx::script::classify_output_script` | script class detection |
| `tx::address::derive_address` | script -> address string |
| `block::parser::parse_raw_block` / `extract_raw_transactions` | block-level decode |
| `block::merkle::compute_merkle_root` | header verification |
| `block::undo::parse_undo_file` | UTXO undo parsing |
| `error::TxrayError` | shared error type |

## Used by

`txray-lens`, `txray-sherlock`, `txray-smith`, `txray-cli`, `txray-tui` - every other crate in the workspace depends on this one.
