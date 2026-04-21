use serde::Serialize;
use std::collections::BTreeMap;
use txray_core::block::undo::UndoPrevout;
use txray_core::tx::address;
use txray_core::tx::parser::RawTransaction;
use txray_core::tx::script;

/// All 8 heuristic IDs, alphabetically sorted
pub const ALL_HEURISTIC_IDS: &[&str] = &[
    "address_reuse",
    "change_detection",
    "cioh",
    "coinjoin",
    "consolidation",
    "op_return",
    "round_number_payment",
    "self_transfer",
];

/// Result of running all heuristics on a single transaction.
#[derive(Debug, Clone, Serialize)]
pub struct TxAnalysis {
    pub txid: String,
    pub heuristics: BTreeMap<String, serde_json::Value>,
    pub classification: String,
    pub is_coinbase: bool,
    pub fee_rate: f64,
    pub output_script_types: Vec<String>,
}

/// Context needed for heuristic analysis of a single transaction.
pub struct TxContext<'a> {
    pub tx: &'a RawTransaction,
    pub txid: String,
    pub is_coinbase: bool,
    pub prevouts: Option<&'a [UndoPrevout]>,
    pub fee_rate: f64,
}

/// Run ALL 8 heuristics on a transaction, returning a TxAnalysis.
pub fn analyze_transaction(ctx: &TxContext) -> TxAnalysis {
    let mut heuristics = BTreeMap::new();

    // Classify output script types for this tx
    let output_script_types: Vec<String> = ctx
        .tx
        .outputs
        .iter()
        .map(|o| script::classify_output_script(&o.script_pubkey).to_string())
        .collect();

    // Classify input (prevout) script types
    let input_script_types: Vec<String> = if let Some(prevouts) = ctx.prevouts {
        prevouts
            .iter()
            .map(|p| script::classify_output_script(&p.script_pubkey).to_string())
            .collect()
    } else {
        Vec::new()
    };

    // Derive input addresses (from prevout scripts)
    let input_addresses: Vec<Option<String>> = if let Some(prevouts) = ctx.prevouts {
        prevouts
            .iter()
            .map(|p| address::derive_input_address(&p.script_pubkey))
            .collect()
    } else {
        Vec::new()
    };

    // Derive output addresses
    let output_addresses: Vec<Option<String>> = ctx
        .tx
        .outputs
        .iter()
        .zip(output_script_types.iter())
        .map(|(o, st)| address::derive_address(&o.script_pubkey, st))
        .collect();

    if ctx.is_coinbase {
        // Coinbase: all heuristics detected = false
        for &id in ALL_HEURISTIC_IDS {
            heuristics.insert(id.to_string(), serde_json::json!({"detected": false}));
        }
        return TxAnalysis {
            txid: ctx.txid.clone(),
            heuristics,
            classification: "unknown".to_string(),
            is_coinbase: true,
            fee_rate: 0.0,
            output_script_types,
        };
    }

    // --- 1. CIOH (Common Input Ownership Heuristic) ---
    let cioh_detected = ctx.tx.inputs.len() >= 2;
    heuristics.insert(
        "cioh".to_string(),
        serde_json::json!({"detected": cioh_detected}),
    );

    // --- 2. Change Detection ---
    let change_result = detect_change(
        ctx.tx,
        &input_script_types,
        &output_script_types,
        &output_addresses,
    );
    heuristics.insert("change_detection".to_string(), change_result.to_json());

    // --- 3. Address Reuse ---
    let address_reuse_detected = detect_address_reuse(&input_addresses, &output_addresses);
    heuristics.insert(
        "address_reuse".to_string(),
        serde_json::json!({"detected": address_reuse_detected}),
    );

    // --- 4. CoinJoin Detection ---
    let coinjoin_detected = detect_coinjoin(ctx.tx, &input_addresses);
    heuristics.insert(
        "coinjoin".to_string(),
        serde_json::json!({"detected": coinjoin_detected}),
    );

    // --- 5. Consolidation Detection ---
    let consolidation_detected =
        detect_consolidation(ctx.tx, &input_script_types, &output_script_types);
    heuristics.insert(
        "consolidation".to_string(),
        serde_json::json!({"detected": consolidation_detected}),
    );

    // --- 6. Self-Transfer Detection ---
    // Round number output signals an external payment, so suppress self_transfer in that case.
    let round_number_detected = detect_round_number_payment(ctx.tx, &output_script_types);
    let self_transfer_detected = !round_number_detected
        && detect_self_transfer(ctx.tx, &input_script_types, &output_script_types);
    heuristics.insert(
        "self_transfer".to_string(),
        serde_json::json!({"detected": self_transfer_detected}),
    );

    // --- 7. OP_RETURN Analysis ---
    let op_return_result = detect_op_return(&output_script_types, ctx.tx);
    heuristics.insert("op_return".to_string(), op_return_result);

    // --- 8. Round Number Payment ---
    heuristics.insert(
        "round_number_payment".to_string(),
        serde_json::json!({"detected": round_number_detected}),
    );

    // Classification with priority:
    // coinjoin > consolidation > self_transfer > batch_payment > simple_payment > unknown
    let non_op_return_outputs = output_script_types
        .iter()
        .filter(|st| st.as_str() != "op_return")
        .count();

    let classification = if coinjoin_detected {
        "coinjoin"
    } else if consolidation_detected {
        "consolidation"
    } else if self_transfer_detected {
        "self_transfer"
    } else if non_op_return_outputs >= 3 {
        // Batch payment: >= 3 non-OP_RETURN outputs (excluding likely change)
        "batch_payment"
    } else if non_op_return_outputs >= 1 {
        "simple_payment"
    } else {
        "unknown"
    }
    .to_string();

    TxAnalysis {
        txid: ctx.txid.clone(),
        heuristics,
        classification,
        is_coinbase: false,
        fee_rate: ctx.fee_rate,
        output_script_types,
    }
}

// ============== Change Detection ==============

struct ChangeResult {
    detected: bool,
    likely_change_index: Option<usize>,
    method: Option<String>,
    confidence: Option<String>,
}

impl ChangeResult {
    fn not_detected() -> Self {
        Self {
            detected: false,
            likely_change_index: None,
            method: None,
            confidence: None,
        }
    }

    fn to_json(&self) -> serde_json::Value {
        if !self.detected {
            return serde_json::json!({"detected": false});
        }
        serde_json::json!({
            "detected": true,
            "likely_change_index": self.likely_change_index,
            "method": self.method,
            "confidence": self.confidence,
        })
    }
}

fn detect_change(
    tx: &RawTransaction,
    input_script_types: &[String],
    output_script_types: &[String],
    output_addresses: &[Option<String>],
) -> ChangeResult {
    // Need at least 2 outputs (one payment, one change)
    if tx.outputs.len() < 2 {
        return ChangeResult::not_detected();
    }

    // Skip OP_RETURN outputs from consideration
    let candidate_indices: Vec<usize> = output_script_types
        .iter()
        .enumerate()
        .filter(|(_, st)| st.as_str() != "op_return")
        .map(|(i, _)| i)
        .collect();

    if candidate_indices.len() < 2 {
        return ChangeResult::not_detected();
    }

    // Find majority input script type
    let majority_input_type = find_majority_type(input_script_types);

    // Method 1: Script type match - output matching input type is likely change
    if let Some(ref majority) = majority_input_type {
        let matching: Vec<usize> = candidate_indices
            .iter()
            .filter(|&&i| output_script_types[i] == *majority)
            .copied()
            .collect();

        // If exactly one output matches input type, it's likely change
        if matching.len() == 1 {
            return ChangeResult {
                detected: true,
                likely_change_index: Some(matching[0]),
                method: Some("script_type_match".to_string()),
                confidence: Some("high".to_string()),
            };
        }
    }

    // Method 2: Round number analysis - non-round output is likely change
    let round_statuses: Vec<bool> = candidate_indices
        .iter()
        .map(|&i| is_round_amount(tx.outputs[i].value))
        .collect();

    let round_count = round_statuses.iter().filter(|&&r| r).count();
    let non_round_count = round_statuses.iter().filter(|&&r| !r).count();

    // If exactly one non-round output and at least one round output, the non-round is change
    if non_round_count == 1 && round_count >= 1 {
        let change_pos = round_statuses.iter().position(|&r| !r).unwrap();
        let change_idx = candidate_indices[change_pos];
        return ChangeResult {
            detected: true,
            likely_change_index: Some(change_idx),
            method: Some("round_number".to_string()),
            confidence: Some("medium".to_string()),
        };
    }

    // Method 3: Value analysis - the smaller output is likely change (for 2-output txs)
    if candidate_indices.len() == 2 {
        let idx_a = candidate_indices[0];
        let idx_b = candidate_indices[1];
        let val_a = tx.outputs[idx_a].value;
        let val_b = tx.outputs[idx_b].value;

        // Don't flag if values are equal (could be coinjoin)
        if val_a != val_b {
            // Check if one output reuses an input address - that's the change
            let input_addr_set: std::collections::HashSet<&str> = output_addresses
                .iter()
                .filter_map(|addr| addr.as_deref())
                .collect();
            let _ = input_addr_set; // will be used later

            // Smaller output is likely change (heuristic)
            let change_idx = if val_a < val_b { idx_a } else { idx_b };
            return ChangeResult {
                detected: true,
                likely_change_index: Some(change_idx),
                method: Some("value_analysis".to_string()),
                confidence: Some("low".to_string()),
            };
        }
    }

    ChangeResult::not_detected()
}

/// Check if an amount is a "round" BTC amount (divisible by 100,000 sats = 0.001 BTC)
fn is_round_amount(sats: u64) -> bool {
    sats > 0 && sats.is_multiple_of(100_000)
}

/// Find the majority script type from a list
fn find_majority_type(types: &[String]) -> Option<String> {
    if types.is_empty() {
        return None;
    }
    let mut counts: BTreeMap<&str, usize> = BTreeMap::new();
    for t in types {
        *counts.entry(t.as_str()).or_insert(0) += 1;
    }
    counts
        .into_iter()
        .max_by_key(|&(_, count)| count)
        .map(|(t, _)| t.to_string())
}

// ============== Address Reuse ==============

fn detect_address_reuse(
    input_addresses: &[Option<String>],
    output_addresses: &[Option<String>],
) -> bool {
    // Check if any address appears in both inputs and outputs
    for addr in input_addresses.iter().flatten() {
        for oaddr in output_addresses.iter().flatten() {
            if addr == oaddr {
                return true;
            }
        }
    }
    false
}

// ============== CoinJoin Detection ==============

fn detect_coinjoin(tx: &RawTransaction, input_addresses: &[Option<String>]) -> bool {
    // CoinJoin: >=3 inputs, >=3 distinct input addresses, >=3 equal-value outputs
    if tx.inputs.len() < 3 {
        return false;
    }

    // Count distinct input addresses
    let distinct_addrs: std::collections::HashSet<&str> = input_addresses
        .iter()
        .filter_map(|a| a.as_deref())
        .collect();
    if distinct_addrs.len() < 3 {
        return false;
    }

    // Count equal-value outputs (find the most common output value)
    let mut value_counts: BTreeMap<u64, usize> = BTreeMap::new();
    for output in &tx.outputs {
        if output.value > 0 {
            *value_counts.entry(output.value).or_insert(0) += 1;
        }
    }

    // If any output value appears >=3 times, it's a CoinJoin candidate
    value_counts.values().any(|&count| count >= 3)
}

// ============== Consolidation Detection ==============

fn detect_consolidation(
    tx: &RawTransaction,
    input_script_types: &[String],
    output_script_types: &[String],
) -> bool {
    // Consolidation: >=3 inputs, <=2 outputs, same script type inputs
    if tx.inputs.len() < 3 || tx.outputs.len() > 2 {
        return false;
    }

    // Check if all non-OP_RETURN outputs match the majority input type
    let majority = find_majority_type(input_script_types);
    if majority.is_none() {
        return false;
    }
    let majority = majority.unwrap();

    output_script_types
        .iter()
        .filter(|st| st.as_str() != "op_return")
        .all(|st| st == &majority)
}

// ============== Self-Transfer Detection ==============

fn detect_self_transfer(
    tx: &RawTransaction,
    input_script_types: &[String],
    output_script_types: &[String],
) -> bool {
    // Self-transfer: all outputs match majority input type, <=3 outputs
    if tx.outputs.len() > 3 || tx.outputs.is_empty() {
        return false;
    }

    let majority = find_majority_type(input_script_types);
    if majority.is_none() {
        return false;
    }
    let majority = majority.unwrap();

    // All non-OP_RETURN outputs should match the input type
    let non_op_return: Vec<&String> = output_script_types
        .iter()
        .filter(|st| st.as_str() != "op_return")
        .collect();

    if non_op_return.is_empty() {
        return false;
    }

    non_op_return.iter().all(|st| **st == majority)
}

// ============== OP_RETURN Analysis ==============

fn detect_op_return(output_script_types: &[String], tx: &RawTransaction) -> serde_json::Value {
    let op_return_indices: Vec<usize> = output_script_types
        .iter()
        .enumerate()
        .filter(|(_, st)| st.as_str() == "op_return")
        .map(|(i, _)| i)
        .collect();

    if op_return_indices.is_empty() {
        return serde_json::json!({"detected": false});
    }

    // Try to classify protocol from first OP_RETURN output
    let first_idx = op_return_indices[0];
    let script = &tx.outputs[first_idx].script_pubkey;
    let protocol = classify_op_return_protocol(script);

    serde_json::json!({
        "detected": true,
        "protocol": protocol,
    })
}

fn classify_op_return_protocol(script: &[u8]) -> &'static str {
    // script[0] = OP_RETURN (0x6a), data follows
    if script.len() < 3 {
        return "unknown";
    }

    // Skip OP_RETURN byte and potential push data length
    let data_start = if script.len() > 1 && script[1] <= 0x4b {
        2 // single-byte push
    } else {
        1
    };

    let data = &script[data_start..];

    // Omni Layer: starts with "omni" or 0x6f6d6e69
    if data.len() >= 4 && &data[0..4] == b"omni" {
        return "omni_layer";
    }

    // OpenTimestamps: starts with 0x4f5453 ("OTS")
    if data.len() >= 3 && &data[0..3] == b"OTS" {
        return "opentimestamps";
    }

    // Counterparty: starts with "CNTRPRTY"
    if data.len() >= 8 && &data[0..8] == b"CNTRPRTY" {
        return "counterparty";
    }

    // Stacks: starts with "id" or "STX"
    if data.len() >= 3 && &data[0..3] == b"STX" {
        return "stacks";
    }
    if data.len() >= 2 && &data[0..2] == b"id" {
        return "stacks";
    }

    "unknown"
}

// ============== Round Number Payment ==============

fn detect_round_number_payment(tx: &RawTransaction, output_script_types: &[String]) -> bool {
    // Any non-OP_RETURN output divisible by >=100,000 sats (0.001 BTC)
    tx.outputs
        .iter()
        .zip(output_script_types.iter())
        .any(|(o, st)| st.as_str() != "op_return" && is_round_amount(o.value))
}

#[cfg(test)]
mod tests {
    use super::*;
    use txray_core::block::undo::UndoPrevout;
    use txray_core::tx::parser::{RawTransaction, TxInput, TxOutput};

    // ------ Helpers ------

    fn make_tx(inputs: Vec<TxInput>, outputs: Vec<TxOutput>) -> RawTransaction {
        RawTransaction {
            version: 2,
            is_segwit: false,
            inputs,
            outputs,
            locktime: 0,
            raw_bytes: vec![0],
            base_bytes: vec![0],
        }
    }

    fn make_input() -> TxInput {
        TxInput {
            txid: [0u8; 32],
            vout: 0,
            script_sig: vec![],
            sequence: 0xffffffff,
            witness: vec![],
        }
    }

    fn p2wpkh_script(hash: u8) -> Vec<u8> {
        let mut s = vec![0x00, 0x14];
        s.extend_from_slice(&[hash; 20]);
        s
    }

    fn p2tr_script(hash: u8) -> Vec<u8> {
        let mut s = vec![0x51, 0x20];
        s.extend_from_slice(&[hash; 32]);
        s
    }

    fn p2pkh_script(hash: u8) -> Vec<u8> {
        let mut s = vec![0x76, 0xa9, 0x14];
        s.extend_from_slice(&[hash; 20]);
        s.push(0x88);
        s.push(0xac);
        s
    }

    fn op_return_script(data: &[u8]) -> Vec<u8> {
        let mut s = vec![0x6a, data.len() as u8];
        s.extend_from_slice(data);
        s
    }

    fn prevout(value: u64, script: Vec<u8>) -> UndoPrevout {
        UndoPrevout {
            value_sats: value,
            script_pubkey: script,
        }
    }

    fn output(value: u64, script: Vec<u8>) -> TxOutput {
        TxOutput {
            value,
            script_pubkey: script,
        }
    }

    fn run(tx: &RawTransaction, prevouts: &[UndoPrevout]) -> TxAnalysis {
        let ctx = TxContext {
            tx,
            txid: "test_txid".to_string(),
            is_coinbase: false,
            prevouts: Some(prevouts),
            fee_rate: 5.0,
        };
        analyze_transaction(&ctx)
    }

    // ------ CIOH ------

    #[test]
    fn cioh_single_input_not_detected() {
        let tx = make_tx(
            vec![make_input()],
            vec![output(50_000, p2wpkh_script(0xaa))],
        );
        let prev = vec![prevout(60_000, p2wpkh_script(0xbb))];
        let r = run(&tx, &prev);
        assert_eq!(r.heuristics["cioh"]["detected"], false);
    }

    #[test]
    fn cioh_multi_input_detected() {
        let tx = make_tx(
            vec![make_input(), make_input()],
            vec![output(50_000, p2wpkh_script(0xaa))],
        );
        let prev = vec![
            prevout(30_000, p2wpkh_script(0xbb)),
            prevout(30_000, p2wpkh_script(0xcc)),
        ];
        let r = run(&tx, &prev);
        assert_eq!(r.heuristics["cioh"]["detected"], true);
    }

    // ------ Coinbase ------

    #[test]
    fn coinbase_all_heuristics_false_classification_unknown() {
        let tx = make_tx(
            vec![make_input()],
            vec![output(625_000_000, p2wpkh_script(0xaa))],
        );
        let ctx = TxContext {
            tx: &tx,
            txid: "cb_txid".to_string(),
            is_coinbase: true,
            prevouts: None,
            fee_rate: 0.0,
        };
        let r = analyze_transaction(&ctx);
        assert_eq!(r.classification, "unknown");
        assert!(r.is_coinbase);
        for v in r.heuristics.values() {
            assert_eq!(v["detected"], false);
        }
    }

    // ------ Change Detection ------

    #[test]
    fn change_detection_script_type_match() {
        // 2 inputs p2wpkh, outputs: 1 p2tr (payment) + 1 p2wpkh (change)
        let tx = make_tx(
            vec![make_input(), make_input()],
            vec![
                output(80_000, p2tr_script(0x11)),
                output(15_000, p2wpkh_script(0x22)),
            ],
        );
        let prev = vec![
            prevout(50_000, p2wpkh_script(0x33)),
            prevout(50_000, p2wpkh_script(0x44)),
        ];
        let r = run(&tx, &prev);
        let cd = &r.heuristics["change_detection"];
        assert_eq!(cd["detected"], true);
        assert_eq!(cd["likely_change_index"], 1);
        assert_eq!(cd["method"], "script_type_match");
        assert_eq!(cd["confidence"], "high");
    }

    #[test]
    fn change_detection_round_number_method() {
        // Both outputs same script type; one round, one not -> non-round is change
        let tx = make_tx(
            vec![make_input(), make_input()],
            vec![
                output(1_000_000, p2wpkh_script(0x11)), // round (payment)
                output(347_231, p2wpkh_script(0x22)),   // non-round (change)
            ],
        );
        let prev = vec![
            prevout(700_000, p2wpkh_script(0x33)),
            prevout(700_000, p2wpkh_script(0x44)),
        ];
        let r = run(&tx, &prev);
        let cd = &r.heuristics["change_detection"];
        assert_eq!(cd["detected"], true);
        assert_eq!(cd["likely_change_index"], 1);
        assert_eq!(cd["method"], "round_number");
    }

    #[test]
    fn change_detection_value_analysis_method() {
        // 2 outputs same type, neither round, different values -> smaller is change
        let tx = make_tx(
            vec![make_input()],
            vec![
                output(500_001, p2wpkh_script(0x11)),
                output(123_456, p2wpkh_script(0x22)),
            ],
        );
        let prev = vec![prevout(630_000, p2wpkh_script(0x33))];
        let r = run(&tx, &prev);
        let cd = &r.heuristics["change_detection"];
        assert_eq!(cd["detected"], true);
        assert_eq!(cd["likely_change_index"], 1); // smaller
        assert_eq!(cd["method"], "value_analysis");
        assert_eq!(cd["confidence"], "low");
    }

    #[test]
    fn change_detection_single_output_not_detected() {
        let tx = make_tx(
            vec![make_input()],
            vec![output(50_000, p2wpkh_script(0x11))],
        );
        let prev = vec![prevout(55_000, p2wpkh_script(0x22))];
        let r = run(&tx, &prev);
        assert_eq!(r.heuristics["change_detection"]["detected"], false);
    }

    #[test]
    fn change_detection_equal_values_not_detected() {
        // 2 outputs with equal values, same type -> skip value analysis (could be coinjoin)
        let tx = make_tx(
            vec![make_input()],
            vec![
                output(250_001, p2wpkh_script(0x11)),
                output(250_001, p2wpkh_script(0x22)),
            ],
        );
        let prev = vec![prevout(510_000, p2wpkh_script(0x33))];
        let r = run(&tx, &prev);
        assert_eq!(r.heuristics["change_detection"]["detected"], false);
    }

    // ------ Address Reuse ------

    #[test]
    fn address_reuse_detected_when_input_matches_output() {
        // Same p2wpkh script in input and output -> address reuse
        let shared = p2wpkh_script(0xAA);
        let tx = make_tx(
            vec![make_input()],
            vec![
                output(40_000, shared.clone()),
                output(10_000, p2wpkh_script(0xBB)),
            ],
        );
        let prev = vec![prevout(55_000, shared)];
        let r = run(&tx, &prev);
        assert_eq!(r.heuristics["address_reuse"]["detected"], true);
    }

    #[test]
    fn address_reuse_not_detected_when_distinct() {
        let tx = make_tx(
            vec![make_input()],
            vec![output(50_000, p2wpkh_script(0x11))],
        );
        let prev = vec![prevout(55_000, p2wpkh_script(0x22))];
        let r = run(&tx, &prev);
        assert_eq!(r.heuristics["address_reuse"]["detected"], false);
    }

    // ------ CoinJoin ------

    #[test]
    fn coinjoin_detected() {
        // >=3 inputs, >=3 distinct addresses, >=3 equal-value outputs
        let tx = make_tx(
            vec![make_input(), make_input(), make_input()],
            vec![
                output(100_000, p2wpkh_script(0xA1)),
                output(100_000, p2wpkh_script(0xA2)),
                output(100_000, p2wpkh_script(0xA3)),
            ],
        );
        let prev = vec![
            prevout(110_000, p2wpkh_script(0xB1)),
            prevout(110_000, p2wpkh_script(0xB2)),
            prevout(110_000, p2wpkh_script(0xB3)),
        ];
        let r = run(&tx, &prev);
        assert_eq!(r.heuristics["coinjoin"]["detected"], true);
        assert_eq!(r.classification, "coinjoin");
    }

    #[test]
    fn coinjoin_not_detected_too_few_inputs() {
        let tx = make_tx(
            vec![make_input(), make_input()], // only 2
            vec![
                output(100_000, p2wpkh_script(0xA1)),
                output(100_000, p2wpkh_script(0xA2)),
                output(100_000, p2wpkh_script(0xA3)),
            ],
        );
        let prev = vec![
            prevout(160_000, p2wpkh_script(0xB1)),
            prevout(160_000, p2wpkh_script(0xB2)),
        ];
        let r = run(&tx, &prev);
        assert_eq!(r.heuristics["coinjoin"]["detected"], false);
    }

    #[test]
    fn coinjoin_not_detected_too_few_distinct_addrs() {
        // 3 inputs but all same address
        let tx = make_tx(
            vec![make_input(), make_input(), make_input()],
            vec![
                output(100_000, p2wpkh_script(0xA1)),
                output(100_000, p2wpkh_script(0xA2)),
                output(100_000, p2wpkh_script(0xA3)),
            ],
        );
        let same = p2wpkh_script(0xBB);
        let prev = vec![
            prevout(110_000, same.clone()),
            prevout(110_000, same.clone()),
            prevout(110_000, same),
        ];
        let r = run(&tx, &prev);
        assert_eq!(r.heuristics["coinjoin"]["detected"], false);
    }

    #[test]
    fn coinjoin_not_detected_no_equal_value_outputs() {
        let tx = make_tx(
            vec![make_input(), make_input(), make_input()],
            vec![
                output(100_000, p2wpkh_script(0xA1)),
                output(200_000, p2wpkh_script(0xA2)),
                output(300_000, p2wpkh_script(0xA3)),
            ],
        );
        let prev = vec![
            prevout(210_000, p2wpkh_script(0xB1)),
            prevout(210_000, p2wpkh_script(0xB2)),
            prevout(210_000, p2wpkh_script(0xB3)),
        ];
        let r = run(&tx, &prev);
        assert_eq!(r.heuristics["coinjoin"]["detected"], false);
    }

    // ------ Consolidation ------

    #[test]
    fn consolidation_detected() {
        // >=3 inputs, <=2 outputs, same script type
        let tx = make_tx(
            vec![make_input(), make_input(), make_input()],
            vec![output(250_000, p2wpkh_script(0xA1))],
        );
        let prev = vec![
            prevout(90_000, p2wpkh_script(0xB1)),
            prevout(90_000, p2wpkh_script(0xB2)),
            prevout(90_000, p2wpkh_script(0xB3)),
        ];
        let r = run(&tx, &prev);
        assert_eq!(r.heuristics["consolidation"]["detected"], true);
        assert_eq!(r.classification, "consolidation");
    }

    #[test]
    fn consolidation_not_detected_too_few_inputs() {
        let tx = make_tx(
            vec![make_input(), make_input()], // only 2
            vec![output(150_000, p2wpkh_script(0xA1))],
        );
        let prev = vec![
            prevout(80_000, p2wpkh_script(0xB1)),
            prevout(80_000, p2wpkh_script(0xB2)),
        ];
        let r = run(&tx, &prev);
        assert_eq!(r.heuristics["consolidation"]["detected"], false);
    }

    #[test]
    fn consolidation_not_detected_too_many_outputs() {
        let tx = make_tx(
            vec![make_input(), make_input(), make_input()],
            vec![
                output(80_000, p2wpkh_script(0xA1)),
                output(80_000, p2wpkh_script(0xA2)),
                output(80_000, p2wpkh_script(0xA3)), // 3 outputs = too many
            ],
        );
        let prev = vec![
            prevout(90_000, p2wpkh_script(0xB1)),
            prevout(90_000, p2wpkh_script(0xB2)),
            prevout(90_000, p2wpkh_script(0xB3)),
        ];
        let r = run(&tx, &prev);
        assert_eq!(r.heuristics["consolidation"]["detected"], false);
    }

    // ------ Self-Transfer ------

    #[test]
    fn self_transfer_detected() {
        // All outputs match majority input type, <=3 outputs
        let tx = make_tx(
            vec![make_input()],
            vec![
                output(40_000, p2wpkh_script(0xA1)),
                output(10_000, p2wpkh_script(0xA2)),
            ],
        );
        let prev = vec![prevout(55_000, p2wpkh_script(0xB1))];
        let r = run(&tx, &prev);
        assert_eq!(r.heuristics["self_transfer"]["detected"], true);
    }

    #[test]
    fn self_transfer_not_detected_too_many_outputs() {
        let tx = make_tx(
            vec![make_input()],
            vec![
                output(10_000, p2wpkh_script(0x01)),
                output(10_000, p2wpkh_script(0x02)),
                output(10_000, p2wpkh_script(0x03)),
                output(10_000, p2wpkh_script(0x04)), // 4 outputs = too many
            ],
        );
        let prev = vec![prevout(45_000, p2wpkh_script(0xBB))];
        let r = run(&tx, &prev);
        assert_eq!(r.heuristics["self_transfer"]["detected"], false);
    }

    #[test]
    fn self_transfer_not_detected_mixed_script_types() {
        // Output type differs from input -> not self-transfer
        let tx = make_tx(
            vec![make_input()],
            vec![
                output(40_000, p2tr_script(0xA1)), // p2tr != p2wpkh
                output(10_000, p2wpkh_script(0xA2)),
            ],
        );
        let prev = vec![prevout(55_000, p2wpkh_script(0xBB))];
        let r = run(&tx, &prev);
        assert_eq!(r.heuristics["self_transfer"]["detected"], false);
    }

    // ------ Classification Priority ------

    #[test]
    fn classification_consolidation_beats_self_transfer() {
        // 3 inputs same type, 1 output same type -> matches both consolidation AND self_transfer
        let tx = make_tx(
            vec![make_input(), make_input(), make_input()],
            vec![output(250_000, p2wpkh_script(0xA1))],
        );
        let prev = vec![
            prevout(90_000, p2wpkh_script(0xB1)),
            prevout(90_000, p2wpkh_script(0xB2)),
            prevout(90_000, p2wpkh_script(0xB3)),
        ];
        let r = run(&tx, &prev);
        assert_eq!(r.heuristics["consolidation"]["detected"], true);
        assert_eq!(r.heuristics["self_transfer"]["detected"], true);
        // Consolidation wins over self_transfer in priority
        assert_eq!(r.classification, "consolidation");
    }

    #[test]
    fn classification_batch_payment() {
        // >=3 non-OP_RETURN outputs, different types -> batch_payment
        let tx = make_tx(
            vec![make_input()],
            vec![
                output(100_000, p2wpkh_script(0x01)),
                output(200_000, p2tr_script(0x02)),
                output(50_000, p2pkh_script(0x03)),
            ],
        );
        let prev = vec![prevout(360_000, p2wpkh_script(0xBB))];
        let r = run(&tx, &prev);
        assert_eq!(r.classification, "batch_payment");
    }

    #[test]
    fn classification_simple_payment() {
        // 1-2 non-OP_RETURN outputs, no special pattern
        let tx = make_tx(
            vec![make_input()],
            vec![
                output(40_000, p2tr_script(0x01)),
                output(10_000, p2pkh_script(0x02)),
            ],
        );
        let prev = vec![prevout(55_000, p2wpkh_script(0xBB))];
        let r = run(&tx, &prev);
        assert_eq!(r.classification, "simple_payment");
    }

    // ------ OP_RETURN ------

    #[test]
    fn op_return_detected() {
        let tx = make_tx(
            vec![make_input()],
            vec![
                output(50_000, p2wpkh_script(0x11)),
                output(0, op_return_script(b"hello")),
            ],
        );
        let prev = vec![prevout(55_000, p2wpkh_script(0x22))];
        let r = run(&tx, &prev);
        assert_eq!(r.heuristics["op_return"]["detected"], true);
    }

    #[test]
    fn op_return_not_detected() {
        let tx = make_tx(
            vec![make_input()],
            vec![output(50_000, p2wpkh_script(0x11))],
        );
        let prev = vec![prevout(55_000, p2wpkh_script(0x22))];
        let r = run(&tx, &prev);
        assert_eq!(r.heuristics["op_return"]["detected"], false);
    }

    #[test]
    fn op_return_protocol_omni() {
        let tx = make_tx(
            vec![make_input()],
            vec![
                output(50_000, p2wpkh_script(0x11)),
                output(0, op_return_script(b"omni\x00\x01")),
            ],
        );
        let prev = vec![prevout(55_000, p2wpkh_script(0x22))];
        let r = run(&tx, &prev);
        assert_eq!(r.heuristics["op_return"]["protocol"], "omni_layer");
    }

    #[test]
    fn op_return_protocol_opentimestamps() {
        let tx = make_tx(
            vec![make_input()],
            vec![output(0, op_return_script(b"OTS\x00\x01"))],
        );
        let prev = vec![prevout(5_000, p2wpkh_script(0x22))];
        let r = run(&tx, &prev);
        assert_eq!(r.heuristics["op_return"]["protocol"], "opentimestamps");
    }

    // ------ Round Number Payment ------

    #[test]
    fn round_number_detected() {
        let tx = make_tx(
            vec![make_input()],
            vec![output(1_000_000, p2wpkh_script(0x11))], // 0.01 BTC
        );
        let prev = vec![prevout(1_100_000, p2wpkh_script(0x22))];
        let r = run(&tx, &prev);
        assert_eq!(r.heuristics["round_number_payment"]["detected"], true);
    }

    #[test]
    fn round_number_not_detected() {
        let tx = make_tx(
            vec![make_input()],
            vec![output(1_234_567, p2wpkh_script(0x11))],
        );
        let prev = vec![prevout(1_300_000, p2wpkh_script(0x22))];
        let r = run(&tx, &prev);
        assert_eq!(r.heuristics["round_number_payment"]["detected"], false);
    }

    // ------ All 8 heuristic IDs present ------

    #[test]
    fn all_eight_heuristic_ids_present() {
        let tx = make_tx(
            vec![make_input()],
            vec![output(50_000, p2wpkh_script(0x11))],
        );
        let prev = vec![prevout(55_000, p2wpkh_script(0x22))];
        let r = run(&tx, &prev);
        for &id in ALL_HEURISTIC_IDS {
            assert!(r.heuristics.contains_key(id), "Missing heuristic: {}", id);
            assert!(
                r.heuristics[id].get("detected").is_some(),
                "Heuristic {} missing 'detected' field",
                id
            );
        }
        assert_eq!(r.heuristics.len(), 8);
    }

    // ------ Helper function tests ------

    #[test]
    fn is_round_amount_boundary() {
        assert!(is_round_amount(100_000));
        assert!(is_round_amount(1_000_000));
        assert!(is_round_amount(100_000_000)); // 1 BTC
        assert!(!is_round_amount(99_999));
        assert!(!is_round_amount(0));
        assert!(!is_round_amount(50_001));
    }

    #[test]
    fn find_majority_type_basic() {
        let types = vec!["p2wpkh".into(), "p2wpkh".into(), "p2tr".into()];
        assert_eq!(find_majority_type(&types), Some("p2wpkh".into()));
    }

    #[test]
    fn find_majority_type_empty() {
        let types: Vec<String> = vec![];
        assert_eq!(find_majority_type(&types), None);
    }
}
