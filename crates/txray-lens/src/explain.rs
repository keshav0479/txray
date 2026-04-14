//! Plain-English transaction explanations.
//!
//! Takes the JSON report from `analyze_transaction()` and produces
//! a human-readable explanation suitable for beginners.

/// Generate a plain-English explanation of a transaction from its analysis JSON.
pub fn explain_transaction(report: &serde_json::Value) -> String {
    let mut out = String::with_capacity(2048);

    let vin = report.get("vin").and_then(|v| v.as_array());
    let vout = report.get("vout").and_then(|v| v.as_array());
    let num_inputs = vin.map(|v| v.len()).unwrap_or(0);
    let num_outputs = vout.map(|v| v.len()).unwrap_or(0);

    // 1. High-level summary
    let tx_type = classify_tx_type(num_inputs, num_outputs, vout);
    let segwit = report
        .get("segwit")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    out.push_str("📝 Transaction Explanation\n");
    out.push_str("───────────────────────────\n");
    out.push_str(&format!(
        "This is a {} transaction ({} input{} → {} output{}).\n",
        tx_type,
        num_inputs,
        if num_inputs == 1 { "" } else { "s" },
        num_outputs,
        if num_outputs == 1 { "" } else { "s" },
    ));
    if segwit {
        out.push_str("It uses SegWit (Segregated Witness), which reduces fees.\n");
    }
    out.push('\n');

    // 2. Inputs explained
    if let Some(inputs) = vin {
        out.push_str("INPUTS (what's being spent):\n");
        for (i, input) in inputs.iter().enumerate() {
            let value = input
                .pointer("/prevout/value_sats")
                .and_then(|v| v.as_u64())
                .unwrap_or(0);
            let addr = input
                .get("address")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            let script_type = input
                .get("script_type")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");

            out.push_str(&format!(
                "  • Input {}: {} BTC from {} ({})\n",
                i,
                format_btc(value),
                addr,
                script_type_english(script_type),
            ));
        }
        out.push('\n');
    }

    // 3. Outputs explained
    if let Some(outputs) = vout {
        out.push_str("OUTPUTS (who's receiving):\n");
        for output in outputs {
            let n = output.get("n").and_then(|v| v.as_u64()).unwrap_or(0);
            let value = output
                .get("value_sats")
                .and_then(|v| v.as_u64())
                .unwrap_or(0);
            let addr = output
                .get("address")
                .and_then(|v| v.as_str())
                .unwrap_or("none");
            let script_type = output
                .get("script_type")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            let label = output_label(script_type, num_outputs, n as usize);

            out.push_str(&format!(
                "  • Output {}: {} BTC → {} ({}) [{}]\n",
                n,
                format_btc(value),
                addr,
                script_type_english(script_type),
                label,
            ));
        }
        out.push('\n');
    }

    // 4. Fee explanation
    let fee_sats = report.get("fee_sats").and_then(|v| v.as_u64()).unwrap_or(0);
    let fee_rate = report
        .get("fee_rate_sat_vb")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);

    out.push_str(&format!(
        "FEE: {} sats ({:.1} sat/vB) - {}\n",
        fee_sats,
        fee_rate,
        fee_context(fee_rate),
    ));
    out.push('\n');

    // 5. Warnings
    if let Some(warnings) = report.get("warnings").and_then(|v| v.as_array()) {
        if !warnings.is_empty() {
            out.push_str("⚠️ WARNINGS:\n");
            for w in warnings {
                let msg = w
                    .get("message")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown warning");
                out.push_str(&format!("  • {}\n", msg));
            }
            out.push('\n');
        }
    }

    // 6. Educational tips
    out.push_str("💡 Tips:\n");
    if !segwit {
        out.push_str(
            "  • This transaction doesn't use SegWit. Upgrading to SegWit (P2WPKH/P2TR)\n",
        );
        out.push_str("    would reduce fees by ~30-40%.\n");
    }
    if num_outputs == 2 && num_inputs >= 1 {
        out.push_str(
            "  • A 2-output transaction typically means one payment + one change output.\n",
        );
        out.push_str("    Using the same script type for both outputs improves privacy.\n");
    }
    if fee_rate > 50.0 {
        out.push_str("  • The fee rate is quite high. If not urgent, waiting for lower network\n");
        out.push_str("    congestion could save significant fees.\n");
    }

    out
}

fn classify_tx_type(
    num_inputs: usize,
    num_outputs: usize,
    vout: Option<&Vec<serde_json::Value>>,
) -> &'static str {
    // check for OP_RETURN
    let has_op_return = vout
        .map(|outputs| {
            outputs
                .iter()
                .any(|o| o.get("script_type").and_then(|v| v.as_str()) == Some("op_return"))
        })
        .unwrap_or(false);

    if num_inputs == 0 {
        "coinbase"
    } else if num_inputs >= 3 && num_outputs == 1 {
        "consolidation (merging UTXOs)"
    } else if num_inputs == 1 && num_outputs >= 3 {
        "batch payment (one sender, multiple recipients)"
    } else if num_inputs == 1 && num_outputs == 1 {
        "sweep (single input to single output)"
    } else if has_op_return {
        "data-embedding (contains OP_RETURN)"
    } else if num_inputs <= 2 && num_outputs == 2 {
        "simple payment"
    } else {
        "standard"
    }
}

fn format_btc(sats: u64) -> String {
    let btc = sats as f64 / 100_000_000.0;
    if btc < 0.0001 {
        format!("{} sats", sats)
    } else {
        format!("{:.8}", btc)
    }
}

fn script_type_english(script_type: &str) -> &str {
    match script_type {
        "p2pkh" => "Pay-to-Public-Key-Hash (legacy)",
        "p2sh" => "Pay-to-Script-Hash",
        "p2wpkh" => "Pay-to-Witness-Public-Key-Hash (native SegWit)",
        "p2wsh" => "Pay-to-Witness-Script-Hash (SegWit multisig)",
        "p2tr" => "Pay-to-Taproot (latest)",
        "p2sh-p2wpkh" => "Nested SegWit (compatibility)",
        "p2sh-p2wsh" => "Nested SegWit multisig (compatibility)",
        "p2pk" => "Pay-to-Public-Key (very old)",
        "op_return" => "OP_RETURN (data only, unspendable)",
        _ => script_type,
    }
}

fn output_label(script_type: &str, num_outputs: usize, index: usize) -> &'static str {
    if script_type == "op_return" {
        return "DATA";
    }
    if num_outputs == 1 {
        return "PAYMENT";
    }
    if num_outputs == 2 {
        if index == 0 {
            return "likely PAYMENT";
        }
        return "likely CHANGE";
    }
    "PAYMENT"
}

fn fee_context(fee_rate: f64) -> &'static str {
    if fee_rate < 1.0 {
        "very low (may take a while to confirm)"
    } else if fee_rate < 5.0 {
        "low priority"
    } else if fee_rate < 20.0 {
        "normal"
    } else if fee_rate < 50.0 {
        "elevated"
    } else if fee_rate < 100.0 {
        "high (network is busy)"
    } else {
        "very high (urgent or congested network)"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_report() -> serde_json::Value {
        serde_json::json!({
            "ok": true,
            "segwit": true,
            "txid": "abc123",
            "version": 2,
            "locktime": 0,
            "total_input_sats": 50000,
            "total_output_sats": 49000,
            "fee_sats": 1000,
            "fee_rate_sat_vb": 5.2,
            "vin": [
                {
                    "txid": "prev_tx_1",
                    "vout": 0,
                    "script_type": "p2wpkh",
                    "address": "bc1qtest1",
                    "prevout": { "value_sats": 50000, "script_pubkey_hex": "" },
                    "witness": [],
                    "sequence": 4294967293_u64,
                    "script_sig_hex": "",
                    "script_asm": "",
                    "relative_timelock": { "enabled": false }
                }
            ],
            "vout": [
                {
                    "n": 0,
                    "value_sats": 40000,
                    "script_type": "p2wpkh",
                    "address": "bc1qrecipient",
                    "script_pubkey_hex": "",
                    "script_asm": ""
                },
                {
                    "n": 1,
                    "value_sats": 9000,
                    "script_type": "p2wpkh",
                    "address": "bc1qchange",
                    "script_pubkey_hex": "",
                    "script_asm": ""
                }
            ],
            "warnings": [
                { "message": "Possible change output detected (same script type)" }
            ]
        })
    }

    #[test]
    fn explain_contains_header() {
        let report = sample_report();
        let result = explain_transaction(&report);
        assert!(result.contains("Transaction Explanation"));
    }

    #[test]
    fn explain_classifies_simple_payment() {
        let report = sample_report();
        let result = explain_transaction(&report);
        assert!(result.contains("simple payment"));
    }

    #[test]
    fn explain_shows_inputs() {
        let report = sample_report();
        let result = explain_transaction(&report);
        assert!(result.contains("Input 0"));
        assert!(result.contains("bc1qtest1"));
    }

    #[test]
    fn explain_shows_outputs() {
        let report = sample_report();
        let result = explain_transaction(&report);
        assert!(result.contains("Output 0"));
        assert!(result.contains("bc1qrecipient"));
        assert!(result.contains("likely PAYMENT"));
        assert!(result.contains("likely CHANGE"));
    }

    #[test]
    fn explain_shows_fee() {
        let report = sample_report();
        let result = explain_transaction(&report);
        assert!(result.contains("1000 sats"));
        assert!(result.contains("5.2 sat/vB"));
        assert!(result.contains("normal"));
    }

    #[test]
    fn explain_shows_warnings() {
        let report = sample_report();
        let result = explain_transaction(&report);
        assert!(result.contains("change output detected"));
    }

    #[test]
    fn explain_shows_segwit_note() {
        let report = sample_report();
        let result = explain_transaction(&report);
        assert!(result.contains("SegWit"));
    }

    #[test]
    fn classify_consolidation() {
        assert_eq!(
            classify_tx_type(5, 1, None),
            "consolidation (merging UTXOs)"
        );
    }

    #[test]
    fn classify_batch() {
        assert_eq!(
            classify_tx_type(1, 5, None),
            "batch payment (one sender, multiple recipients)"
        );
    }

    #[test]
    fn format_btc_large() {
        assert_eq!(format_btc(100_000_000), "1.00000000");
    }

    #[test]
    fn format_btc_small() {
        assert_eq!(format_btc(500), "500 sats");
    }

    #[test]
    fn script_type_english_known() {
        assert_eq!(
            script_type_english("p2wpkh"),
            "Pay-to-Witness-Public-Key-Hash (native SegWit)"
        );
        assert_eq!(script_type_english("p2tr"), "Pay-to-Taproot (latest)");
    }

    #[test]
    fn fee_context_ranges() {
        assert_eq!(fee_context(0.5), "very low (may take a while to confirm)");
        assert_eq!(fee_context(10.0), "normal");
        assert_eq!(fee_context(75.0), "high (network is busy)");
    }
}
