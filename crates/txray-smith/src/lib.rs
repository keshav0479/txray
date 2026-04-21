//! # txray-smith
//!
//! PSBT building, coin selection, and transaction construction.
//! Uses the `bitcoin` crate for PSBT serialization.
//!
//! Main entry point: `build_psbt_from_fixture()` - reads a fixture JSON string,
//! performs coin selection, builds a PSBT, and returns the report as JSON.

pub(crate) mod coin_selection;
pub(crate) mod error;
pub(crate) mod fixture;
pub mod inspect;
pub(crate) mod psbt;
pub(crate) mod report;
pub(crate) mod transaction;
pub(crate) mod weight;

// Selective re-exports for downstream consumers
pub use coin_selection::CoinSelectionResult;
pub use error::BuilderError;
pub use fixture::{
    parse_fixture, validate_fixture, ChangeTemplate, Fixture, Payment, Policy, Utxo,
};
pub use psbt::{build_outputs, build_psbt, OutputEntry};
pub use report::{generate_warnings, Warning};
pub use transaction::{resolve_rbf_locktime, TxParams};

/// Build a PSBT from a fixture JSON string.
/// Returns the report as a pretty-printed JSON string.
pub fn build_psbt_from_fixture(json_str: &str) -> Result<String, BuilderError> {
    // 1. Parse JSON -> Fixture
    let fixture = fixture::parse_fixture(json_str)?;

    // 2. Validate fixture
    fixture::validate_fixture(&fixture)?;

    // 3. Coin selection
    let selection = coin_selection::select_coins(&fixture)?;

    // 4. Resolve RBF/locktime
    let tx_params = transaction::resolve_rbf_locktime(&fixture);

    // 5. Build output entries (payments first, then change)
    let (outputs, change_index) = psbt::build_outputs(&fixture, &selection);

    // 6. Build PSBT
    let psbt_base64 = psbt::build_psbt(&selection, &outputs, &tx_params)?;

    // 7. Compute fee rate
    let fee_rate = selection.fee_sats as f64 / selection.vbytes as f64;

    // 8. Generate warnings
    let warnings = report::generate_warnings(
        selection.change_value.is_some(),
        selection.change_value,
        selection.fee_sats,
        fee_rate,
        tx_params.rbf_signaling,
    );

    // 9. Assemble report JSON
    let report = build_report(
        &fixture,
        &selection,
        &outputs,
        change_index,
        &tx_params,
        &psbt_base64,
        &warnings,
    );

    serde_json::to_string_pretty(&report)
        .map_err(|e| BuilderError::internal(format!("JSON serialization failed: {e}")))
}

/// Build the final JSON report with all 14 required fields.
fn build_report(
    fixture: &fixture::Fixture,
    selection: &coin_selection::CoinSelectionResult,
    outputs: &[psbt::OutputEntry],
    change_index: Option<usize>,
    tx_params: &transaction::TxParams,
    psbt_base64: &str,
    warnings: &[report::Warning],
) -> serde_json::Value {
    let fee_rate = selection.fee_sats as f64 / selection.vbytes as f64;

    serde_json::json!({
        "ok": true,
        "network": fixture.network,
        "strategy": "largest_first",
        "selected_inputs": selection.selected_utxos.iter().map(|u| {
            serde_json::json!({
                "txid": u.txid,
                "vout": u.vout,
                "value_sats": u.value_sats,
                "script_pubkey_hex": u.script_pubkey_hex,
                "script_type": u.script_type,
                "address": u.address,
            })
        }).collect::<Vec<_>>(),
        "outputs": outputs.iter().enumerate().map(|(i, o)| {
            serde_json::json!({
                "n": i,
                "value_sats": o.value_sats,
                "script_pubkey_hex": o.script_pubkey_hex,
                "script_type": o.script_type,
                "address": o.address,
                "is_change": o.is_change,
            })
        }).collect::<Vec<_>>(),
        "change_index": change_index,
        "fee_sats": selection.fee_sats,
        "fee_rate_sat_vb": (fee_rate * 100.0).round() / 100.0,
        "vbytes": selection.vbytes,
        "rbf_signaling": tx_params.rbf_signaling,
        "locktime": tx_params.n_lock_time,
        "locktime_type": tx_params.locktime_type,
        "psbt_base64": psbt_base64,
        "warnings": warnings.iter().map(|w| {
            serde_json::json!({"code": w.code})
        }).collect::<Vec<_>>(),
    })
}
