//! Parsed analysis data for TUI display.
//!
//! Wraps serde_json::Value with typed accessors so the UI code stays clean.

use std::collections::HashMap;

/// Loaded analysis data for the dashboard.
pub enum AnalysisData {
    /// Single transaction from a fixture file.
    SingleTx(TxAnalysis),
}

/// Parsed transaction analysis (extracted from lens JSON output).
pub struct TxAnalysis {
    pub txid: String,
    pub network: String,
    pub segwit: bool,
    pub version: u32,
    pub locktime: u32,
    pub size_bytes: u64,
    pub weight: u64,
    pub vbytes: u64,
    pub total_input_sats: u64,
    pub total_output_sats: u64,
    pub fee_sats: u64,
    pub fee_rate_sat_vb: f64,
    pub rbf_signaling: bool,
    pub input_count: usize,
    pub output_count: usize,
    pub input_script_types: Vec<String>,
    pub output_script_types: Vec<String>,
    pub script_type_counts: HashMap<String, u64>,
    pub warnings: Vec<WarningInfo>,
    pub outputs: Vec<OutputInfo>,
    pub inputs: Vec<InputInfo>,
}

pub struct InputInfo {
    pub txid: String,
    pub vout: u64,
    pub script_type: String,
    pub address: String,
    pub value_sats: u64,
}

pub struct OutputInfo {
    pub n: u64,
    pub value_sats: u64,
    pub script_type: String,
    pub address: String,
}

pub struct WarningInfo {
    pub code: String,
    pub message: String,
}

/// Parse the JSON output from txray_lens::analyze_transaction into TxAnalysis.
pub fn parse_tx_json(json_str: &str) -> anyhow::Result<TxAnalysis> {
    let v: serde_json::Value = serde_json::from_str(json_str)?;

    let txid = v["txid"].as_str().unwrap_or("").to_string();
    let network = v["network"].as_str().unwrap_or("mainnet").to_string();

    // count script types across outputs
    let mut script_type_counts: HashMap<String, u64> = HashMap::new();
    let mut output_script_types = Vec::new();
    let mut outputs = Vec::new();

    if let Some(vout_arr) = v["vout"].as_array() {
        for out in vout_arr {
            let st = out["script_type"].as_str().unwrap_or("unknown").to_string();
            *script_type_counts.entry(st.clone()).or_insert(0) += 1;
            output_script_types.push(st.clone());
            outputs.push(OutputInfo {
                n: out["n"].as_u64().unwrap_or(0),
                value_sats: out["value_sats"].as_u64().unwrap_or(0),
                script_type: st,
                address: out["address"].as_str().unwrap_or("").to_string(),
            });
        }
    }

    let mut input_script_types = Vec::new();
    let mut inputs = Vec::new();

    if let Some(vin_arr) = v["vin"].as_array() {
        for inp in vin_arr {
            let st = inp["script_type"].as_str().unwrap_or("unknown").to_string();
            *script_type_counts.entry(st.clone()).or_insert(0) += 1;
            input_script_types.push(st.clone());
            inputs.push(InputInfo {
                txid: inp["txid"].as_str().unwrap_or("").to_string(),
                vout: inp["vout"].as_u64().unwrap_or(0),
                script_type: st,
                address: inp["address"].as_str().unwrap_or("").to_string(),
                value_sats: inp["prevout"]["value_sats"].as_u64().unwrap_or(0),
            });
        }
    }

    let mut warnings = Vec::new();
    if let Some(w_arr) = v["warnings"].as_array() {
        for w in w_arr {
            warnings.push(WarningInfo {
                code: w["code"].as_str().unwrap_or("").to_string(),
                message: w["message"].as_str().unwrap_or("").to_string(),
            });
        }
    }

    Ok(TxAnalysis {
        txid,
        network,
        segwit: v["segwit"].as_bool().unwrap_or(false),
        version: v["version"].as_u64().unwrap_or(0) as u32,
        locktime: v["locktime"].as_u64().unwrap_or(0) as u32,
        size_bytes: v["size_bytes"].as_u64().unwrap_or(0),
        weight: v["weight"].as_u64().unwrap_or(0),
        vbytes: v["vbytes"].as_u64().unwrap_or(0),
        total_input_sats: v["total_input_sats"].as_u64().unwrap_or(0),
        total_output_sats: v["total_output_sats"].as_u64().unwrap_or(0),
        fee_sats: v["fee_sats"].as_u64().unwrap_or(0),
        fee_rate_sat_vb: v["fee_rate_sat_vb"].as_f64().unwrap_or(0.0),
        rbf_signaling: v["rbf_signaling"].as_bool().unwrap_or(false),
        input_count: inputs.len(),
        output_count: outputs.len(),
        input_script_types,
        output_script_types,
        script_type_counts,
        warnings,
        outputs,
        inputs,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_minimal_tx_json() {
        let json = r#"{
            "ok": true,
            "txid": "abc123",
            "network": "mainnet",
            "segwit": true,
            "version": 2,
            "locktime": 0,
            "size_bytes": 250,
            "weight": 800,
            "vbytes": 200,
            "total_input_sats": 100000,
            "total_output_sats": 99000,
            "fee_sats": 1000,
            "fee_rate_sat_vb": 5.0,
            "rbf_signaling": false,
            "vin": [
                {
                    "txid": "prev_txid",
                    "vout": 0,
                    "script_type": "p2wpkh",
                    "address": "bc1q...",
                    "prevout": { "value_sats": 100000 }
                }
            ],
            "vout": [
                {
                    "n": 0,
                    "value_sats": 50000,
                    "script_type": "p2wpkh",
                    "address": "bc1q..."
                },
                {
                    "n": 1,
                    "value_sats": 49000,
                    "script_type": "p2tr",
                    "address": "bc1p..."
                }
            ],
            "warnings": [
                { "code": "RBF_SIGNALING", "message": "Transaction signals RBF" }
            ]
        }"#;

        let tx = parse_tx_json(json).unwrap();
        assert_eq!(tx.txid, "abc123");
        assert_eq!(tx.fee_sats, 1000);
        assert_eq!(tx.input_count, 1);
        assert_eq!(tx.output_count, 2);
        assert_eq!(tx.warnings.len(), 1);
        assert_eq!(tx.script_type_counts["p2wpkh"], 2); // 1 input + 1 output
        assert_eq!(tx.script_type_counts["p2tr"], 1);
    }

    #[test]
    fn parse_empty_json() {
        let json = r#"{ "ok": true }"#;
        let tx = parse_tx_json(json).unwrap();
        assert_eq!(tx.txid, "");
        assert_eq!(tx.input_count, 0);
        assert_eq!(tx.output_count, 0);
    }
}
