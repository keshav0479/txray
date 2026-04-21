# txray-smith

> PSBT building, coin selection, and transaction construction.

The "Smith" tool. Takes a high-level intent (these UTXOs, this fee policy, these payments) and returns a finished PSBT plus a report explaining every decision along the way. Built on the `bitcoin` crate for canonical PSBT serialization.

## What it does

- Parses txray fixture JSON describing UTXOs, payments, and policy
- Performs coin selection across multiple strategies
- Resolves RBF flags and locktime constraints
- Builds outputs (including change) and assembles the final PSBT
- Generates a report with warnings, weight estimates, and the chosen UTXO set
- Provides PSBT inspection (`inspect` module) for already-built PSBTs

## Public API

| Symbol | Purpose |
|---|---|
| `build_psbt_from_fixture(json)` | One-shot fixture -> PSBT JSON report |
| `parse_fixture` / `validate_fixture` | Manual fixture handling |
| `Fixture` / `Utxo` / `Payment` / `Policy` / `ChangeTemplate` | Fixture data model |
| `select_coins` (via `coin_selection`) | Plug-in coin selection algorithm |
| `CoinSelectionResult` | Selection output |
| `build_psbt` / `build_outputs` / `OutputEntry` | PSBT assembly primitives |
| `resolve_rbf_locktime` / `TxParams` | RBF + locktime handling |
| `generate_warnings` / `Warning` | Report warnings |
| `inspect` (module) | Inspect an existing base64 PSBT |
| `BuilderError` | Error type |

## Used by

`txray-cli` (`build`, `inspect`) and the Next.js `/api/build` route.
