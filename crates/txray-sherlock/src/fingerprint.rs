//! Wallet fingerprinting — identify wallet software from transaction patterns.
//!
//! Checks BIP69 ordering, low-R signature grinding, anti-fee-sniping locktime,
//! RBF signaling, change position, and input type consistency to identify
//! likely wallet software (Bitcoin Core, Electrum, Sparrow, Ledger, etc.).

use serde::Serialize;
use txray_core::block::undo::UndoPrevout;
use txray_core::tx::parser::RawTransaction;
use txray_core::tx::script;

/// Position of the likely change output.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub enum ChangePosition {
    /// Change is the first non-OP_RETURN output
    First,
    /// Change is the last non-OP_RETURN output
    Last,
    /// Change position varies or cannot be determined
    Indeterminate,
}

/// Confidence level for wallet identification.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub enum Confidence {
    High,
    Medium,
    Low,
    None,
}

/// Result of wallet fingerprinting analysis.
#[derive(Debug, Clone, Serialize)]
pub struct WalletFingerprint {
    /// Are inputs/outputs lexicographically sorted per BIP69?
    pub bip69_compliant: bool,
    /// Are all signatures low-R (r field ≤ 32 bytes)? None if no sigs found.
    pub low_r_signatures: Option<bool>,
    /// Is locktime set near a plausible block height (anti-fee-sniping)?
    pub anti_fee_sniping: bool,
    /// Is RBF signaled (any input nSequence < 0xFFFFFFFE)?
    pub rbf_signaling: bool,
    /// Position of the likely change output
    pub change_position: ChangePosition,
    /// Are all inputs the same script type?
    pub input_type_consistency: bool,
    /// Identified wallet software, if any
    pub likely_wallet: Option<String>,
    /// Confidence of the wallet identification
    pub confidence: Confidence,
}

/// Analyze a transaction for wallet fingerprint signals.
///
/// `prevouts` provides the previous output data (script types, values) for
/// each input. Pass `None` for coinbase transactions.
pub fn fingerprint_transaction(
    tx: &RawTransaction,
    prevouts: Option<&[UndoPrevout]>,
) -> WalletFingerprint {
    let bip69 = check_bip69(tx, prevouts);
    let low_r = check_low_r_signatures(tx);
    let anti_fee_snipe = check_anti_fee_sniping(tx);
    let rbf = check_rbf_signaling(tx);
    let change_pos = detect_change_position(tx, prevouts);
    let input_consistency = check_input_type_consistency(prevouts);

    let mut fp = WalletFingerprint {
        bip69_compliant: bip69,
        low_r_signatures: low_r,
        anti_fee_sniping: anti_fee_snipe,
        rbf_signaling: rbf,
        change_position: change_pos,
        input_type_consistency: input_consistency,
        likely_wallet: None,
        confidence: Confidence::None,
    };

    let (wallet, confidence) = identify_wallet(&fp, prevouts);
    fp.likely_wallet = wallet;
    fp.confidence = confidence;
    fp
}

// ============== BIP69 Ordering ==============

/// Check if inputs are sorted by (txid_le, vout) and outputs by (value, scriptPubKey).
fn check_bip69(tx: &RawTransaction, prevouts: Option<&[UndoPrevout]>) -> bool {
    // Check input ordering: sorted by (txid as little-endian bytes, vout)
    let inputs_sorted = tx.inputs.windows(2).all(|w| {
        let a = &w[0];
        let b = &w[1];
        // BIP69: compare txid bytes lexicographically (as-is, not reversed)
        match a.txid.cmp(&b.txid) {
            std::cmp::Ordering::Less => true,
            std::cmp::Ordering::Greater => false,
            std::cmp::Ordering::Equal => a.vout <= b.vout,
        }
    });

    // Check output ordering: sorted by (value, scriptPubKey)
    let outputs_sorted = tx.outputs.windows(2).all(|w| {
        let a = &w[0];
        let b = &w[1];
        match a.value.cmp(&b.value) {
            std::cmp::Ordering::Less => true,
            std::cmp::Ordering::Greater => false,
            std::cmp::Ordering::Equal => a.script_pubkey <= b.script_pubkey,
        }
    });

    // For single input/output txs, BIP69 is trivially true — don't count that
    // as a meaningful signal
    let _ = prevouts; // prevouts not needed for ordering check
    inputs_sorted && outputs_sorted
}

// ============== Low-R Signatures ==============

/// Check if all DER-encoded signatures in the transaction have low-R values
/// (r field ≤ 32 bytes). Bitcoin Core ≥0.17 grinds nonces for this.
///
/// Returns `None` if no parseable signatures are found.
fn check_low_r_signatures(tx: &RawTransaction) -> Option<bool> {
    let mut found_any = false;
    let mut all_low_r = true;

    for input in &tx.inputs {
        // Check witness items (segwit signatures)
        for item in &input.witness {
            if is_der_signature(item) {
                found_any = true;
                if !is_low_r(item) {
                    all_low_r = false;
                }
            }
        }

        // Check scriptSig for legacy signatures
        for sig in extract_sigs_from_script_sig(&input.script_sig) {
            if is_der_signature(&sig) {
                found_any = true;
                if !is_low_r(&sig) {
                    all_low_r = false;
                }
            }
        }
    }

    if found_any {
        Some(all_low_r)
    } else {
        None
    }
}

/// Check if a byte slice looks like a DER-encoded ECDSA signature.
/// Format: 0x30 <total_len> 0x02 <r_len> <r...> 0x02 <s_len> <s...> [sighash]
fn is_der_signature(data: &[u8]) -> bool {
    // Minimum DER sig: 30 06 02 01 r 02 01 s + optional sighash = 8 bytes
    if data.len() < 8 || data.len() > 73 {
        return false;
    }
    if data[0] != 0x30 {
        return false;
    }
    let total_len = data[1] as usize;
    // total_len should cover the rest (minus the sighash byte if present)
    if total_len + 2 != data.len() && total_len + 3 != data.len() {
        return false;
    }
    if data.len() < 4 || data[2] != 0x02 {
        return false;
    }
    true
}

/// Check if a DER signature has a low-R value (r field ≤ 32 bytes).
fn is_low_r(sig: &[u8]) -> bool {
    if sig.len() < 4 || sig[0] != 0x30 || sig[2] != 0x02 {
        return false;
    }
    let r_len = sig[3] as usize;
    r_len <= 32
}

/// Extract potential signatures from a scriptSig by parsing push data.
fn extract_sigs_from_script_sig(script_sig: &[u8]) -> Vec<Vec<u8>> {
    let mut sigs = Vec::new();
    let mut offset = 0;

    while offset < script_sig.len() {
        let opcode = script_sig[offset];
        match opcode {
            // Direct push: 1-75 bytes
            0x01..=0x4b => {
                let len = opcode as usize;
                offset += 1;
                if offset + len > script_sig.len() {
                    break;
                }
                let data = script_sig[offset..offset + len].to_vec();
                if is_der_signature(&data) {
                    sigs.push(data);
                }
                offset += len;
            }
            // OP_PUSHDATA1
            0x4c => {
                offset += 1;
                if offset >= script_sig.len() {
                    break;
                }
                let len = script_sig[offset] as usize;
                offset += 1;
                if offset + len > script_sig.len() {
                    break;
                }
                let data = script_sig[offset..offset + len].to_vec();
                if is_der_signature(&data) {
                    sigs.push(data);
                }
                offset += len;
            }
            // Skip everything else
            _ => {
                offset += 1;
            }
        }
    }

    sigs
}

// ============== Anti-Fee-Sniping ==============

/// Check if the locktime is set to a plausible block height (> 500_000_000 means
/// it's a timestamp, not a height). Bitcoin Core sets locktime to the current
/// block height to prevent fee sniping.
fn check_anti_fee_sniping(tx: &RawTransaction) -> bool {
    // locktime == 0 means no anti-fee-sniping
    if tx.locktime == 0 {
        return false;
    }
    // locktime >= 500_000_000 is treated as a Unix timestamp, not a height
    if tx.locktime >= 500_000_000 {
        return false;
    }
    // Any positive block height locktime is considered anti-fee-sniping
    // (we can't verify it's "close" to the tip without chain state)
    true
}

// ============== RBF Signaling ==============

/// Check if any input signals RBF (nSequence < 0xFFFFFFFE).
fn check_rbf_signaling(tx: &RawTransaction) -> bool {
    tx.inputs.iter().any(|input| input.sequence < 0xFFFFFFFE)
}

// ============== Change Position ==============

/// Detect where the likely change output is positioned.
fn detect_change_position(
    tx: &RawTransaction,
    prevouts: Option<&[UndoPrevout]>,
) -> ChangePosition {
    if tx.outputs.len() < 2 {
        return ChangePosition::Indeterminate;
    }

    let output_types: Vec<&str> = tx
        .outputs
        .iter()
        .map(|o| script::classify_output_script(&o.script_pubkey))
        .collect();

    // Filter out OP_RETURN outputs
    let candidate_indices: Vec<usize> = output_types
        .iter()
        .enumerate()
        .filter(|(_, st)| **st != "op_return")
        .map(|(i, _)| i)
        .collect();

    if candidate_indices.len() < 2 {
        return ChangePosition::Indeterminate;
    }

    // Find majority input script type to identify change
    let input_types: Vec<String> = prevouts
        .map(|ps| {
            ps.iter()
                .map(|p| script::classify_output_script(&p.script_pubkey).to_string())
                .collect()
        })
        .unwrap_or_default();

    if input_types.is_empty() {
        return ChangePosition::Indeterminate;
    }

    let majority = find_majority_type(&input_types);
    let majority = match majority {
        Some(m) => m,
        None => return ChangePosition::Indeterminate,
    };

    // Find outputs matching input type — those are likely change
    let matching: Vec<usize> = candidate_indices
        .iter()
        .filter(|&&i| output_types[i] == majority)
        .copied()
        .collect();

    if matching.len() == 1 {
        let change_idx = matching[0];
        let first_candidate = candidate_indices[0];
        let last_candidate = *candidate_indices.last().unwrap();

        if change_idx == first_candidate {
            ChangePosition::First
        } else if change_idx == last_candidate {
            ChangePosition::Last
        } else {
            ChangePosition::Indeterminate
        }
    } else {
        ChangePosition::Indeterminate
    }
}

/// Find the most common string in a list.
fn find_majority_type(types: &[String]) -> Option<String> {
    if types.is_empty() {
        return None;
    }
    let mut counts: std::collections::BTreeMap<&str, usize> = std::collections::BTreeMap::new();
    for t in types {
        *counts.entry(t.as_str()).or_insert(0) += 1;
    }
    counts
        .into_iter()
        .max_by_key(|&(_, count)| count)
        .map(|(t, _)| t.to_string())
}

// ============== Input Type Consistency ==============

/// Check if all inputs spend the same script type.
fn check_input_type_consistency(prevouts: Option<&[UndoPrevout]>) -> bool {
    let prevouts = match prevouts {
        Some(p) if !p.is_empty() => p,
        _ => return true, // vacuously true if no prevouts
    };

    let first_type = script::classify_output_script(&prevouts[0].script_pubkey);
    prevouts
        .iter()
        .all(|p| script::classify_output_script(&p.script_pubkey) == first_type)
}

// ============== Wallet Identification ==============

/// Match fingerprint signals against known wallet patterns.
fn identify_wallet(
    fp: &WalletFingerprint,
    prevouts: Option<&[UndoPrevout]>,
) -> (Option<String>, Confidence) {
    let low_r = fp.low_r_signatures.unwrap_or(false);
    let has_sigs = fp.low_r_signatures.is_some();

    // Determine if all inputs are P2WPKH
    let all_p2wpkh = prevouts
        .map(|ps| {
            !ps.is_empty()
                && ps
                    .iter()
                    .all(|p| script::classify_output_script(&p.script_pubkey) == "p2wpkh")
        })
        .unwrap_or(false);

    // Determine if any input is P2SH-P2WPKH (nested segwit)
    let any_p2sh = prevouts
        .map(|ps| {
            ps.iter()
                .any(|p| script::classify_output_script(&p.script_pubkey) == "p2sh")
        })
        .unwrap_or(false);

    // Bitcoin Core ≥0.17: low-R + anti-fee-sniping + non-BIP69 + RBF
    if has_sigs && low_r && fp.anti_fee_sniping && !fp.bip69_compliant && fp.rbf_signaling {
        return (
            Some("Bitcoin Core (≥0.17)".to_string()),
            Confidence::High,
        );
    }

    // Electrum: BIP69 + no low-R + no anti-fee-sniping
    if has_sigs && fp.bip69_compliant && !low_r && !fp.anti_fee_sniping {
        return (Some("Electrum".to_string()), Confidence::Medium);
    }

    // Sparrow/Specter: non-BIP69 + low-R + P2WPKH only
    if has_sigs && !fp.bip69_compliant && low_r && all_p2wpkh {
        return (
            Some("Sparrow/Specter".to_string()),
            Confidence::Medium,
        );
    }

    // Ledger Live: BIP69 + P2SH-P2WPKH
    if fp.bip69_compliant && any_p2sh {
        return (Some("Ledger Live".to_string()), Confidence::Low);
    }

    (None, Confidence::None)
}

// ============== Display ==============

impl std::fmt::Display for WalletFingerprint {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "Wallet Fingerprint Analysis")?;
        writeln!(f, "═══════════════════════════")?;
        writeln!(f)?;
        writeln!(
            f,
            "  BIP69 compliant:       {}",
            if self.bip69_compliant { "yes" } else { "no" }
        )?;
        writeln!(
            f,
            "  Low-R signatures:      {}",
            match self.low_r_signatures {
                Some(true) => "yes (all)",
                Some(false) => "no",
                None => "n/a (no signatures found)",
            }
        )?;
        writeln!(
            f,
            "  Anti-fee-sniping:      {}",
            if self.anti_fee_sniping { "yes" } else { "no" }
        )?;
        writeln!(
            f,
            "  RBF signaling:         {}",
            if self.rbf_signaling { "yes" } else { "no" }
        )?;
        writeln!(f, "  Change position:       {:?}", self.change_position)?;
        writeln!(
            f,
            "  Input type consistent: {}",
            if self.input_type_consistency {
                "yes"
            } else {
                "no"
            }
        )?;
        writeln!(f)?;
        match &self.likely_wallet {
            Some(wallet) => writeln!(f, "  Likely wallet: {} ({:?})", wallet, self.confidence),
            None => writeln!(f, "  Likely wallet: unknown"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use txray_core::tx::parser::{RawTransaction, TxInput, TxOutput};

    fn make_tx(inputs: Vec<TxInput>, outputs: Vec<TxOutput>, locktime: u32) -> RawTransaction {
        RawTransaction {
            version: 2,
            is_segwit: false,
            inputs,
            outputs,
            locktime,
            raw_bytes: vec![0],
            base_bytes: vec![0],
        }
    }

    fn make_input_with(txid: [u8; 32], vout: u32, sequence: u32) -> TxInput {
        TxInput {
            txid,
            vout,
            script_sig: vec![],
            sequence,
            witness: vec![],
        }
    }

    fn make_input_with_witness(
        txid: [u8; 32],
        vout: u32,
        sequence: u32,
        witness: Vec<Vec<u8>>,
    ) -> TxInput {
        TxInput {
            txid,
            vout,
            script_sig: vec![],
            sequence,
            witness,
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

    fn p2sh_script(hash: u8) -> Vec<u8> {
        let mut s = vec![0xa9, 0x14];
        s.extend_from_slice(&[hash; 20]);
        s.push(0x87);
        s
    }

    fn output(value: u64, script: Vec<u8>) -> TxOutput {
        TxOutput {
            value,
            script_pubkey: script,
        }
    }

    fn prevout(value: u64, script: Vec<u8>) -> UndoPrevout {
        UndoPrevout {
            value_sats: value,
            script_pubkey: script,
        }
    }

    /// Build a fake low-R DER signature (r_len = 32).
    fn fake_low_r_sig() -> Vec<u8> {
        // 30 <total_len> 02 <r_len=0x20> <r: 32 bytes> 02 <s_len=0x20> <s: 32 bytes> <sighash>
        let mut sig = vec![0x30, 0x44, 0x02, 0x20];
        sig.extend_from_slice(&[0x01; 32]); // r
        sig.push(0x02);
        sig.push(0x20);
        sig.extend_from_slice(&[0x02; 32]); // s
        sig.push(0x01); // SIGHASH_ALL
        sig
    }

    /// Build a fake high-R DER signature (r_len = 33, padded with leading 0x00).
    fn fake_high_r_sig() -> Vec<u8> {
        // 30 <total_len> 02 <r_len=0x21> 00 <r: 32 bytes> 02 <s_len=0x20> <s: 32 bytes> <sighash>
        let mut sig = vec![0x30, 0x45, 0x02, 0x21, 0x00];
        sig.extend_from_slice(&[0x80; 32]); // r with high bit set
        sig.push(0x02);
        sig.push(0x20);
        sig.extend_from_slice(&[0x02; 32]); // s
        sig.push(0x01); // SIGHASH_ALL
        sig
    }

    // ── BIP69 ──

    #[test]
    fn bip69_sorted_inputs_and_outputs() {
        let mut txid_a = [0u8; 32];
        txid_a[0] = 0x01;
        let mut txid_b = [0u8; 32];
        txid_b[0] = 0x02;

        let tx = make_tx(
            vec![
                make_input_with(txid_a, 0, 0xffffffff),
                make_input_with(txid_b, 0, 0xffffffff),
            ],
            vec![
                output(10_000, p2wpkh_script(0xaa)),
                output(20_000, p2wpkh_script(0xbb)),
            ],
            0,
        );
        assert!(check_bip69(&tx, None));
    }

    #[test]
    fn bip69_unsorted_inputs() {
        let mut txid_a = [0u8; 32];
        txid_a[0] = 0x02;
        let mut txid_b = [0u8; 32];
        txid_b[0] = 0x01;

        let tx = make_tx(
            vec![
                make_input_with(txid_a, 0, 0xffffffff), // 0x02 first — wrong order
                make_input_with(txid_b, 0, 0xffffffff),
            ],
            vec![
                output(10_000, p2wpkh_script(0xaa)),
                output(20_000, p2wpkh_script(0xbb)),
            ],
            0,
        );
        assert!(!check_bip69(&tx, None));
    }

    #[test]
    fn bip69_unsorted_outputs() {
        let tx = make_tx(
            vec![make_input_with([0x01; 32], 0, 0xffffffff)],
            vec![
                output(20_000, p2wpkh_script(0xaa)), // 20k first — wrong order
                output(10_000, p2wpkh_script(0xbb)),
            ],
            0,
        );
        assert!(!check_bip69(&tx, None));
    }

    // ── Low-R ──

    #[test]
    fn low_r_all_low() {
        let tx = make_tx(
            vec![make_input_with_witness(
                [0; 32],
                0,
                0xffffffff,
                vec![fake_low_r_sig(), vec![0x03; 33]], // sig + pubkey
            )],
            vec![output(50_000, p2wpkh_script(0xaa))],
            0,
        );
        assert_eq!(check_low_r_signatures(&tx), Some(true));
    }

    #[test]
    fn low_r_high_r_detected() {
        let tx = make_tx(
            vec![make_input_with_witness(
                [0; 32],
                0,
                0xffffffff,
                vec![fake_high_r_sig(), vec![0x03; 33]],
            )],
            vec![output(50_000, p2wpkh_script(0xaa))],
            0,
        );
        assert_eq!(check_low_r_signatures(&tx), Some(false));
    }

    #[test]
    fn low_r_no_sigs_returns_none() {
        let tx = make_tx(
            vec![make_input_with([0; 32], 0, 0xffffffff)],
            vec![output(50_000, p2wpkh_script(0xaa))],
            0,
        );
        assert_eq!(check_low_r_signatures(&tx), None);
    }

    // ── Anti-fee-sniping ──

    #[test]
    fn anti_fee_sniping_with_height_locktime() {
        let tx = make_tx(
            vec![make_input_with([0; 32], 0, 0xfffffffe)],
            vec![output(50_000, p2wpkh_script(0xaa))],
            800_000, // block height locktime
        );
        assert!(check_anti_fee_sniping(&tx));
    }

    #[test]
    fn anti_fee_sniping_zero_locktime() {
        let tx = make_tx(
            vec![make_input_with([0; 32], 0, 0xffffffff)],
            vec![output(50_000, p2wpkh_script(0xaa))],
            0,
        );
        assert!(!check_anti_fee_sniping(&tx));
    }

    #[test]
    fn anti_fee_sniping_timestamp_locktime() {
        let tx = make_tx(
            vec![make_input_with([0; 32], 0, 0xfffffffe)],
            vec![output(50_000, p2wpkh_script(0xaa))],
            1_700_000_000, // Unix timestamp
        );
        assert!(!check_anti_fee_sniping(&tx));
    }

    // ── RBF ──

    #[test]
    fn rbf_signaled() {
        let tx = make_tx(
            vec![make_input_with([0; 32], 0, 0xfffffffd)], // < 0xFFFFFFFE
            vec![output(50_000, p2wpkh_script(0xaa))],
            0,
        );
        assert!(check_rbf_signaling(&tx));
    }

    #[test]
    fn rbf_not_signaled() {
        let tx = make_tx(
            vec![make_input_with([0; 32], 0, 0xffffffff)],
            vec![output(50_000, p2wpkh_script(0xaa))],
            0,
        );
        assert!(!check_rbf_signaling(&tx));
    }

    // ── Input Type Consistency ──

    #[test]
    fn input_consistency_same_types() {
        let prevouts = vec![
            prevout(50_000, p2wpkh_script(0xaa)),
            prevout(60_000, p2wpkh_script(0xbb)),
        ];
        assert!(check_input_type_consistency(Some(&prevouts)));
    }

    #[test]
    fn input_consistency_mixed_types() {
        let prevouts = vec![
            prevout(50_000, p2wpkh_script(0xaa)),
            prevout(60_000, p2tr_script(0xbb)),
        ];
        assert!(!check_input_type_consistency(Some(&prevouts)));
    }

    // ── Bitcoin Core Pattern ──

    #[test]
    fn identifies_bitcoin_core_pattern() {
        // low-R + anti-fee-sniping + non-BIP69 + RBF
        let mut txid_a = [0u8; 32];
        txid_a[0] = 0x99; // intentionally unsorted for non-BIP69
        let mut txid_b = [0u8; 32];
        txid_b[0] = 0x01;

        let tx = make_tx(
            vec![
                make_input_with_witness(
                    txid_a,
                    0,
                    0xfffffffd,
                    vec![fake_low_r_sig(), vec![0x03; 33]],
                ),
                make_input_with_witness(
                    txid_b,
                    0,
                    0xfffffffd,
                    vec![fake_low_r_sig(), vec![0x03; 33]],
                ),
            ],
            vec![
                output(80_000, p2tr_script(0x11)),   // payment
                output(15_000, p2wpkh_script(0x22)), // change
            ],
            800_000,
        );
        let prevouts = vec![
            prevout(50_000, p2wpkh_script(0x33)),
            prevout(50_000, p2wpkh_script(0x44)),
        ];

        let fp = fingerprint_transaction(&tx, Some(&prevouts));
        assert_eq!(fp.likely_wallet.as_deref(), Some("Bitcoin Core (≥0.17)"));
        assert_eq!(fp.confidence, Confidence::High);
    }

    // ── Electrum Pattern ──

    #[test]
    fn identifies_electrum_pattern() {
        // BIP69 + no low-R + no anti-fee-sniping
        let mut txid_a = [0u8; 32];
        txid_a[0] = 0x01;
        let mut txid_b = [0u8; 32];
        txid_b[0] = 0x02;

        let tx = make_tx(
            vec![
                make_input_with_witness(
                    txid_a,
                    0,
                    0xffffffff,
                    vec![fake_high_r_sig(), vec![0x03; 33]],
                ),
                make_input_with_witness(
                    txid_b,
                    0,
                    0xffffffff,
                    vec![fake_high_r_sig(), vec![0x03; 33]],
                ),
            ],
            vec![
                output(10_000, p2wpkh_script(0xaa)), // sorted by value
                output(20_000, p2wpkh_script(0xbb)),
            ],
            0,
        );
        let prevouts = vec![
            prevout(16_000, p2wpkh_script(0xcc)),
            prevout(16_000, p2wpkh_script(0xdd)),
        ];

        let fp = fingerprint_transaction(&tx, Some(&prevouts));
        assert_eq!(fp.likely_wallet.as_deref(), Some("Electrum"));
        assert_eq!(fp.confidence, Confidence::Medium);
    }

    // ── Ledger Pattern ──

    #[test]
    fn identifies_ledger_pattern() {
        // BIP69 + P2SH inputs
        let mut txid_a = [0u8; 32];
        txid_a[0] = 0x01;

        let tx = make_tx(
            vec![make_input_with(txid_a, 0, 0xffffffff)],
            vec![
                output(10_000, p2sh_script(0xaa)),
                output(20_000, p2sh_script(0xbb)),
            ],
            0,
        );
        let prevouts = vec![prevout(35_000, p2sh_script(0xcc))];

        let fp = fingerprint_transaction(&tx, Some(&prevouts));
        assert_eq!(fp.likely_wallet.as_deref(), Some("Ledger Live"));
        assert_eq!(fp.confidence, Confidence::Low);
    }

    // ── No match ──

    #[test]
    fn unknown_wallet_when_no_pattern_matches() {
        let tx = make_tx(
            vec![make_input_with([0; 32], 0, 0xffffffff)],
            vec![output(50_000, p2wpkh_script(0xaa))],
            0,
        );
        let prevouts = vec![prevout(55_000, p2wpkh_script(0xbb))];

        let fp = fingerprint_transaction(&tx, Some(&prevouts));
        assert!(fp.likely_wallet.is_none());
        assert_eq!(fp.confidence, Confidence::None);
    }
}
