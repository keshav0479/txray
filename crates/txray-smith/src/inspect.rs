//! PSBT Inspector — human-readable breakdown of base64-encoded PSBTs.
//!
//! Parses a PSBT, extracts per-input and per-output details, determines
//! signing status, and generates actionable next-step recommendations.

use bitcoin::psbt::Psbt;
use serde::Serialize;

/// Overall signing status of a PSBT.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub enum PsbtStatus {
    /// No inputs have signatures
    Unsigned,
    /// Some inputs have signatures but not all
    PartiallySigned,
    /// All inputs have at least one signature
    FullySigned,
}

/// Inspection result for a single PSBT input.
#[derive(Debug, Clone, Serialize)]
pub struct InputInspection {
    /// Input index
    pub index: usize,
    /// Whether a UTXO is attached (witness_utxo or non_witness_utxo)
    pub has_utxo: bool,
    /// Whether this input has at least one partial signature
    pub is_signed: bool,
    /// Number of partial signatures present
    pub partial_sig_count: usize,
    /// Sighash type if specified
    pub sighash_type: Option<String>,
    /// Value in satoshis (if UTXO is attached)
    pub value_sats: Option<u64>,
}

/// Inspection result for a single PSBT output.
#[derive(Debug, Clone, Serialize)]
pub struct OutputInspection {
    /// Output index
    pub index: usize,
    /// Value in satoshis
    pub value_sats: u64,
    /// Script type (best effort)
    pub script_type: String,
}

/// Full PSBT inspection result.
#[derive(Debug, Clone, Serialize)]
pub struct PsbtInspection {
    /// PSBT version (0 for v0, 2 for v2, etc.)
    pub version: u32,
    /// Number of inputs
    pub input_count: usize,
    /// Number of outputs
    pub output_count: usize,
    /// Per-input details
    pub inputs: Vec<InputInspection>,
    /// Per-output details
    pub outputs: Vec<OutputInspection>,
    /// Total input value (if all UTXOs are attached)
    pub total_input_sats: Option<u64>,
    /// Total output value
    pub total_output_sats: u64,
    /// Estimated fee (if all UTXOs are attached)
    pub fee_sats: Option<u64>,
    /// Overall signing status
    pub status: PsbtStatus,
    /// Recommended next steps
    pub next_steps: Vec<String>,
    /// Warnings (high fee, missing fields, etc.)
    pub warnings: Vec<String>,
}

/// Inspect a base64-encoded PSBT and return a human-readable breakdown.
pub fn inspect_psbt(base64_str: &str) -> Result<PsbtInspection, String> {
    // Decode base64
    use bitcoin::base64::prelude::*;
    let bytes = BASE64_STANDARD
        .decode(base64_str.trim())
        .map_err(|e| format!("Invalid base64: {}", e))?;

    // Parse PSBT
    let psbt = Psbt::deserialize(&bytes).map_err(|e| format!("Invalid PSBT: {}", e))?;

    let version = psbt.version;
    let tx = &psbt.unsigned_tx;

    let input_count = tx.input.len();
    let output_count = tx.output.len();

    // Inspect inputs
    let mut inputs = Vec::with_capacity(input_count);
    let mut all_have_utxo = true;
    let mut total_input: u64 = 0;
    let mut any_signed = false;
    let mut all_signed = true;

    for (i, psbt_input) in psbt.inputs.iter().enumerate() {
        let has_utxo = psbt_input.witness_utxo.is_some() || psbt_input.non_witness_utxo.is_some();
        let partial_sig_count = psbt_input.partial_sigs.len();
        let is_signed = partial_sig_count > 0 || psbt_input.final_script_sig.is_some() || psbt_input.final_script_witness.is_some();

        if is_signed {
            any_signed = true;
        } else {
            all_signed = false;
        }

        if !has_utxo {
            all_have_utxo = false;
        }

        let value_sats = if let Some(ref utxo) = psbt_input.witness_utxo {
            let val = utxo.value.to_sat();
            total_input += val;
            Some(val)
        } else if let Some(ref full_tx) = psbt_input.non_witness_utxo {
            let vout = tx.input[i].previous_output.vout as usize;
            if vout < full_tx.output.len() {
                let val = full_tx.output[vout].value.to_sat();
                total_input += val;
                Some(val)
            } else {
                all_have_utxo = false;
                None
            }
        } else {
            None
        };

        let sighash_type = psbt_input.sighash_type.map(|st| format!("{:?}", st));

        inputs.push(InputInspection {
            index: i,
            has_utxo,
            is_signed,
            partial_sig_count,
            sighash_type,
            value_sats,
        });
    }

    // Inspect outputs
    let mut outputs = Vec::with_capacity(output_count);
    let mut total_output: u64 = 0;

    for (i, tx_output) in tx.output.iter().enumerate() {
        let value = tx_output.value.to_sat();
        total_output += value;

        let script_type = classify_script_type(&tx_output.script_pubkey);

        outputs.push(OutputInspection {
            index: i,
            value_sats: value,
            script_type,
        });
    }

    // Calculate fee
    let total_input_sats = if all_have_utxo {
        Some(total_input)
    } else {
        None
    };

    let fee_sats = total_input_sats.map(|input| input.saturating_sub(total_output));

    // Determine status
    let status = if input_count == 0 {
        PsbtStatus::Unsigned
    } else if all_signed {
        PsbtStatus::FullySigned
    } else if any_signed {
        PsbtStatus::PartiallySigned
    } else {
        PsbtStatus::Unsigned
    };

    // Generate next steps
    let next_steps = generate_next_steps(&status, &inputs);

    // Generate warnings
    let warnings = generate_warnings(&inputs, fee_sats, total_output);

    Ok(PsbtInspection {
        version,
        input_count,
        output_count,
        inputs,
        outputs,
        total_input_sats,
        total_output_sats: total_output,
        fee_sats,
        status,
        next_steps,
        warnings,
    })
}

/// Classify a bitcoin script into a human-readable type string.
fn classify_script_type(script: &bitcoin::ScriptBuf) -> String {
    if script.is_p2pkh() {
        "p2pkh".to_string()
    } else if script.is_p2sh() {
        "p2sh".to_string()
    } else if script.is_p2wpkh() {
        "p2wpkh".to_string()
    } else if script.is_p2wsh() {
        "p2wsh".to_string()
    } else if script.is_p2tr() {
        "p2tr".to_string()
    } else if script.is_op_return() {
        "op_return".to_string()
    } else {
        "unknown".to_string()
    }
}

/// Generate recommended next steps based on the PSBT signing status.
fn generate_next_steps(status: &PsbtStatus, inputs: &[InputInspection]) -> Vec<String> {
    let mut steps = Vec::new();

    match status {
        PsbtStatus::Unsigned => {
            let missing_utxo: Vec<usize> = inputs
                .iter()
                .filter(|inp| !inp.has_utxo)
                .map(|inp| inp.index)
                .collect();

            if !missing_utxo.is_empty() {
                steps.push(format!(
                    "Attach UTXO data for input(s): {:?}",
                    missing_utxo
                ));
            }
            steps.push("Sign with the required key(s)".to_string());
        }
        PsbtStatus::PartiallySigned => {
            let unsigned: Vec<usize> = inputs
                .iter()
                .filter(|inp| !inp.is_signed)
                .map(|inp| inp.index)
                .collect();
            steps.push(format!(
                "Sign remaining input(s): {:?}",
                unsigned
            ));
        }
        PsbtStatus::FullySigned => {
            steps.push("Finalize the PSBT".to_string());
            steps.push("Extract the raw transaction".to_string());
            steps.push("Broadcast to the network".to_string());
        }
    }

    steps
}

/// Generate warnings for potential issues.
fn generate_warnings(
    inputs: &[InputInspection],
    fee_sats: Option<u64>,
    total_output: u64,
) -> Vec<String> {
    let mut warnings = Vec::new();

    // Missing UTXO data
    let missing_count = inputs.iter().filter(|inp| !inp.has_utxo).count();
    if missing_count > 0 {
        warnings.push(format!(
            "{} input(s) missing UTXO data — fee cannot be verified",
            missing_count
        ));
    }

    // High fee warning (> 10% of output value or > 100k sats)
    if let Some(fee) = fee_sats {
        if fee > 100_000 {
            warnings.push(format!(
                "High fee: {} sats ({:.4} BTC)",
                fee,
                fee as f64 / 100_000_000.0
            ));
        }
        if total_output > 0 {
            let fee_pct = fee as f64 / total_output as f64 * 100.0;
            if fee_pct > 10.0 {
                warnings.push(format!(
                    "Fee is {:.1}% of total output value",
                    fee_pct
                ));
            }
        }
    }

    warnings
}

impl std::fmt::Display for PsbtInspection {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "PSBT Inspection")?;
        writeln!(f, "═══════════════")?;
        writeln!(f)?;
        writeln!(f, "  Version:    {}", self.version)?;
        writeln!(f, "  Inputs:     {}", self.input_count)?;
        writeln!(f, "  Outputs:    {}", self.output_count)?;
        writeln!(f, "  Status:     {:?}", self.status)?;
        writeln!(f)?;

        if let Some(total) = self.total_input_sats {
            writeln!(f, "  Total in:   {} sats", total)?;
        }
        writeln!(f, "  Total out:  {} sats", self.total_output_sats)?;
        if let Some(fee) = self.fee_sats {
            writeln!(f, "  Fee:        {} sats", fee)?;
        }
        writeln!(f)?;

        writeln!(f, "  Inputs:")?;
        for inp in &self.inputs {
            writeln!(
                f,
                "    [{}] utxo={} signed={} sigs={}{}",
                inp.index,
                if inp.has_utxo { "yes" } else { "no" },
                if inp.is_signed { "yes" } else { "no" },
                inp.partial_sig_count,
                inp.value_sats
                    .map(|v| format!(" value={}", v))
                    .unwrap_or_default()
            )?;
        }
        writeln!(f)?;

        writeln!(f, "  Outputs:")?;
        for out in &self.outputs {
            writeln!(
                f,
                "    [{}] {} sats ({})",
                out.index, out.value_sats, out.script_type
            )?;
        }

        if !self.next_steps.is_empty() {
            writeln!(f)?;
            writeln!(f, "  Next steps:")?;
            for step in &self.next_steps {
                writeln!(f, "    → {}", step)?;
            }
        }

        if !self.warnings.is_empty() {
            writeln!(f)?;
            writeln!(f, "  ⚠ Warnings:")?;
            for w in &self.warnings {
                writeln!(f, "    • {}", w)?;
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::build_psbt_from_fixture;

    /// Helper: build a PSBT from a minimal fixture and return its base64.
    fn build_test_psbt() -> String {
        let fixture = serde_json::json!({
            "network": "testnet",
            "fee_rate_sat_vb": 2,
            "utxos": [{
                "txid": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "vout": 0,
                "value_sats": 100_000,
                "script_pubkey_hex": "0014aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "script_type": "p2wpkh",
                "address": "tb1q42424242424242424242424242424242nsn4dz"
            }],
            "payments": [{
                "value_sats": 50_000,
                "script_pubkey_hex": "0014bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                "address": "tb1qrecipient"
            }],
            "change": {
                "script_pubkey_hex": "0014aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "script_type": "p2wpkh",
                "address": "tb1qchange"
            }
        });

        let report_json = build_psbt_from_fixture(&fixture.to_string()).unwrap();
        let report: serde_json::Value = serde_json::from_str(&report_json).unwrap();
        report["psbt_base64"].as_str().unwrap().to_string()
    }

    #[test]
    fn inspect_unsigned_psbt() {
        let psbt_b64 = build_test_psbt();
        let result = inspect_psbt(&psbt_b64).unwrap();

        assert_eq!(result.input_count, 1);
        assert!(result.output_count >= 1);
        assert_eq!(result.status, PsbtStatus::Unsigned);
        assert!(result.total_input_sats.is_some());
        assert!(result.fee_sats.is_some());
    }

    #[test]
    fn inspect_detects_utxo_presence() {
        let psbt_b64 = build_test_psbt();
        let result = inspect_psbt(&psbt_b64).unwrap();

        // Our builder attaches witness_utxo
        assert!(result.inputs[0].has_utxo);
        assert!(result.inputs[0].value_sats.is_some());
    }

    #[test]
    fn inspect_invalid_base64() {
        let result = inspect_psbt("not-valid-base64!!!");
        assert!(result.is_err());
    }

    #[test]
    fn inspect_next_steps_for_unsigned() {
        let psbt_b64 = build_test_psbt();
        let result = inspect_psbt(&psbt_b64).unwrap();

        assert!(!result.next_steps.is_empty());
        assert!(result
            .next_steps
            .iter()
            .any(|s| s.contains("Sign")));
    }

    #[test]
    fn inspect_output_script_types() {
        let psbt_b64 = build_test_psbt();
        let result = inspect_psbt(&psbt_b64).unwrap();

        // At least one output should have a recognized script type
        assert!(result
            .outputs
            .iter()
            .any(|o| o.script_type != "unknown"));
    }

    #[test]
    fn inspect_fee_calculation() {
        let psbt_b64 = build_test_psbt();
        let result = inspect_psbt(&psbt_b64).unwrap();

        if let (Some(input), Some(fee)) = (result.total_input_sats, result.fee_sats) {
            assert_eq!(input, result.total_output_sats + fee);
        }
    }
}
