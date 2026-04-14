use serde::Deserialize;
use std::collections::HashSet;

use crate::error::BuilderError;

// ─── Top-level fixture ──────────────────────────────────────────────────────

/// Top-level fixture JSON structure.
/// NO #[serde(deny_unknown_fields)] - extra fields silently ignored (README line 150).
#[derive(Debug, Deserialize)]
pub struct Fixture {
    pub network: String,
    pub utxos: Vec<Utxo>,
    pub payments: Vec<Payment>,
    pub change: ChangeTemplate,
    pub fee_rate_sat_vb: f64,
    #[serde(default)]
    pub rbf: Option<bool>,
    #[serde(default)]
    pub locktime: Option<u32>,
    #[serde(default)]
    pub current_height: Option<u32>,
    #[serde(default)]
    pub policy: Option<Policy>,
}

// ─── Sub-structures ─────────────────────────────────────────────────────────

/// A UTXO available for spending.
/// Extra fields silently ignored - no deny_unknown_fields.
#[derive(Debug, Deserialize, Clone)]
pub struct Utxo {
    pub txid: String,
    pub vout: u32,
    pub value_sats: u64,
    pub script_pubkey_hex: String,
    pub script_type: String,
    #[serde(default)]
    pub address: Option<String>,
}

/// A payment to be made.
/// Extra fields silently ignored.
#[derive(Debug, Deserialize, Clone)]
pub struct Payment {
    pub value_sats: u64,
    pub script_pubkey_hex: String,
    #[serde(default)]
    pub script_type: Option<String>,
    #[serde(default)]
    pub address: Option<String>,
}

/// Template for the change output.
#[derive(Debug, Deserialize, Clone)]
pub struct ChangeTemplate {
    pub script_pubkey_hex: String,
    pub script_type: String,
    #[serde(default)]
    pub address: Option<String>,
}

/// Optional policy constraints.
#[derive(Debug, Deserialize, Clone)]
pub struct Policy {
    #[serde(default)]
    pub max_inputs: Option<usize>,
}

// ─── Parsing ────────────────────────────────────────────────────────────────

/// Parse a fixture from a JSON string.
pub fn parse_fixture(json_str: &str) -> Result<Fixture, BuilderError> {
    let fixture: Fixture = serde_json::from_str(json_str)?;
    Ok(fixture)
}

// ─── Validation ─────────────────────────────────────────────────────────────

/// Validate a parsed fixture. Returns Ok(()) or an INVALID_FIXTURE error.
pub fn validate_fixture(fixture: &Fixture) -> Result<(), BuilderError> {
    // 1. UTXOs must be non-empty
    if fixture.utxos.is_empty() {
        return Err(BuilderError::invalid_fixture("utxos array is empty"));
    }

    // 2. Payments must be non-empty
    if fixture.payments.is_empty() {
        return Err(BuilderError::invalid_fixture("payments array is empty"));
    }

    // 3. Fee rate must be positive and finite (NaN and infinity must be rejected)
    if fixture.fee_rate_sat_vb <= 0.0 || fixture.fee_rate_sat_vb.is_infinite() {
        return Err(BuilderError::invalid_fixture(
            "fee_rate_sat_vb must be a positive finite number",
        ));
    }

    // 4. Validate each UTXO
    let mut seen_outpoints = HashSet::new();
    for (i, utxo) in fixture.utxos.iter().enumerate() {
        validate_txid(&utxo.txid, i)?;
        validate_hex_field(
            &utxo.script_pubkey_hex,
            &format!("utxos[{i}].script_pubkey_hex"),
        )?;
        if utxo.value_sats == 0 {
            return Err(BuilderError::invalid_fixture(format!(
                "utxos[{i}].value_sats must be > 0"
            )));
        }
        if utxo.script_type.is_empty() {
            return Err(BuilderError::invalid_fixture(format!(
                "utxos[{i}].script_type is empty"
            )));
        }

        // Check for duplicate outpoints
        let outpoint = (utxo.txid.clone(), utxo.vout);
        if !seen_outpoints.insert(outpoint) {
            return Err(BuilderError::invalid_fixture(format!(
                "duplicate UTXO: txid={} vout={}",
                utxo.txid, utxo.vout
            )));
        }
    }

    // 5. Validate each payment
    for (i, payment) in fixture.payments.iter().enumerate() {
        validate_hex_field(
            &payment.script_pubkey_hex,
            &format!("payments[{i}].script_pubkey_hex"),
        )?;
        if payment.value_sats == 0 {
            return Err(BuilderError::invalid_fixture(format!(
                "payments[{i}].value_sats must be > 0"
            )));
        }
    }

    // 6. Validate change template
    validate_hex_field(
        &fixture.change.script_pubkey_hex,
        "change.script_pubkey_hex",
    )?;
    if fixture.change.script_type.is_empty() {
        return Err(BuilderError::invalid_fixture("change.script_type is empty"));
    }

    // 7. Validate policy
    if let Some(ref policy) = fixture.policy {
        if let Some(max_inputs) = policy.max_inputs {
            if max_inputs == 0 {
                return Err(BuilderError::invalid_fixture(
                    "policy.max_inputs must be > 0",
                ));
            }
        }
    }

    Ok(())
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/// Validate that a txid is exactly 64 hex characters.
fn validate_txid(txid: &str, utxo_index: usize) -> Result<(), BuilderError> {
    if txid.len() != 64 {
        return Err(BuilderError::invalid_fixture(format!(
            "utxos[{utxo_index}].txid must be 64 hex chars, got {}",
            txid.len()
        )));
    }
    if !txid.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(BuilderError::invalid_fixture(format!(
            "utxos[{utxo_index}].txid contains non-hex characters"
        )));
    }
    Ok(())
}

/// Validate that a hex field is non-empty, even length, and valid hex.
fn validate_hex_field(hex_str: &str, field_name: &str) -> Result<(), BuilderError> {
    if hex_str.is_empty() {
        return Err(BuilderError::invalid_fixture(format!(
            "{field_name} is empty"
        )));
    }
    if !hex_str.len().is_multiple_of(2) {
        return Err(BuilderError::invalid_fixture(format!(
            "{field_name} has odd length (not valid hex bytes)"
        )));
    }
    if !hex_str.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(BuilderError::invalid_fixture(format!(
            "{field_name} contains non-hex characters"
        )));
    }
    Ok(())
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    /// Helper: minimal valid fixture JSON
    fn valid_fixture_json() -> String {
        r#"{
            "network": "mainnet",
            "fee_rate_sat_vb": 5.0,
            "utxos": [{
                "txid": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "vout": 0,
                "value_sats": 100000,
                "script_pubkey_hex": "0014aabbccddee0011223344556677889900aabbccdd",
                "script_type": "p2wpkh",
                "address": "bc1qtest"
            }],
            "payments": [{
                "value_sats": 50000,
                "script_pubkey_hex": "0014aabbccddee0011223344556677889900aabbccdd",
                "address": "bc1qrecipient"
            }],
            "change": {
                "script_pubkey_hex": "0014aabbccddee0011223344556677889900aabbccdd",
                "script_type": "p2wpkh",
                "address": "bc1qchange"
            }
        }"#
        .to_string()
    }

    #[test]
    fn test_parse_valid_basic() {
        let json = valid_fixture_json();
        let fixture = parse_fixture(&json).unwrap();
        assert_eq!(fixture.network, "mainnet");
        assert_eq!(fixture.utxos.len(), 1);
        assert_eq!(fixture.payments.len(), 1);
        assert_eq!(fixture.fee_rate_sat_vb, 5.0);
        assert!(fixture.rbf.is_none());
        assert!(fixture.locktime.is_none());
        assert!(fixture.current_height.is_none());
        assert!(fixture.policy.is_none());
        validate_fixture(&fixture).unwrap();
    }

    #[test]
    fn test_parse_missing_utxos() {
        let json = r#"{
            "network": "mainnet",
            "fee_rate_sat_vb": 5.0,
            "payments": [{"value_sats": 50000, "script_pubkey_hex": "0014aa"}],
            "change": {"script_pubkey_hex": "0014aa", "script_type": "p2wpkh"}
        }"#;
        let result = parse_fixture(json);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.code, "INVALID_FIXTURE");
    }

    #[test]
    fn test_parse_empty_payments() {
        let json = r#"{
            "network": "mainnet",
            "fee_rate_sat_vb": 5.0,
            "utxos": [{"txid": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "vout": 0, "value_sats": 100000, "script_pubkey_hex": "0014aabbccddee0011223344556677889900aabbccdd", "script_type": "p2wpkh"}],
            "payments": [],
            "change": {"script_pubkey_hex": "0014aabbccddee0011223344556677889900aabbccdd", "script_type": "p2wpkh"}
        }"#;
        let fixture = parse_fixture(json).unwrap();
        let result = validate_fixture(&fixture);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.message.contains("payments"));
    }

    #[test]
    fn test_parse_bad_txid() {
        // txid too short
        let json = r#"{
            "network": "mainnet",
            "fee_rate_sat_vb": 5.0,
            "utxos": [{"txid": "abcd", "vout": 0, "value_sats": 100000, "script_pubkey_hex": "0014aabbccddee0011223344556677889900aabbccdd", "script_type": "p2wpkh"}],
            "payments": [{"value_sats": 50000, "script_pubkey_hex": "0014aabbccddee0011223344556677889900aabbccdd"}],
            "change": {"script_pubkey_hex": "0014aabbccddee0011223344556677889900aabbccdd", "script_type": "p2wpkh"}
        }"#;
        let fixture = parse_fixture(json).unwrap();
        let result = validate_fixture(&fixture);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.message.contains("txid"));
    }

    #[test]
    fn test_parse_duplicate_utxos() {
        let json = r#"{
            "network": "mainnet",
            "fee_rate_sat_vb": 5.0,
            "utxos": [
                {"txid": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "vout": 0, "value_sats": 100000, "script_pubkey_hex": "0014aabbccddee0011223344556677889900aabbccdd", "script_type": "p2wpkh"},
                {"txid": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "vout": 0, "value_sats": 200000, "script_pubkey_hex": "0014aabbccddee0011223344556677889900aabbccdd", "script_type": "p2wpkh"}
            ],
            "payments": [{"value_sats": 50000, "script_pubkey_hex": "0014aabbccddee0011223344556677889900aabbccdd"}],
            "change": {"script_pubkey_hex": "0014aabbccddee0011223344556677889900aabbccdd", "script_type": "p2wpkh"}
        }"#;
        let fixture = parse_fixture(json).unwrap();
        let result = validate_fixture(&fixture);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.message.contains("duplicate"));
    }

    #[test]
    fn test_parse_extra_fields_ignored() {
        // Extra fields at all levels - MUST NOT cause errors
        let json = r#"{
            "network": "mainnet",
            "fee_rate_sat_vb": 5.0,
            "internal_id": "test-123",
            "utxos": [{
                "txid": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "vout": 0,
                "value_sats": 100000,
                "script_pubkey_hex": "0014aabbccddee0011223344556677889900aabbccdd",
                "script_type": "p2wpkh",
                "extra_field": "should be ignored",
                "derivation_path": "m/84'/0'/0'/0/0"
            }],
            "payments": [{
                "value_sats": 50000,
                "script_pubkey_hex": "0014aabbccddee0011223344556677889900aabbccdd",
                "label": "ignored label"
            }],
            "change": {
                "script_pubkey_hex": "0014aabbccddee0011223344556677889900aabbccdd",
                "script_type": "p2wpkh",
                "metadata": {"nested": true}
            },
            "version": 2,
            "notes": "this fixture has extra metadata"
        }"#;
        let fixture = parse_fixture(json).unwrap();
        validate_fixture(&fixture).unwrap();
        assert_eq!(fixture.utxos[0].value_sats, 100000);
    }
}
