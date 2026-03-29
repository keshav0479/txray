# txray

Modular Bitcoin transaction analysis and construction toolkit in Rust.

## Architecture

```
txray/
├── txray-core      Shared primitives: tx/block parsing, script classification,
│                   address derivation, weight estimation, script debugger
├── txray-lens      Transaction and block analysis with warnings and
│                   plain-English explanations
├── txray-sherlock  Chain analysis heuristics, wallet fingerprinting,
│                   Boltzmann entropy, privacy advisor
├── txray-smith     PSBT building, coin selection, fee estimation,
│                   PSBT inspector
├── txray-net       Fetch blocks/txs from mempool.space and Esplora
│                   with retry and disk cache
├── txray-corpus    8 historically significant blocks with educational
│                   annotations
└── txray-cli      Unified CLI: parse, analyze, build, fetch, explain,
                    fingerprint, entropy, debug-script, inspect, advise
```

<p align="center">
  <img src="assets/architecture.svg" alt="txray architecture diagram">
</p>

> `txray-smith` is self-contained. It uses the `bitcoin` crate for PSBT construction and does not depend on `txray-core`.
> `txray-net` is also independent: raw byte fetching only, no `txray-core` dependency.

## CLI

```bash
# browse famous Bitcoin blocks
txray famous
txray famous genesis
txray famous pizza

# fetch a block from the network
txray fetch --block 170                # by height
txray fetch --block 000000000019d6...  # by hash
txray fetch --tx <txid>                # fetch raw transaction
txray fetch --block 0 --source esplora # use Esplora API

# parse transactions and blocks
txray parse tx fixture.json
txray parse block blk.dat rev.dat xor.dat

# run chain analysis heuristics
txray analyze blk.dat rev.dat xor.dat

# build a PSBT from a fixture
txray build fixture.json

# explain a transaction in plain English
txray explain fixture.json

# wallet fingerprinting (BIP69, low-R, anti-fee-sniping)
txray fingerprint fixture.json

# Boltzmann entropy analysis (input→output ambiguity)
txray entropy fixture.json

# step-through script debugger
txray debug-script 76a914<hash>88ac --script-sig <hex>

# inspect a PSBT (signing status, fee analysis)
txray inspect <base64-psbt>

# privacy advisor (combined score + recommendations)
txray advise fixture.json
```

## Crates

### `txray-core`
Shared Bitcoin primitives. Parses transactions and blocks from raw bytes.

- **Transaction parsing**: segwit + legacy, inputs/outputs, witness data
- **Block parsing**: headers, merkle verification, multi-block files
- **Script classification**: P2PKH, P2SH, P2WPKH, P2WSH, P2TR, OP_RETURN
- **Address derivation**: Base58Check, Bech32, Bech32m
- **Undo data**: Bitcoin Core `rev*.dat` parsing, compressed script decompression
- **Weight estimation**: WU/vbyte with segwit discount
- **Script debugger**: opcode-by-opcode execution with stack snapshots (P2PKH, P2WPKH)

### `txray-lens`
Transaction and block analysis engine.

- Transaction breakdown: fees, timelocks, script types
- Block-level analysis with merkle root verification
- Warning system for anomalies
- Plain-English transaction explanations

### `txray-sherlock`
Chain analysis heuristic engine with advanced privacy analysis:

| Heuristic | Description |
|-----------|-------------|
| CIOH | Common-Input-Ownership Heuristic |
| Change Detection | Identifies likely change outputs |
| Address Reuse | Flags address reuse across inputs/outputs |
| CoinJoin | Detects equal-output CoinJoin patterns |
| Consolidation | Identifies UTXO consolidation transactions |
| Self-Transfer | Detects self-transfer patterns |
| OP_RETURN | Analyzes data carrier outputs |
| Round Number | Flags round-number payment heuristic |

**Advanced analysis modules:**

- **Wallet fingerprinting** — BIP69, low-R grinding, anti-fee-sniping, RBF signaling, change position; identifies Bitcoin Core, Electrum, Sparrow/Specter, Ledger
- **Boltzmann entropy** — subset-sum interpretation counting, link probability matrix, A–F privacy grading
- **Privacy advisor** — combines heuristics + entropy + fingerprint into a 1–10 score with actionable recommendations

### `txray-smith`
PSBT construction with coin selection.

- Largest-first coin selection with fee-aware UTXO filtering
- RBF/locktime interaction matrix (5 modes)
- Weight-accurate fee estimation per script type
- Dust threshold enforcement
- Warnings for high fees, missing RBF, dust change
- **PSBT inspector** — parsing, signing status, fee analysis, next-step recommendations

### `txray-net`
Fetch raw blocks and transactions from public APIs.

- **mempool.space** and **Blockstream Esplora** support
- Custom base URL
- Retry with exponential backoff (3 attempts)
- Disk cache at `~/.txray/cache/`

### `txray-corpus`
8 historically significant Bitcoin blocks with educational annotations:

Genesis Block · First Transaction · Pizza Transaction · First OP_RETURN · SegWit Activation · Largest Transaction · Wasabi CoinJoin · First Taproot Spends

Each entry explains why it's interesting and what to look for when parsing.

## Build

```bash
cargo build --workspace
cargo test --workspace     # 282 tests
cargo clippy --workspace   # zero warnings
```

## License

[MIT](LICENSE)
