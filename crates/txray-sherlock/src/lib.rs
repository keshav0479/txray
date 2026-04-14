//! # txray-sherlock
//!
//! Chain analysis heuristics - CIOH, change detection, CoinJoin detection,
//! consolidation, address reuse, and more.
//!
//! Main entry point: `analyze_block_file()` reads block/undo/xor files,
//! runs all 8 heuristics on every transaction, and returns structured results.

pub mod advisor;
pub mod entropy;
pub mod fingerprint;
pub mod heuristics;

use heuristics::{analyze_transaction, TxAnalysis, TxContext, ALL_HEURISTIC_IDS};
use serde::Serialize;
use std::collections::BTreeMap;
use std::fs;
use std::path::Path;
use txray_core::error::TxrayError;

// ============== Output Structs ==============

/// Results for a single block's analysis.
pub struct BlockOutput {
    pub block_hash: String,
    pub block_height: u64,
    pub timestamp: u32,
    pub tx_count: u64,
    pub analysis_summary: AnalysisSummary,
    pub tx_analyses: Vec<TxAnalysis>,
    pub script_type_dist: BTreeMap<String, u64>,
}

#[derive(Serialize)]
pub struct AnalysisSummary {
    pub total_transactions_analyzed: u64,
    pub heuristics_applied: Vec<String>,
    pub flagged_transactions: u64,
    pub script_type_distribution: BTreeMap<String, u64>,
    pub fee_rate_stats: FeeRateStats,
}

impl AnalysisSummary {
    pub fn to_json(&self) -> serde_json::Value {
        serde_json::json!({
            "total_transactions_analyzed": self.total_transactions_analyzed,
            "heuristics_applied": self.heuristics_applied,
            "flagged_transactions": self.flagged_transactions,
            "script_type_distribution": self.script_type_distribution,
            "fee_rate_stats": {
                "min_sat_vb": self.fee_rate_stats.min_sat_vb,
                "max_sat_vb": self.fee_rate_stats.max_sat_vb,
                "median_sat_vb": self.fee_rate_stats.median_sat_vb,
                "mean_sat_vb": self.fee_rate_stats.mean_sat_vb,
            },
        })
    }
}

#[derive(Serialize)]
pub struct FeeRateStats {
    pub min_sat_vb: f64,
    pub max_sat_vb: f64,
    pub median_sat_vb: f64,
    pub mean_sat_vb: f64,
}

fn round1(val: f64) -> f64 {
    (val * 10.0).round() / 10.0
}

pub fn compute_fee_stats(fee_rates: &[f64]) -> FeeRateStats {
    if fee_rates.is_empty() {
        return FeeRateStats {
            min_sat_vb: 0.0,
            max_sat_vb: 0.0,
            median_sat_vb: 0.0,
            mean_sat_vb: 0.0,
        };
    }

    let mut sorted = fee_rates.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

    let min = sorted[0];
    let max = sorted[sorted.len() - 1];
    let mean = sorted.iter().sum::<f64>() / sorted.len() as f64;

    let median = if sorted.len().is_multiple_of(2) {
        let mid = sorted.len() / 2;
        (sorted[mid - 1] + sorted[mid]) / 2.0
    } else {
        sorted[sorted.len() / 2]
    };

    FeeRateStats {
        min_sat_vb: round1(min),
        max_sat_vb: round1(max),
        median_sat_vb: round1(median),
        mean_sat_vb: round1(mean),
    }
}

/// Analyze a block file with undo data and XOR key.
/// Returns a tuple of (JSON string, Vec<BlockOutput>) for downstream use.
pub fn analyze_block_file(
    blk_path: &str,
    rev_path: &str,
    xor_path: &str,
) -> Result<(String, Vec<BlockOutput>), TxrayError> {
    let blk_path = Path::new(blk_path);
    let rev_path = Path::new(rev_path);
    let xor_path = Path::new(xor_path);

    // Validate files exist
    for path in [blk_path, rev_path, xor_path] {
        if !path.exists() {
            return Err(TxrayError::file_not_found(format!(
                "File not found: {}",
                path.display()
            )));
        }
    }

    // Read files
    let xor_key = fs::read(xor_path)
        .map_err(|e| TxrayError::file_not_found(format!("Failed to read XOR key: {}", e)))?;

    let mut blk_data = fs::read(blk_path)
        .map_err(|e| TxrayError::file_not_found(format!("Failed to read block file: {}", e)))?;

    let mut rev_data = fs::read(rev_path)
        .map_err(|e| TxrayError::file_not_found(format!("Failed to read undo file: {}", e)))?;

    // XOR-decode
    txray_core::block::xor::xor_decode(&mut blk_data, &xor_key);
    txray_core::block::xor::xor_decode(&mut rev_data, &xor_key);

    // Parse all blocks
    let raw_blocks = txray_core::block::parser::parse_all_blocks(&blk_data)?;

    // Parse undo records
    let undo_records = txray_core::block::undo::parse_undo_file(&rev_data)?;

    if undo_records.is_empty() {
        return Err(TxrayError::parse_error("No undo records found"));
    }

    let blk_basename = blk_path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("unknown.dat");

    // Process each block
    let mut block_outputs: Vec<BlockOutput> = Vec::with_capacity(raw_blocks.len());
    let mut all_fee_rates: Vec<f64> = Vec::new();
    // For block 0 only: store detailed per-tx input/output JSON for web visualizer
    let mut block0_tx_details: Vec<serde_json::Value> = Vec::new();

    for (block_idx, raw_block) in raw_blocks.iter().enumerate() {
        let block_hash_hex = txray_core::block::parser::reversed_hex(&raw_block.header.block_hash);

        // Extract raw transactions
        let raw_txs = txray_core::block::parser::extract_raw_transactions(&raw_block.payload)?;
        let tx_count = raw_txs.len();

        // Parse each transaction
        let mut parsed_txs = Vec::with_capacity(tx_count);
        for raw_tx_bytes in &raw_txs {
            let parsed = txray_core::tx::parser::parse_raw_tx(raw_tx_bytes)?;
            parsed_txs.push(parsed);
        }

        if parsed_txs.is_empty() {
            return Err(TxrayError::invalid_block(format!(
                "Block {} has zero transactions",
                block_hash_hex
            )));
        }

        // Get coinbase info
        let coinbase_tx = &parsed_txs[0];
        let coinbase_inputs: Vec<(Vec<u8>, u32)> = coinbase_tx
            .inputs
            .iter()
            .map(|i| (i.txid.to_vec(), i.vout))
            .collect();
        let is_cb = txray_core::block::coinbase::is_coinbase(&coinbase_inputs);
        let block_height = if is_cb {
            txray_core::block::coinbase::decode_bip34_height(&coinbase_tx.inputs[0].script_sig)?
        } else {
            0
        };

        // Get input counts for non-coinbase txs (for undo parsing)
        let tx_input_counts: Vec<usize> =
            parsed_txs[1..].iter().map(|tx| tx.inputs.len()).collect();

        // Find matching undo record by verifying checksums
        let mut undo_prevouts = None;
        for record in &undo_records {
            if record.verify_checksum(&raw_block.header.prev_block_hash) {
                undo_prevouts =
                    Some(record.parse(&raw_block.header.prev_block_hash, &tx_input_counts)?);
                break;
            }
        }
        let undo_prevouts = undo_prevouts.ok_or_else(|| {
            TxrayError::parse_error(format!(
                "No matching undo record found for block {}",
                block_hash_hex
            ))
        })?;

        // Run heuristics on each transaction
        let mut tx_analyses: Vec<TxAnalysis> = Vec::with_capacity(tx_count);
        let mut block_flagged: usize = 0;
        let mut block_fee_rates: Vec<f64> = Vec::new();
        let mut script_type_dist: BTreeMap<String, u64> = BTreeMap::new();

        for (tx_idx, parsed_tx) in parsed_txs.iter().enumerate() {
            let txid = txray_core::tx::hash::compute_txid(&parsed_tx.base_bytes);
            let is_coinbase_tx = tx_idx == 0;

            let (fee_rate, prevouts_ref) = if is_coinbase_tx {
                (0.0, None)
            } else {
                let prevouts = &undo_prevouts[tx_idx - 1];
                let input_sum: u64 = prevouts.iter().map(|p| p.value_sats).sum();
                let output_sum: u64 = parsed_tx.outputs.iter().map(|o| o.value).sum();
                let fee = input_sum.saturating_sub(output_sum);
                let weight_info = txray_core::tx::weight::compute_weight_info(parsed_tx);
                let fr = if weight_info.vbytes > 0 {
                    fee as f64 / weight_info.vbytes as f64
                } else {
                    0.0
                };
                (fr, Some(prevouts.as_slice()))
            };

            let ctx = TxContext {
                tx: parsed_tx,
                txid,
                is_coinbase: is_coinbase_tx,
                prevouts: prevouts_ref,
                fee_rate,
            };

            let analysis = analyze_transaction(&ctx);

            for st in &analysis.output_script_types {
                *script_type_dist.entry(st.clone()).or_insert(0) += 1;
            }

            if !is_coinbase_tx {
                block_fee_rates.push(fee_rate);
            }

            let is_flagged = analysis
                .heuristics
                .values()
                .any(|v| v.get("detected").and_then(|d| d.as_bool()).unwrap_or(false));
            if is_flagged {
                block_flagged += 1;
            }

            // For block 0: build detailed input/output JSON for web visualizer
            if block_idx == 0 {
                let mut inputs_json = Vec::new();
                let mut outputs_json = Vec::new();
                let mut fee_sats: u64 = 0;

                if let Some(prevouts) = prevouts_ref {
                    let input_sum: u64 = prevouts.iter().map(|p| p.value_sats).sum();
                    let output_sum: u64 = parsed_tx.outputs.iter().map(|o| o.value).sum();
                    fee_sats = input_sum.saturating_sub(output_sum);

                    for p in prevouts {
                        let st = txray_core::tx::script::classify_output_script(&p.script_pubkey)
                            .to_string();
                        let addr = txray_core::tx::address::derive_address(&p.script_pubkey, &st);
                        inputs_json.push(serde_json::json!({
                            "value_sats": p.value_sats,
                            "script_type": st,
                            "address": addr,
                        }));
                    }
                }

                for o in &parsed_tx.outputs {
                    let st = txray_core::tx::script::classify_output_script(&o.script_pubkey)
                        .to_string();
                    let addr = txray_core::tx::address::derive_address(&o.script_pubkey, &st);
                    outputs_json.push(serde_json::json!({
                        "value_sats": o.value,
                        "script_type": st,
                        "address": addr,
                    }));
                }

                let weight_info = txray_core::tx::weight::compute_weight_info(parsed_tx);
                block0_tx_details.push(serde_json::json!({
                    "inputs": inputs_json,
                    "outputs": outputs_json,
                    "fee_sats": fee_sats,
                    "weight": weight_info.weight,
                    "is_coinbase": is_coinbase_tx,
                }));
            }

            tx_analyses.push(analysis);
        }

        all_fee_rates.extend_from_slice(&block_fee_rates);

        let fee_stats = compute_fee_stats(&block_fee_rates);

        let heuristics_applied: Vec<String> =
            ALL_HEURISTIC_IDS.iter().map(|s| s.to_string()).collect();

        let block_summary = AnalysisSummary {
            total_transactions_analyzed: tx_count as u64,
            heuristics_applied,
            flagged_transactions: block_flagged as u64,
            script_type_distribution: script_type_dist.clone(),
            fee_rate_stats: fee_stats,
        };

        block_outputs.push(BlockOutput {
            block_hash: block_hash_hex,
            block_height,
            timestamp: raw_block.header.timestamp,
            tx_count: tx_count as u64,
            analysis_summary: block_summary,
            tx_analyses,
            script_type_dist,
        });
    }

    // File-level aggregation
    let total_txs: u64 = block_outputs.iter().map(|b| b.tx_count).sum();
    let total_flagged: u64 = block_outputs
        .iter()
        .map(|b| b.analysis_summary.flagged_transactions)
        .sum();

    let mut file_script_dist: BTreeMap<String, u64> = BTreeMap::new();
    for bo in &block_outputs {
        for (k, v) in &bo.script_type_dist {
            *file_script_dist.entry(k.clone()).or_insert(0) += v;
        }
    }

    let file_fee_stats = compute_fee_stats(&all_fee_rates);

    let file_heuristics: Vec<String> = ALL_HEURISTIC_IDS.iter().map(|s| s.to_string()).collect();

    let file_summary = AnalysisSummary {
        total_transactions_analyzed: total_txs,
        heuristics_applied: file_heuristics,
        flagged_transactions: total_flagged,
        script_type_distribution: file_script_dist,
        fee_rate_stats: file_fee_stats,
    };

    // Build JSON output
    let mut blocks_json: Vec<serde_json::Value> = Vec::with_capacity(block_outputs.len());

    for (idx, bo) in block_outputs.iter().enumerate() {
        let transactions = if idx == 0 {
            bo.tx_analyses
                .iter()
                .enumerate()
                .map(|(ti, ta)| {
                    let mut tx_json = serde_json::json!({
                        "txid": ta.txid,
                        "heuristics": ta.heuristics,
                        "classification": ta.classification,
                    });
                    if let Some(detail) = block0_tx_details.get(ti) {
                        if let Some(obj) = tx_json.as_object_mut() {
                            if let Some(dobj) = detail.as_object() {
                                for (k, v) in dobj {
                                    obj.insert(k.clone(), v.clone());
                                }
                            }
                        }
                    }
                    tx_json
                })
                .collect::<Vec<_>>()
        } else {
            Vec::new()
        };

        blocks_json.push(serde_json::json!({
            "block_hash": bo.block_hash,
            "block_height": bo.block_height,
            "tx_count": bo.tx_count,
            "analysis_summary": bo.analysis_summary.to_json(),
            "transactions": transactions,
        }));
    }

    let output = serde_json::json!({
        "ok": true,
        "mode": "chain_analysis",
        "file": blk_basename,
        "block_count": block_outputs.len(),
        "analysis_summary": file_summary.to_json(),
        "blocks": blocks_json,
    });

    let json_string = serde_json::to_string(&output)
        .map_err(|e| TxrayError::parse_error(format!("JSON serialization failed: {}", e)))?;

    Ok((json_string, block_outputs))
}

/// Generate a markdown report from analysis results.
pub fn generate_markdown(
    blk_basename: &str,
    file_summary: &AnalysisSummary,
    block_outputs: &[BlockOutput],
) -> String {
    let mut md = String::with_capacity(8192);

    md.push_str(&format!("# Chain Analysis Report: {}\n\n", blk_basename));

    md.push_str("## Summary\n\n");
    md.push_str(&format!(
        "- **Source file:** {}\n- **Blocks analyzed:** {}\n- **Total transactions:** {}\n- **Flagged transactions:** {} ({:.1}%)\n- **Heuristics applied:** {}\n\n",
        blk_basename,
        block_outputs.len(),
        file_summary.total_transactions_analyzed,
        file_summary.flagged_transactions,
        if file_summary.total_transactions_analyzed > 0 {
            file_summary.flagged_transactions as f64 / file_summary.total_transactions_analyzed as f64 * 100.0
        } else { 0.0 },
        file_summary.heuristics_applied.join(", "),
    ));

    md.push_str("## Fee Rate Statistics\n\n");
    md.push_str("| Metric | Value (sat/vB) |\n|--------|---------------|\n");
    md.push_str(&format!(
        "| Min | {:.1} |\n| Max | {:.1} |\n| Median | {:.1} |\n| Mean | {:.1} |\n\n",
        file_summary.fee_rate_stats.min_sat_vb,
        file_summary.fee_rate_stats.max_sat_vb,
        file_summary.fee_rate_stats.median_sat_vb,
        file_summary.fee_rate_stats.mean_sat_vb,
    ));

    md.push_str("## Script Type Distribution\n\n");
    md.push_str("| Script Type | Count |\n|-------------|-------|\n");
    for (st, count) in &file_summary.script_type_distribution {
        md.push_str(&format!("| {} | {} |\n", st, count));
    }
    md.push('\n');

    md.push_str("## Block Details\n\n");

    for (idx, bo) in block_outputs.iter().enumerate() {
        md.push_str(&format!(
            "### Block {} - Height {}\n\n",
            idx + 1,
            bo.block_height
        ));
        md.push_str(&format!(
            "- **Block Hash:** `{}`\n- **Height:** {}\n- **Timestamp:** {}\n- **Transactions:** {}\n- **Flagged:** {} ({:.1}%)\n\n",
            bo.block_hash,
            bo.block_height,
            bo.timestamp,
            bo.tx_count,
            bo.analysis_summary.flagged_transactions,
            if bo.tx_count > 0 {
                bo.analysis_summary.flagged_transactions as f64 / bo.tx_count as f64 * 100.0
            } else { 0.0 },
        ));

        md.push_str("#### Fee Rate\n\n");
        md.push_str(&format!(
            "Min: {:.1} | Median: {:.1} | Mean: {:.1} | Max: {:.1} sat/vB\n\n",
            bo.analysis_summary.fee_rate_stats.min_sat_vb,
            bo.analysis_summary.fee_rate_stats.median_sat_vb,
            bo.analysis_summary.fee_rate_stats.mean_sat_vb,
            bo.analysis_summary.fee_rate_stats.max_sat_vb,
        ));

        md.push_str("#### Heuristic Summary\n\n");
        md.push_str("| Heuristic | Triggered | % |\n|-----------|-----------|---|\n");
        for hid in ALL_HEURISTIC_IDS {
            let count = bo
                .tx_analyses
                .iter()
                .filter(|ta| {
                    ta.heuristics
                        .get(*hid)
                        .and_then(|v| v.get("detected"))
                        .and_then(|d| d.as_bool())
                        .unwrap_or(false)
                })
                .count();
            let pct = if bo.tx_count > 0 {
                count as f64 / bo.tx_count as f64 * 100.0
            } else {
                0.0
            };
            md.push_str(&format!("| {} | {} | {:.1}% |\n", hid, count, pct));
        }
        md.push('\n');

        let mut class_counts: BTreeMap<&str, usize> = BTreeMap::new();
        for ta in &bo.tx_analyses {
            *class_counts.entry(&ta.classification).or_insert(0) += 1;
        }
        md.push_str("#### Transaction Classification\n\n");
        md.push_str("| Classification | Count |\n|----------------|-------|\n");
        for (cls, count) in &class_counts {
            md.push_str(&format!("| {} | {} |\n", cls, count));
        }
        md.push('\n');

        let notable: Vec<&TxAnalysis> = bo
            .tx_analyses
            .iter()
            .filter(|ta| {
                ta.classification == "coinjoin"
                    || ta.classification == "consolidation"
                    || ta.classification == "self_transfer"
            })
            .take(5)
            .collect();

        if !notable.is_empty() {
            md.push_str("#### Notable Transactions\n\n");
            for ta in notable {
                md.push_str(&format!("- `{}` - **{}**\n", ta.txid, ta.classification));
            }
            md.push('\n');
        }
    }

    md.push_str("---\n\n*Generated by Sherlock Chain Analysis Engine*\n");
    md
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round1_precision() {
        assert_eq!(round1(1.0), 1.0);
        assert_eq!(round1(1.15), 1.2);
        assert_eq!(round1(1.04), 1.0);
        assert_eq!(round1(0.0), 0.0);
    }

    #[test]
    fn fee_stats_empty() {
        let s = compute_fee_stats(&[]);
        assert_eq!(s.min_sat_vb, 0.0);
        assert_eq!(s.max_sat_vb, 0.0);
        assert_eq!(s.median_sat_vb, 0.0);
        assert_eq!(s.mean_sat_vb, 0.0);
    }

    #[test]
    fn fee_stats_single() {
        let s = compute_fee_stats(&[5.0]);
        assert_eq!(s.min_sat_vb, 5.0);
        assert_eq!(s.max_sat_vb, 5.0);
        assert_eq!(s.median_sat_vb, 5.0);
        assert_eq!(s.mean_sat_vb, 5.0);
    }

    #[test]
    fn fee_stats_ordering_invariant() {
        let s = compute_fee_stats(&[1.0, 3.0, 5.0, 7.0, 100.0]);
        assert!(s.min_sat_vb <= s.median_sat_vb);
        assert!(s.median_sat_vb <= s.max_sat_vb);
        assert!(s.min_sat_vb >= 0.0);
    }

    #[test]
    fn fee_stats_even_count_median() {
        let s = compute_fee_stats(&[1.0, 2.0, 3.0, 4.0]);
        assert_eq!(s.median_sat_vb, 2.5);
    }

    #[test]
    fn fee_stats_odd_count_median() {
        let s = compute_fee_stats(&[1.0, 2.0, 3.0]);
        assert_eq!(s.median_sat_vb, 2.0);
    }
}
