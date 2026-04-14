# txray-corpus

> Curated corpus of historically significant Bitcoin blocks.

A static, hand-annotated list of eight blocks that teach Bitcoin by example. Used as both the `txray famous` browser and as a source of real chain data for tests.

## What it does

- Holds the canonical name, height, hash, description, and learning notes for each block
- Provides lookup-by-name and lookup-by-height helpers
- Doubles as test fixture data for the rest of the workspace

## The corpus

| Height | Block |
|---|---|
| 0 | Genesis Block |
| 170 | First Transaction (Hal Finney → Satoshi) |
| 57043 | The Pizza Transaction |
| 252490 | OP_RETURN data |
| 481824 | SegWit activation |
| 484986 | Largest transaction |
| 530484 | Wasabi CoinJoin |
| 709635 | Taproot activation |

## Public API

| Symbol | Purpose |
|---|---|
| `FamousBlock` | Annotated metadata for a single historic block |
| `FAMOUS_BLOCKS` | The full static slice |
| `list_famous()` | Borrow the corpus |
| `find_by_name(query)` | Case-insensitive name lookup |
| `find_by_height(height)` | Direct height lookup |

## Used by

`txray-cli` (the `famous` subcommand) and the Rust integration tests.
