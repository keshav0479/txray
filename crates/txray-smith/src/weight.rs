//! Weight estimation for Bitcoin transactions.
//!
//! CRITICAL: script type is ALWAYS classified from `script_pubkey_hex` bytes
//! via `classify_script()`. The fixture's `script_type` string is ONLY for display.
//! See README line 146: "script_pubkey_hex is authoritative."

// ─── CompactSize ────────────────────────────────────────────────────────────

/// Returns the byte length of a CompactSize/varint encoding for `n`.
pub fn compact_size(n: usize) -> usize {
    if n <= 252 {
        1
    } else if n <= 0xFFFF {
        3
    } else if n <= 0xFFFF_FFFF {
        5
    } else {
        9
    }
}

// ─── Script classification ──────────────────────────────────────────────────

/// Classify a scriptPubKey from its raw bytes.
/// This is the ONLY source of truth for script type in all weight/PSBT logic.
pub fn classify_script(spk: &[u8]) -> &'static str {
    match spk.len() {
        25 if spk[0] == 0x76
            && spk[1] == 0xa9
            && spk[2] == 0x14
            && spk[23] == 0x88
            && spk[24] == 0xac =>
        {
            "p2pkh"
        }
        23 if spk[0] == 0xa9 && spk[1] == 0x14 && spk[22] == 0x87 => "p2sh",
        22 if spk[0] == 0x00 && spk[1] == 0x14 => "p2wpkh",
        34 if spk[0] == 0x00 && spk[1] == 0x20 => "p2wsh",
        34 if spk[0] == 0x51 && spk[1] == 0x20 => "p2tr",
        _ => "unknown",
    }
}

/// Resolve the effective script type from a scriptPubKey hex string.
/// ALWAYS uses hex classification. NEVER falls back to fixture's script_type.
/// If hex returns "unknown", the weight table maps to 592 WU (worst-case, safe).
pub fn resolve_input_type(script_pubkey_hex: &str) -> String {
    let spk_bytes = hex::decode(script_pubkey_hex).unwrap_or_default();
    classify_script(&spk_bytes).to_string()
}

/// Check if an effective script type is segwit.
pub fn is_segwit_type(effective_type: &str) -> bool {
    matches!(
        effective_type,
        "p2wpkh" | "p2tr" | "p2sh-p2wpkh" | "p2wsh" | "p2sh"
    )
}

// ─── Input weight ───────────────────────────────────────────────────────────

/// Input weight constants (Weight Units):
///
/// | Type         | Non-witness WU | Witness WU | Total WU |
/// |--------------|----------------|------------|----------|
/// | p2wpkh       | 41×4 = 164     | 108        | 272      |
/// | p2tr keypath | 41×4 = 164     | 66         | 230      |
/// | p2pkh        | 148×4 = 592    | +1 if mixed| 592/593  |
/// | p2sh-p2wpkh  | 64×4 = 256     | 108        | 364      |
/// | p2wsh        | 41×4 = 164     | 254        | 418      |
/// | unknown      | worst-case     |            | 592      |
pub fn input_weight(effective_type: &str, has_segwit: bool) -> u64 {
    match effective_type {
        "p2wpkh" => 272,
        "p2tr" => 230,
        "p2pkh" => {
            if has_segwit {
                593 // +1 WU for empty witness stack in mixed segwit tx
            } else {
                592
            }
        }
        "p2sh-p2wpkh" | "p2sh" => 364, // p2sh treated as nested segwit (conservative)
        "p2wsh" => 418,                // conservative 2-of-3 multisig estimate
        _ => 592,                      // unknown → worst-case to NEVER under-estimate fee
    }
}

// ─── Output weight ──────────────────────────────────────────────────────────

/// Output weight derived from actual scriptPubKey hex length.
/// output_bytes = 8 (value) + compact_size(spk_len) + spk_len
/// All output bytes are non-witness → weight = bytes × 4.
pub fn output_weight_from_hex(script_pubkey_hex: &str) -> u64 {
    let spk_len = script_pubkey_hex.len() / 2; // hex chars → bytes
    let output_bytes = 8 + compact_size(spk_len) + spk_len;
    (output_bytes as u64) * 4
}

// ─── Total weight estimation ────────────────────────────────────────────────

/// Information about an input for weight estimation.
#[derive(Clone)]
pub struct InputInfo {
    /// Effective type from classify_script (NOT from fixture string).
    pub effective_type: String,
}

/// Information about an output for weight estimation.
#[derive(Clone)]
pub struct OutputInfo {
    /// The hex-encoded scriptPubKey.
    pub script_pubkey_hex: String,
}

/// Estimate the total weight of a transaction.
///
/// Weight formula:
/// - Version: 4 bytes × 4 = 16 WU
/// - Marker+flag: 2 bytes × 1 = 2 WU (segwit only)
/// - Input count: compact_size × 4 WU
/// - Output count: compact_size × 4 WU
/// - Locktime: 4 bytes × 4 = 16 WU
/// - Each input: per-type constant
/// - Each output: derived from scriptPubKey length
pub fn estimate_weight(inputs: &[InputInfo], outputs: &[OutputInfo]) -> u64 {
    let n_in = inputs.len();
    let n_out = outputs.len();

    // Check if any input is segwit
    let has_segwit = inputs.iter().any(|i| is_segwit_type(&i.effective_type));

    let mut weight: u64 = 0;

    // Version (4 bytes, non-witness)
    weight += 16;

    // Marker + flag (2 bytes, witness) - only if segwit
    if has_segwit {
        weight += 2;
    }

    // Input count (compact_size, non-witness)
    weight += (compact_size(n_in) as u64) * 4;

    // Output count (compact_size, non-witness)
    weight += (compact_size(n_out) as u64) * 4;

    // Locktime (4 bytes, non-witness)
    weight += 16;

    // Inputs
    for input in inputs {
        weight += input_weight(&input.effective_type, has_segwit);
    }

    // Outputs
    for output in outputs {
        weight += output_weight_from_hex(&output.script_pubkey_hex);
    }

    weight
}

/// Convert weight units to virtual bytes (ceil division).
pub fn weight_to_vbytes(weight: u64) -> u64 {
    weight.div_ceil(4)
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── CompactSize ──

    #[test]
    fn test_compact_size() {
        assert_eq!(compact_size(0), 1);
        assert_eq!(compact_size(252), 1);
        assert_eq!(compact_size(253), 3);
        assert_eq!(compact_size(65535), 3);
        assert_eq!(compact_size(65536), 5);
    }

    // ── classify_script ──

    #[test]
    fn test_classify_p2wpkh() {
        // OP_0 OP_PUSH20 <20-byte-hash> → 0014{20 bytes}
        let spk = hex::decode("0014aabbccddee0011223344556677889900aabbccdd").unwrap();
        assert_eq!(classify_script(&spk), "p2wpkh");
    }

    #[test]
    fn test_classify_p2tr() {
        // OP_1 OP_PUSH32 <32-byte-key> → 5120{32 bytes}
        let spk =
            hex::decode("5120aabbccddee001122334455667788990011223344556677889900aabbccddee00")
                .unwrap();
        assert_eq!(classify_script(&spk), "p2tr");
    }

    #[test]
    fn test_classify_p2pkh() {
        // OP_DUP OP_HASH160 OP_PUSH20 <20-byte-hash> OP_EQUALVERIFY OP_CHECKSIG
        let spk = hex::decode("76a914aabbccddee0011223344556677889900aabbccdd88ac").unwrap();
        assert_eq!(classify_script(&spk), "p2pkh");
    }

    #[test]
    fn test_classify_p2sh() {
        // OP_HASH160 OP_PUSH20 <20-byte-hash> OP_EQUAL
        let spk = hex::decode("a914aabbccddee0011223344556677889900aabbccdd87").unwrap();
        assert_eq!(classify_script(&spk), "p2sh");
    }

    #[test]
    fn test_classify_p2wsh() {
        // OP_0 OP_PUSH32 <32-byte-hash> → 0020{32 bytes}
        let spk =
            hex::decode("0020aabbccddee001122334455667788990011223344556677889900aabbccddee00")
                .unwrap();
        assert_eq!(classify_script(&spk), "p2wsh");
    }

    #[test]
    fn test_classify_unknown() {
        let spk = hex::decode("deadbeef").unwrap();
        assert_eq!(classify_script(&spk), "unknown");
    }

    // ── resolve_input_type ──

    #[test]
    fn test_resolve_input_type_from_hex() {
        // p2wpkh hex
        assert_eq!(
            resolve_input_type("0014aabbccddee0011223344556677889900aabbccdd"),
            "p2wpkh"
        );
        // Unknown → returns "unknown" (never falls back to fixture string)
        assert_eq!(resolve_input_type("deadbeef"), "unknown");
    }

    // ── Input weights ──

    #[test]
    fn test_input_weight_p2wpkh() {
        assert_eq!(input_weight("p2wpkh", true), 272);
        assert_eq!(input_weight("p2wpkh", false), 272);
    }

    #[test]
    fn test_input_weight_p2tr() {
        assert_eq!(input_weight("p2tr", true), 230);
    }

    #[test]
    fn test_input_weight_p2pkh() {
        assert_eq!(input_weight("p2pkh", false), 592);
        assert_eq!(input_weight("p2pkh", true), 593); // +1 empty witness
    }

    #[test]
    fn test_input_weight_p2sh_p2wpkh() {
        assert_eq!(input_weight("p2sh-p2wpkh", true), 364);
    }

    #[test]
    fn test_input_weight_p2wsh() {
        assert_eq!(input_weight("p2wsh", true), 418);
    }

    #[test]
    fn test_input_weight_unknown() {
        assert_eq!(input_weight("unknown", true), 592);
        assert_eq!(input_weight("mystery_type", false), 592);
    }

    // ── Output weight ──

    #[test]
    fn test_output_weight_p2wpkh() {
        // p2wpkh spk = 22 bytes → output = 8 + 1 + 22 = 31 bytes → 124 WU
        assert_eq!(
            output_weight_from_hex("0014aabbccddee0011223344556677889900aabbccdd"),
            124
        );
    }

    #[test]
    fn test_output_weight_p2tr() {
        // p2tr spk = 34 bytes → output = 8 + 1 + 34 = 43 bytes → 172 WU
        assert_eq!(
            output_weight_from_hex(
                "5120aabbccddee001122334455667788990011223344556677889900aabbccddee00"
            ),
            172
        );
    }

    #[test]
    fn test_output_weight_p2pkh() {
        // p2pkh spk = 25 bytes → output = 8 + 1 + 25 = 34 bytes → 136 WU
        assert_eq!(
            output_weight_from_hex("76a914aabbccddee0011223344556677889900aabbccdd88ac"),
            136
        );
    }

    // ── Total weight ──

    #[test]
    fn test_estimate_weight_1in_2out_p2wpkh() {
        // 1 p2wpkh input, 2 p2wpkh outputs
        // Overhead: 16 (version) + 2 (marker/flag) + 1×4 (in_count) + 1×4 (out_count) + 16 (locktime) = 42
        // Input: 272
        // Outputs: 124 + 124 = 248
        // Total: 42 + 272 + 248 = 562 WU → ceil(562/4) = 141 vbytes
        let inputs = vec![InputInfo {
            effective_type: "p2wpkh".to_string(),
        }];
        let outputs = vec![
            OutputInfo {
                script_pubkey_hex: "0014aabbccddee0011223344556677889900aabbccdd".to_string(),
            },
            OutputInfo {
                script_pubkey_hex: "0014aabbccddee0011223344556677889900aabbccdd".to_string(),
            },
        ];
        let weight = estimate_weight(&inputs, &outputs);
        assert_eq!(weight, 562);
        assert_eq!(weight_to_vbytes(weight), 141);
    }

    #[test]
    fn test_estimate_weight_mixed_p2pkh_p2wpkh() {
        // 1 p2pkh + 1 p2wpkh input (mixed → segwit tx, p2pkh gets +1 WU)
        // Overhead: 16 + 2 + 4 + 4 + 16 = 42
        // Inputs: 593 (p2pkh mixed) + 272 (p2wpkh) = 865
        // Output: 124 (p2wpkh)
        // Total: 42 + 865 + 124 = 1031
        let inputs = vec![
            InputInfo {
                effective_type: "p2pkh".to_string(),
            },
            InputInfo {
                effective_type: "p2wpkh".to_string(),
            },
        ];
        let outputs = vec![OutputInfo {
            script_pubkey_hex: "0014aabbccddee0011223344556677889900aabbccdd".to_string(),
        }];
        let weight = estimate_weight(&inputs, &outputs);
        assert_eq!(weight, 1031);
    }

    #[test]
    fn test_estimate_weight_large_varint() {
        // With 253 outputs, compact_size grows from 1 to 3 bytes → adds 8 WU
        let inputs = vec![InputInfo {
            effective_type: "p2wpkh".to_string(),
        }];
        let outputs: Vec<OutputInfo> = (0..253)
            .map(|_| OutputInfo {
                script_pubkey_hex: "0014aabbccddee0011223344556677889900aabbccdd".to_string(),
            })
            .collect();

        let weight = estimate_weight(&inputs, &outputs);
        // Overhead: 16 + 2 + 1×4 + 3×4 (253 outputs → 3-byte varint) + 16 = 50
        // Inputs: 272
        // Outputs: 253 × 124 = 31372
        // Total: 50 + 272 + 31372 = 31694
        assert_eq!(weight, 31694);
    }

    // ── vbytes ──

    #[test]
    fn test_weight_to_vbytes_ceil() {
        assert_eq!(weight_to_vbytes(400), 100);
        assert_eq!(weight_to_vbytes(401), 101);
        assert_eq!(weight_to_vbytes(403), 101);
        assert_eq!(weight_to_vbytes(404), 101);
        assert_eq!(weight_to_vbytes(405), 102);
    }
}
