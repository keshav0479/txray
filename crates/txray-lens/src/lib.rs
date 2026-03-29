//! # txray-lens
//!
//! Transaction and block analysis — extends txray-core with warnings,
//! explanations, and human-readable output generation.
//!
//! Two main entry points:
//! - `analyze_transaction()` — parse a fixture JSON, analyze the tx, return JSON
//! - `analyze_block()` — read block/undo/xor files, analyze all txs, return JSON

pub mod warnings;

use std::collections::HashMap;
use std::fs;
use std::path::Path;
use txray_core::error::TxrayError;

struct PrevoutInfo {
    value_sats: u64,
    script_pubkey: Vec<u8>,
    script_pubkey_hex: String,
}

/// Analyze a transaction from a fixture JSON file.
/// Returns the analysis result as a pretty-printed JSON string.
pub fn analyze_transaction(fixture_path: &str) -> Result<String, TxrayError> {
    // 1. Read fixture file
    let fixture_path = Path::new(fixture_path);
    if !fixture_path.exists() {
        return Err(TxrayError::file_not_found(format!(
            "Fixture file not found: {}",
            fixture_path.display()
        )));
    }

    let fixture_text = fs::read_to_string(fixture_path)
        .map_err(|e| TxrayError::invalid_fixture(format!("Cannot read fixture: {}", e)))?;

    let fixture: serde_json::Value = serde_json::from_str(&fixture_text)
        .map_err(|e| TxrayError::invalid_fixture(format!("Invalid JSON: {}", e)))?;

    // 2. Extract required fields
    let network = fixture
        .get("network")
        .and_then(|v| v.as_str())
        .ok_or_else(|| TxrayError::invalid_fixture("Missing 'network' field"))?;

    let raw_tx_hex = fixture
        .get("raw_tx")
        .and_then(|v| v.as_str())
        .ok_or_else(|| TxrayError::invalid_fixture("Missing 'raw_tx' field"))?;

    let prevouts_array = fixture
        .get("prevouts")
        .and_then(|v| v.as_array())
        .ok_or_else(|| TxrayError::invalid_fixture("Missing 'prevouts' array"))?;

    // 3. Decode raw transaction hex
    if raw_tx_hex.len() % 2 != 0 {
        return Err(TxrayError::invalid_hex("Odd-length hex string"));
    }
    let raw_tx_bytes = hex::decode(raw_tx_hex)
        .map_err(|e| TxrayError::invalid_hex(format!("Invalid hex: {}", e)))?;

    // 4. Build prevout lookup map
    let mut prevout_map: HashMap<String, PrevoutInfo> = HashMap::new();
    for prevout in prevouts_array {
        let txid = prevout
            .get("txid")
            .and_then(|v| v.as_str())
            .ok_or_else(|| TxrayError::invalid_fixture("Prevout missing 'txid'"))?;
        let vout = prevout
            .get("vout")
            .and_then(|v| v.as_u64())
            .ok_or_else(|| TxrayError::invalid_fixture("Prevout missing 'vout'"))?;
        let value_sats = prevout
            .get("value_sats")
            .and_then(|v| v.as_u64())
            .ok_or_else(|| TxrayError::invalid_fixture("Prevout missing 'value_sats'"))?;
        let script_pubkey_hex = prevout
            .get("script_pubkey_hex")
            .and_then(|v| v.as_str())
            .ok_or_else(|| TxrayError::invalid_fixture("Prevout missing 'script_pubkey_hex'"))?;
        let script_pubkey = hex::decode(script_pubkey_hex)
            .map_err(|e| TxrayError::invalid_hex(format!("Invalid prevout script hex: {}", e)))?;

        let key = format!("{}:{}", txid.to_ascii_lowercase(), vout);
        if prevout_map.contains_key(&key) {
            return Err(TxrayError::prevout_duplicate(format!(
                "Duplicate prevout: {}",
                key
            )));
        }
        prevout_map.insert(
            key,
            PrevoutInfo {
                value_sats,
                script_pubkey,
                script_pubkey_hex: script_pubkey_hex.to_string(),
            },
        );
    }

    // 5. Parse the raw transaction
    let parsed = txray_core::tx::parser::parse_raw_tx(&raw_tx_bytes)?;

    // 6. Compute txid and wtxid
    let txid = txray_core::tx::hash::compute_txid(&parsed.base_bytes);
    let wtxid = if parsed.is_segwit {
        Some(txray_core::tx::hash::compute_wtxid(&parsed.raw_bytes))
    } else {
        None
    };

    // 7. Compute weight info
    let weight_info = txray_core::tx::weight::compute_weight_info(&parsed);

    // 8. Match prevouts to inputs and compute fees
    let mut total_input_sats: u64 = 0;
    let mut used_keys = Vec::new();

    let mut vin_json = Vec::new();
    for (i, input) in parsed.inputs.iter().enumerate() {
        let input_txid = input.txid_hex();
        let key = format!("{}:{}", input_txid, input.vout);

        let prevout_info = prevout_map.get(&key).ok_or_else(|| {
            TxrayError::prevout_missing(format!("No prevout for input {}: {}", i, key))
        })?;
        used_keys.push(key);
        total_input_sats += prevout_info.value_sats;

        // Classify input script type
        let input_script_type = txray_core::tx::script::classify_input_script(
            &prevout_info.script_pubkey,
            &input.script_sig,
            &input.witness,
        );

        // Derive address
        let address = txray_core::tx::address::derive_input_address(&prevout_info.script_pubkey);

        // Script ASM
        let script_asm = txray_core::tx::script::disassemble_script(&input.script_sig);

        // Relative timelock (BIP68)
        let rel_timelock =
            txray_core::tx::timelock::analyze_relative_timelock(parsed.version, input.sequence);

        // Witness as hex strings
        let witness_hex: Vec<String> = input.witness.iter().map(hex::encode).collect();

        // Build witness_script_asm for p2wsh / p2sh-p2wsh
        let witness_script_asm = if (input_script_type == "p2wsh"
            || input_script_type == "p2sh-p2wsh")
            && !input.witness.is_empty()
        {
            let last_witness = input.witness.last().unwrap();
            Some(txray_core::tx::script::disassemble_script(last_witness))
        } else {
            None
        };

        let mut vin_entry = serde_json::json!({
            "txid": input_txid,
            "vout": input.vout,
            "sequence": input.sequence,
            "script_sig_hex": hex::encode(&input.script_sig),
            "script_asm": script_asm,
            "witness": witness_hex,
            "script_type": input_script_type,
            "address": address,
            "prevout": {
                "value_sats": prevout_info.value_sats,
                "script_pubkey_hex": prevout_info.script_pubkey_hex,
            },
            "relative_timelock": build_relative_timelock_json(&rel_timelock),
        });

        if let Some(ref ws_asm) = witness_script_asm {
            vin_entry.as_object_mut().unwrap().insert(
                "witness_script_asm".to_string(),
                serde_json::Value::String(ws_asm.clone()),
            );
        }

        vin_json.push(vin_entry);
    }

    // Check for extra prevouts
    if used_keys.len() < prevout_map.len() {
        let unused: Vec<String> = prevout_map
            .keys()
            .filter(|k| !used_keys.contains(k))
            .cloned()
            .collect();
        return Err(TxrayError::prevout_extra(format!(
            "Unused prevouts: {}",
            unused.join(", ")
        )));
    }

    // 9. Compute output total and build vout
    let mut total_output_sats: u64 = 0;
    let mut vout_json = Vec::new();
    let mut output_infos = Vec::new();

    for (i, output) in parsed.outputs.iter().enumerate() {
        total_output_sats += output.value;

        let script_type = txray_core::tx::script::classify_output_script(&output.script_pubkey);
        let address = txray_core::tx::address::derive_address(&output.script_pubkey, script_type);
        let script_asm = txray_core::tx::script::disassemble_script(&output.script_pubkey);

        let mut vout_entry = serde_json::json!({
            "n": i,
            "value_sats": output.value,
            "script_pubkey_hex": hex::encode(&output.script_pubkey),
            "script_asm": script_asm,
            "script_type": script_type,
            "address": address,
        });

        // OP_RETURN extra fields
        if script_type == "op_return" {
            let (data_hex, data_utf8, protocol) =
                txray_core::tx::script::decode_op_return(&output.script_pubkey);
            vout_entry.as_object_mut().unwrap().insert(
                "op_return_data_hex".to_string(),
                serde_json::Value::String(data_hex),
            );
            vout_entry.as_object_mut().unwrap().insert(
                "op_return_data_utf8".to_string(),
                match data_utf8 {
                    Some(s) => serde_json::Value::String(s),
                    None => serde_json::Value::Null,
                },
            );
            vout_entry.as_object_mut().unwrap().insert(
                "op_return_protocol".to_string(),
                serde_json::Value::String(protocol.to_string()),
            );
        }

        output_infos.push(warnings::OutputInfo {
            script_type: script_type.to_string(),
            value_sats: output.value,
        });

        vout_json.push(vout_entry);
    }

    // 10. Fee calculations
    let fee_sats = total_input_sats
        .checked_sub(total_output_sats)
        .ok_or_else(|| {
            TxrayError::new(
                "FEE_NEGATIVE",
                format!(
                    "Total inputs ({}) < total outputs ({})",
                    total_input_sats, total_output_sats
                ),
            )
        })?;
    let fee_rate_sat_vb = if weight_info.vbytes > 0 {
        let raw = fee_sats as f64 / weight_info.vbytes as f64;
        (raw * 100.0).round() / 100.0
    } else {
        0.0
    };

    // 11. Timelock analysis
    let sequences: Vec<u32> = parsed.inputs.iter().map(|i| i.sequence).collect();
    let timelock_info =
        txray_core::tx::timelock::analyze_timelock(parsed.version, parsed.locktime, &sequences);

    // 12. Warnings
    let warnings = warnings::generate_warnings(
        fee_sats,
        fee_rate_sat_vb,
        timelock_info.rbf_signaling,
        &output_infos,
    );
    let warnings_json: Vec<serde_json::Value> = warnings.iter().map(|w| w.to_json()).collect();

    // 13. Build segwit_savings JSON
    let segwit_savings_json = match &weight_info.segwit_savings {
        Some(ss) => serde_json::json!({
            "witness_bytes": ss.witness_bytes,
            "non_witness_bytes": ss.non_witness_bytes,
            "total_bytes": ss.total_bytes,
            "weight_actual": ss.weight_actual,
            "weight_if_legacy": ss.weight_if_legacy,
            "savings_pct": ss.savings_pct,
        }),
        None => serde_json::Value::Null,
    };

    // 14. Build the full output JSON
    let output = serde_json::json!({
        "ok": true,
        "network": network,
        "segwit": parsed.is_segwit,
        "txid": txid,
        "wtxid": wtxid,
        "version": parsed.version,
        "locktime": parsed.locktime,
        "size_bytes": weight_info.size_bytes,
        "weight": weight_info.weight,
        "vbytes": weight_info.vbytes,
        "total_input_sats": total_input_sats,
        "total_output_sats": total_output_sats,
        "fee_sats": fee_sats,
        "fee_rate_sat_vb": fee_rate_sat_vb,
        "rbf_signaling": timelock_info.rbf_signaling,
        "locktime_type": timelock_info.locktime_type,
        "locktime_value": timelock_info.locktime_value,
        "segwit_savings": segwit_savings_json,
        "vin": vin_json,
        "vout": vout_json,
        "warnings": warnings_json,
    });

    Ok(serde_json::to_string_pretty(&output).unwrap())
}

fn build_relative_timelock_json(
    rt: &txray_core::tx::timelock::RelativeTimelock,
) -> serde_json::Value {
    if rt.enabled {
        serde_json::json!({
            "enabled": true,
            "type": rt.timelock_type.unwrap_or("unknown"),
            "value": rt.value.unwrap_or(0),
        })
    } else {
        serde_json::json!({
            "enabled": false,
        })
    }
}

/// Analyze a block from raw block, undo, and XOR key files.
/// Returns the analysis result as a pretty-printed JSON string.
pub fn analyze_block(blk_path: &str, rev_path: &str, xor_path: &str) -> Result<String, TxrayError> {
    // 1. Read all files
    let xor_key = fs::read(xor_path)
        .map_err(|e| TxrayError::file_not_found(format!("Cannot read xor.dat: {}", e)))?;

    let mut blk_data = fs::read(blk_path)
        .map_err(|e| TxrayError::file_not_found(format!("Cannot read blk file: {}", e)))?;

    let mut rev_data = fs::read(rev_path)
        .map_err(|e| TxrayError::file_not_found(format!("Cannot read rev file: {}", e)))?;

    // 2. XOR-decode
    txray_core::block::xor::xor_decode(&mut blk_data, &xor_key);
    txray_core::block::xor::xor_decode(&mut rev_data, &xor_key);

    // 3. Parse first block
    let raw_block = txray_core::block::parser::parse_first_block(&blk_data)?;

    // 4. Extract raw transactions from block payload
    let raw_txs = txray_core::block::parser::extract_raw_transactions(&raw_block.payload)?;

    if raw_txs.is_empty() {
        return Err(TxrayError::invalid_block("Block has no transactions"));
    }

    // 5. Parse all transactions
    let mut parsed_txs = Vec::new();
    let mut txid_hashes = Vec::new();

    for (i, raw_tx) in raw_txs.iter().enumerate() {
        let parsed = txray_core::tx::parser::parse_raw_tx(raw_tx).map_err(|e| {
            TxrayError::invalid_block(format!("Failed to parse tx {}: {}", i, e.message))
        })?;
        let txid_hash = txray_core::tx::hash::compute_txid_raw(&parsed.base_bytes);
        txid_hashes.push(txid_hash);
        parsed_txs.push(parsed);
    }

    // 6. Compute and verify merkle root
    let computed_merkle = txray_core::block::merkle::compute_merkle_root(&txid_hashes);
    let merkle_root_valid = computed_merkle == raw_block.header.merkle_root;

    if !merkle_root_valid {
        return Err(TxrayError::merkle_mismatch(format!(
            "Computed merkle root {} does not match header {}",
            hex::encode(computed_merkle),
            hex::encode(raw_block.header.merkle_root)
        )));
    }

    // 7. Parse undo data
    let undo_records = txray_core::block::undo::parse_undo_file(&rev_data)?;
    if undo_records.is_empty() {
        return Err(TxrayError::invalid_undo("No undo records found"));
    }

    let tx_input_counts: Vec<usize> = parsed_txs[1..].iter().map(|t| t.inputs.len()).collect();

    // find matching undo record via checksum
    let mut undo_prevouts = None;
    for record in &undo_records {
        if record.verify_checksum(&raw_block.header.prev_block_hash) {
            undo_prevouts =
                Some(record.parse(&raw_block.header.prev_block_hash, &tx_input_counts)?);
            break;
        }
    }

    let undo_prevouts = undo_prevouts
        .ok_or_else(|| TxrayError::invalid_undo("No matching undo record found for this block"))?;

    // 8. Identify coinbase
    let coinbase_tx = &parsed_txs[0];
    let coinbase_inputs: Vec<(Vec<u8>, u32)> = coinbase_tx
        .inputs
        .iter()
        .map(|inp| (inp.txid.to_vec(), inp.vout))
        .collect();

    if !txray_core::block::coinbase::is_coinbase(&coinbase_inputs) {
        return Err(TxrayError::coinbase_invalid(
            "First transaction is not a valid coinbase",
        ));
    }

    let bip34_height =
        txray_core::block::coinbase::decode_bip34_height(&coinbase_tx.inputs[0].script_sig)?;
    let coinbase_script_hex = hex::encode(&coinbase_tx.inputs[0].script_sig);
    let coinbase_total_output: u64 = coinbase_tx.outputs.iter().map(|o| o.value).sum();

    // 9. Analyze each transaction
    let mut all_tx_json = Vec::new();
    let mut total_fees: u64 = 0;
    let mut total_weight: u64 = 0;
    let mut script_type_counts: HashMap<String, u64> = HashMap::new();

    for (tx_idx, parsed) in parsed_txs.iter().enumerate() {
        let is_coinbase_tx = tx_idx == 0;

        let txid = txray_core::tx::hash::compute_txid(&parsed.base_bytes);
        let wtxid = if parsed.is_segwit {
            Some(txray_core::tx::hash::compute_wtxid(&parsed.raw_bytes))
        } else {
            None
        };

        let weight_info = txray_core::tx::weight::compute_weight_info(parsed);
        total_weight += weight_info.weight as u64;

        let mut total_input_sats: u64 = 0;
        let mut vin_json = Vec::new();

        for (i, input) in parsed.inputs.iter().enumerate() {
            let input_txid = input.txid_hex();
            let witness_hex: Vec<String> = input.witness.iter().map(hex::encode).collect();
            let script_asm = txray_core::tx::script::disassemble_script(&input.script_sig);

            if is_coinbase_tx {
                let rel_timelock = txray_core::tx::timelock::analyze_relative_timelock(
                    parsed.version,
                    input.sequence,
                );
                let vin_entry = serde_json::json!({
                    "txid": input_txid,
                    "vout": input.vout,
                    "sequence": input.sequence,
                    "script_sig_hex": hex::encode(&input.script_sig),
                    "script_asm": script_asm,
                    "witness": witness_hex,
                    "script_type": "unknown",
                    "address": serde_json::Value::Null,
                    "prevout": {
                        "value_sats": 0,
                        "script_pubkey_hex": "",
                    },
                    "relative_timelock": build_relative_timelock_json(&rel_timelock),
                });
                vin_json.push(vin_entry);
            } else {
                let undo_tx_idx = tx_idx - 1;
                let undo_prevout = &undo_prevouts[undo_tx_idx][i];

                total_input_sats += undo_prevout.value_sats;

                let prevout_script = &undo_prevout.script_pubkey;
                let prevout_script_hex = hex::encode(prevout_script);

                let input_script_type = txray_core::tx::script::classify_input_script(
                    prevout_script,
                    &input.script_sig,
                    &input.witness,
                );

                let address = txray_core::tx::address::derive_input_address(prevout_script);
                let rel_timelock = txray_core::tx::timelock::analyze_relative_timelock(
                    parsed.version,
                    input.sequence,
                );

                let witness_script_asm = if (input_script_type == "p2wsh"
                    || input_script_type == "p2sh-p2wsh")
                    && !input.witness.is_empty()
                {
                    let last_witness = input.witness.last().unwrap();
                    Some(txray_core::tx::script::disassemble_script(last_witness))
                } else {
                    None
                };

                let mut vin_entry = serde_json::json!({
                    "txid": input_txid,
                    "vout": input.vout,
                    "sequence": input.sequence,
                    "script_sig_hex": hex::encode(&input.script_sig),
                    "script_asm": script_asm,
                    "witness": witness_hex,
                    "script_type": input_script_type,
                    "address": address,
                    "prevout": {
                        "value_sats": undo_prevout.value_sats,
                        "script_pubkey_hex": prevout_script_hex,
                    },
                    "relative_timelock": build_relative_timelock_json(&rel_timelock),
                });

                if let Some(ref ws_asm) = witness_script_asm {
                    vin_entry.as_object_mut().unwrap().insert(
                        "witness_script_asm".to_string(),
                        serde_json::Value::String(ws_asm.clone()),
                    );
                }

                vin_json.push(vin_entry);
            }
        }

        // Build vout
        let mut total_output_sats: u64 = 0;
        let mut vout_json = Vec::new();
        let mut output_infos = Vec::new();

        for (i, output) in parsed.outputs.iter().enumerate() {
            total_output_sats += output.value;

            let script_type = txray_core::tx::script::classify_output_script(&output.script_pubkey);
            let address =
                txray_core::tx::address::derive_address(&output.script_pubkey, script_type);
            let script_asm = txray_core::tx::script::disassemble_script(&output.script_pubkey);

            *script_type_counts
                .entry(script_type.to_string())
                .or_insert(0) += 1;

            let mut vout_entry = serde_json::json!({
                "n": i,
                "value_sats": output.value,
                "script_pubkey_hex": hex::encode(&output.script_pubkey),
                "script_asm": script_asm,
                "script_type": script_type,
                "address": address,
            });

            if script_type == "op_return" {
                let (data_hex, data_utf8, protocol) =
                    txray_core::tx::script::decode_op_return(&output.script_pubkey);
                vout_entry.as_object_mut().unwrap().insert(
                    "op_return_data_hex".to_string(),
                    serde_json::Value::String(data_hex),
                );
                vout_entry.as_object_mut().unwrap().insert(
                    "op_return_data_utf8".to_string(),
                    match data_utf8 {
                        Some(s) => serde_json::Value::String(s),
                        None => serde_json::Value::Null,
                    },
                );
                vout_entry.as_object_mut().unwrap().insert(
                    "op_return_protocol".to_string(),
                    serde_json::Value::String(protocol.to_string()),
                );
            }

            output_infos.push(warnings::OutputInfo {
                script_type: script_type.to_string(),
                value_sats: output.value,
            });

            vout_json.push(vout_entry);
        }

        // Fee calculation
        let fee_sats = if is_coinbase_tx {
            0u64
        } else {
            total_input_sats
                .checked_sub(total_output_sats)
                .ok_or_else(|| {
                    TxrayError::new(
                        "FEE_NEGATIVE",
                        format!(
                            "Tx inputs ({}) < outputs ({})",
                            total_input_sats, total_output_sats
                        ),
                    )
                })?
        };

        if !is_coinbase_tx {
            total_fees += fee_sats;
        }

        let fee_rate_sat_vb = if weight_info.vbytes > 0 && !is_coinbase_tx {
            let raw = fee_sats as f64 / weight_info.vbytes as f64;
            (raw * 100.0).round() / 100.0
        } else {
            0.0
        };

        // Timelock
        let sequences: Vec<u32> = parsed.inputs.iter().map(|inp| inp.sequence).collect();
        let timelock_info =
            txray_core::tx::timelock::analyze_timelock(parsed.version, parsed.locktime, &sequences);

        // Warnings
        let tx_warnings = warnings::generate_warnings(
            fee_sats,
            fee_rate_sat_vb,
            timelock_info.rbf_signaling,
            &output_infos,
        );
        let warnings_json: Vec<serde_json::Value> =
            tx_warnings.iter().map(|w| w.to_json()).collect();

        // Segwit savings
        let segwit_savings_json = match &weight_info.segwit_savings {
            Some(ss) => serde_json::json!({
                "witness_bytes": ss.witness_bytes,
                "non_witness_bytes": ss.non_witness_bytes,
                "total_bytes": ss.total_bytes,
                "weight_actual": ss.weight_actual,
                "weight_if_legacy": ss.weight_if_legacy,
                "savings_pct": ss.savings_pct,
            }),
            None => serde_json::Value::Null,
        };

        let tx_json = serde_json::json!({
            "ok": true,
            "network": "mainnet",
            "segwit": parsed.is_segwit,
            "txid": txid,
            "wtxid": wtxid,
            "version": parsed.version,
            "locktime": parsed.locktime,
            "size_bytes": weight_info.size_bytes,
            "weight": weight_info.weight,
            "vbytes": weight_info.vbytes,
            "total_input_sats": total_input_sats,
            "total_output_sats": total_output_sats,
            "fee_sats": fee_sats,
            "fee_rate_sat_vb": fee_rate_sat_vb,
            "rbf_signaling": timelock_info.rbf_signaling,
            "locktime_type": timelock_info.locktime_type,
            "locktime_value": timelock_info.locktime_value,
            "segwit_savings": segwit_savings_json,
            "vin": vin_json,
            "vout": vout_json,
            "warnings": warnings_json,
        });

        all_tx_json.push(tx_json);
    }

    // 10. Compute block-level stats
    let total_vbytes: u64 = parsed_txs[1..]
        .iter()
        .map(|t| {
            let w = txray_core::tx::weight::compute_weight_info(t);
            w.vbytes as u64
        })
        .sum();

    let avg_fee_rate = if total_vbytes > 0 {
        let raw = total_fees as f64 / total_vbytes as f64;
        (raw * 100.0).round() / 100.0
    } else {
        0.0
    };

    // 11. Build block output
    let block_hash_hex = txray_core::block::parser::reversed_hex(&raw_block.header.block_hash);

    let block_output = serde_json::json!({
        "ok": true,
        "mode": "block",
        "block_header": {
            "version": raw_block.header.version,
            "prev_block_hash": txray_core::block::parser::reversed_hex(&raw_block.header.prev_block_hash),
            "merkle_root": txray_core::block::parser::reversed_hex(&raw_block.header.merkle_root),
            "merkle_root_valid": merkle_root_valid,
            "timestamp": raw_block.header.timestamp,
            "bits": txray_core::block::parser::bits_hex(raw_block.header.bits),
            "nonce": raw_block.header.nonce,
            "block_hash": &block_hash_hex,
        },
        "tx_count": parsed_txs.len(),
        "coinbase": {
            "bip34_height": bip34_height,
            "coinbase_script_hex": coinbase_script_hex,
            "total_output_sats": coinbase_total_output,
        },
        "transactions": all_tx_json,
        "block_stats": {
            "total_fees_sats": total_fees,
            "total_weight": total_weight,
            "avg_fee_rate_sat_vb": avg_fee_rate,
            "script_type_summary": script_type_counts,
        },
    });

    Ok(serde_json::to_string_pretty(&block_output).unwrap())
}
