/// Classify an output scriptPubKey into a script type.
pub fn classify_output_script(script: &[u8]) -> &'static str {
    let len = script.len();

    // OP_RETURN: starts with 0x6a
    if len >= 1 && script[0] == 0x6a {
        return "op_return";
    }

    // P2PKH: 76a914{20}88ac (25 bytes)
    if len == 25
        && script[0] == 0x76
        && script[1] == 0xa9
        && script[2] == 0x14
        && script[23] == 0x88
        && script[24] == 0xac
    {
        return "p2pkh";
    }

    // P2SH: a914{20}87 (23 bytes)
    if len == 23 && script[0] == 0xa9 && script[1] == 0x14 && script[22] == 0x87 {
        return "p2sh";
    }

    // P2WPKH: 0014{20} (22 bytes)
    if len == 22 && script[0] == 0x00 && script[1] == 0x14 {
        return "p2wpkh";
    }

    // P2WSH: 0020{32} (34 bytes)
    if len == 34 && script[0] == 0x00 && script[1] == 0x20 {
        return "p2wsh";
    }

    // P2TR: 5120{32} (34 bytes) — OP_1 OP_PUSHBYTES_32
    if len == 34 && script[0] == 0x51 && script[1] == 0x20 {
        return "p2tr";
    }

    "unknown"
}

/// Classify an input's spend type based on prevout scriptPubKey, scriptSig, and witness.
pub fn classify_input_script(
    prevout_script: &[u8],
    script_sig: &[u8],
    witness: &[Vec<u8>],
) -> &'static str {
    let prevout_type = classify_output_script(prevout_script);

    match prevout_type {
        "p2pkh" => "p2pkh",
        "p2wpkh" => "p2wpkh",
        "p2wsh" => "p2wsh",
        "p2tr" => classify_taproot_spend(witness),
        "p2sh" => classify_p2sh_spend(script_sig, witness),
        _ => "unknown",
    }
}

/// Classify a Taproot spend: keypath vs scriptpath
fn classify_taproot_spend(witness: &[Vec<u8>]) -> &'static str {
    if witness.is_empty() {
        return "unknown";
    }

    // Check if there's an annex (starts with 0x50). If so, the effective witness
    // stack for classification excludes the annex.
    let effective_witness: Vec<&Vec<u8>> = if witness.len() >= 2
        && !witness.last().unwrap().is_empty()
        && witness.last().unwrap()[0] == 0x50
    {
        witness[..witness.len() - 1].iter().collect()
    } else {
        witness.iter().collect()
    };

    if effective_witness.len() == 1 {
        // Keypath spend: single witness item (signature, 64 or 65 bytes)
        let sig_len = effective_witness[0].len();
        if sig_len == 64 || sig_len == 65 {
            return "p2tr_keypath";
        }
        return "unknown";
    }

    // Scriptpath spend: >=2 items, last item is control block starting with 0xc0/0xc1
    if effective_witness.len() >= 2 {
        let last = effective_witness.last().unwrap();
        if !last.is_empty() && (last[0] & 0xfe) == 0xc0 {
            return "p2tr_scriptpath";
        }
    }

    "unknown"
}

/// Classify a P2SH spend: detect nested segwit (P2SH-P2WPKH or P2SH-P2WSH)
fn classify_p2sh_spend(script_sig: &[u8], witness: &[Vec<u8>]) -> &'static str {
    // For nested segwit, the scriptSig should contain a single push of the
    // redeem script, which is a witness program.
    // P2SH-P2WPKH: scriptSig = <push 22 bytes: 0014{20}>
    // P2SH-P2WSH:  scriptSig = <push 34 bytes: 0020{32}>

    if !witness.is_empty() {
        // Has witness data — this is nested segwit
        // Parse the scriptSig to find the pushed redeem script
        if let Some(redeem) = extract_single_push(script_sig) {
            if redeem.len() == 22 && redeem[0] == 0x00 && redeem[1] == 0x14 {
                return "p2sh-p2wpkh";
            }
            if redeem.len() == 34 && redeem[0] == 0x00 && redeem[1] == 0x20 {
                return "p2sh-p2wsh";
            }
        }
    }

    // Non-segwit P2SH or unrecognized — just classify as unknown for inputs
    // (the spec doesn't have a plain "p2sh" input type)
    "unknown"
}

/// Extract a single data push from a script. Returns None if the script
/// doesn't consist of exactly one push operation.
fn extract_single_push(script: &[u8]) -> Option<&[u8]> {
    if script.is_empty() {
        return None;
    }

    let mut offset = 0;
    let (push_data, consumed) = read_push_at(script, &mut offset)?;

    if consumed == script.len() {
        Some(push_data)
    } else {
        None
    }
}

/// Read a single push operation from a script, returning the pushed data and
/// advancing the offset.
fn read_push_at<'a>(script: &'a [u8], offset: &mut usize) -> Option<(&'a [u8], usize)> {
    if *offset >= script.len() {
        return None;
    }

    let opcode = script[*offset];
    let start = *offset;

    match opcode {
        // OP_0
        0x00 => {
            *offset += 1;
            Some((&[], *offset - start))
        }
        // Direct push: 1-75 bytes
        0x01..=0x4b => {
            let len = opcode as usize;
            *offset += 1;
            if *offset + len > script.len() {
                return None;
            }
            let data = &script[*offset..*offset + len];
            *offset += len;
            Some((data, *offset - start))
        }
        // OP_PUSHDATA1
        0x4c => {
            *offset += 1;
            if *offset >= script.len() {
                return None;
            }
            let len = script[*offset] as usize;
            *offset += 1;
            if *offset + len > script.len() {
                return None;
            }
            let data = &script[*offset..*offset + len];
            *offset += len;
            Some((data, *offset - start))
        }
        // OP_PUSHDATA2
        0x4d => {
            *offset += 1;
            if *offset + 2 > script.len() {
                return None;
            }
            let len = u16::from_le_bytes([script[*offset], script[*offset + 1]]) as usize;
            *offset += 2;
            if *offset + len > script.len() {
                return None;
            }
            let data = &script[*offset..*offset + len];
            *offset += len;
            Some((data, *offset - start))
        }
        // OP_PUSHDATA4
        0x4e => {
            *offset += 1;
            if *offset + 4 > script.len() {
                return None;
            }
            let len = u32::from_le_bytes([
                script[*offset],
                script[*offset + 1],
                script[*offset + 2],
                script[*offset + 3],
            ]) as usize;
            *offset += 4;
            if *offset + len > script.len() {
                return None;
            }
            let data = &script[*offset..*offset + len];
            *offset += len;
            Some((data, *offset - start))
        }
        _ => None,
    }
}

/// Disassemble a script to human-readable ASM string.
pub fn disassemble_script(script: &[u8]) -> String {
    if script.is_empty() {
        return String::new();
    }

    let mut tokens = Vec::new();
    let mut offset = 0;

    while offset < script.len() {
        let opcode = script[offset];

        match opcode {
            // OP_0
            0x00 => {
                tokens.push("OP_0".to_string());
                offset += 1;
            }
            // Direct push: OP_PUSHBYTES_1 through OP_PUSHBYTES_75
            0x01..=0x4b => {
                let len = opcode as usize;
                offset += 1;
                if offset + len > script.len() {
                    tokens.push(format!("OP_PUSHBYTES_{} <invalid>", len));
                    break;
                }
                let data = &script[offset..offset + len];
                tokens.push(format!("OP_PUSHBYTES_{} {}", len, hex::encode(data)));
                offset += len;
            }
            // OP_PUSHDATA1
            0x4c => {
                offset += 1;
                if offset >= script.len() {
                    tokens.push("OP_PUSHDATA1 <invalid>".to_string());
                    break;
                }
                let len = script[offset] as usize;
                offset += 1;
                if offset + len > script.len() {
                    tokens.push("OP_PUSHDATA1 <invalid>".to_string());
                    break;
                }
                let data = &script[offset..offset + len];
                tokens.push(format!("OP_PUSHDATA1 {}", hex::encode(data)));
                offset += len;
            }
            // OP_PUSHDATA2
            0x4d => {
                offset += 1;
                if offset + 2 > script.len() {
                    tokens.push("OP_PUSHDATA2 <invalid>".to_string());
                    break;
                }
                let len = u16::from_le_bytes([script[offset], script[offset + 1]]) as usize;
                offset += 2;
                if offset + len > script.len() {
                    tokens.push("OP_PUSHDATA2 <invalid>".to_string());
                    break;
                }
                let data = &script[offset..offset + len];
                tokens.push(format!("OP_PUSHDATA2 {}", hex::encode(data)));
                offset += len;
            }
            // OP_PUSHDATA4
            0x4e => {
                offset += 1;
                if offset + 4 > script.len() {
                    tokens.push("OP_PUSHDATA4 <invalid>".to_string());
                    break;
                }
                let len = u32::from_le_bytes([
                    script[offset],
                    script[offset + 1],
                    script[offset + 2],
                    script[offset + 3],
                ]) as usize;
                offset += 4;
                if offset + len > script.len() {
                    tokens.push("OP_PUSHDATA4 <invalid>".to_string());
                    break;
                }
                let data = &script[offset..offset + len];
                tokens.push(format!("OP_PUSHDATA4 {}", hex::encode(data)));
                offset += len;
            }
            // OP_1NEGATE
            0x4f => {
                tokens.push("OP_1NEGATE".to_string());
                offset += 1;
            }
            // OP_RESERVED
            0x50 => {
                tokens.push("OP_RESERVED".to_string());
                offset += 1;
            }
            // OP_1 through OP_16
            0x51..=0x60 => {
                let num = opcode - 0x50;
                tokens.push(format!("OP_{}", num));
                offset += 1;
            }
            // Named opcodes
            _ => {
                tokens.push(opcode_name(opcode).to_string());
                offset += 1;
            }
        }
    }

    tokens.join(" ")
}

/// Decode OP_RETURN payload: extract all data pushes after OP_RETURN
pub fn decode_op_return(script: &[u8]) -> (String, Option<String>, &'static str) {
    // First byte should be 0x6a (OP_RETURN)
    if script.is_empty() || script[0] != 0x6a {
        return (String::new(), None, "unknown");
    }

    let mut offset: usize = 1; // skip OP_RETURN
    let mut all_data = Vec::new();

    while offset < script.len() {
        let opcode = script[offset];

        let data = match opcode {
            0x01..=0x4b => {
                let len = opcode as usize;
                offset += 1;
                if offset + len > script.len() {
                    break;
                }
                let d = &script[offset..offset + len];
                offset += len;
                d
            }
            0x4c => {
                // OP_PUSHDATA1
                offset += 1;
                if offset >= script.len() {
                    break;
                }
                let len = script[offset] as usize;
                offset += 1;
                if offset + len > script.len() {
                    break;
                }
                let d = &script[offset..offset + len];
                offset += len;
                d
            }
            0x4d => {
                // OP_PUSHDATA2
                offset += 1;
                if offset + 2 > script.len() {
                    break;
                }
                let len = u16::from_le_bytes([script[offset], script[offset + 1]]) as usize;
                offset += 2;
                if offset + len > script.len() {
                    break;
                }
                let d = &script[offset..offset + len];
                offset += len;
                d
            }
            0x4e => {
                // OP_PUSHDATA4
                offset += 1;
                if offset + 4 > script.len() {
                    break;
                }
                let len = u32::from_le_bytes([
                    script[offset],
                    script[offset + 1],
                    script[offset + 2],
                    script[offset + 3],
                ]) as usize;
                offset += 4;
                if offset + len > script.len() {
                    break;
                }
                let d = &script[offset..offset + len];
                offset += len;
                d
            }
            0x00 => {
                // OP_0 pushes empty
                offset += 1;
                &[]
            }
            _ => {
                // Not a push opcode — stop parsing (some OP_RETURN scripts
                // have non-push opcodes, we just stop)
                break;
            }
        };

        all_data.extend_from_slice(data);
    }

    let data_hex = hex::encode(&all_data);

    // Try UTF-8 decode
    let data_utf8 = std::str::from_utf8(&all_data).ok().map(|s| s.to_string());

    // Protocol detection
    let protocol = if data_hex.starts_with("6f6d6e69") {
        "omni"
    } else if data_hex.starts_with("0109f91102") {
        "opentimestamps"
    } else {
        "unknown"
    };

    (data_hex, data_utf8, protocol)
}

/// Get the standard opcode name for a given byte (public API for script_exec).
pub fn opcode_name_from_byte(opcode: u8) -> String {
    opcode_name(opcode)
}

/// Get the standard opcode name for a given byte
fn opcode_name(opcode: u8) -> String {
    match opcode {
        0x61 => "OP_NOP".to_string(),
        0x62 => "OP_VER".to_string(),
        0x63 => "OP_IF".to_string(),
        0x64 => "OP_NOTIF".to_string(),
        0x65 => "OP_VERIF".to_string(),
        0x66 => "OP_VERNOTIF".to_string(),
        0x67 => "OP_ELSE".to_string(),
        0x68 => "OP_ENDIF".to_string(),
        0x69 => "OP_VERIFY".to_string(),
        0x6a => "OP_RETURN".to_string(),
        0x6b => "OP_TOALTSTACK".to_string(),
        0x6c => "OP_FROMALTSTACK".to_string(),
        0x6d => "OP_2DROP".to_string(),
        0x6e => "OP_2DUP".to_string(),
        0x6f => "OP_3DUP".to_string(),
        0x70 => "OP_2OVER".to_string(),
        0x71 => "OP_2ROT".to_string(),
        0x72 => "OP_2SWAP".to_string(),
        0x73 => "OP_IFDUP".to_string(),
        0x74 => "OP_DEPTH".to_string(),
        0x75 => "OP_DROP".to_string(),
        0x76 => "OP_DUP".to_string(),
        0x77 => "OP_NIP".to_string(),
        0x78 => "OP_OVER".to_string(),
        0x79 => "OP_PICK".to_string(),
        0x7a => "OP_ROLL".to_string(),
        0x7b => "OP_ROT".to_string(),
        0x7c => "OP_SWAP".to_string(),
        0x7d => "OP_TUCK".to_string(),
        0x7e => "OP_CAT".to_string(),
        0x7f => "OP_SUBSTR".to_string(),
        0x80 => "OP_LEFT".to_string(),
        0x81 => "OP_RIGHT".to_string(),
        0x82 => "OP_SIZE".to_string(),
        0x83 => "OP_INVERT".to_string(),
        0x84 => "OP_AND".to_string(),
        0x85 => "OP_OR".to_string(),
        0x86 => "OP_XOR".to_string(),
        0x87 => "OP_EQUAL".to_string(),
        0x88 => "OP_EQUALVERIFY".to_string(),
        0x89 => "OP_RESERVED1".to_string(),
        0x8a => "OP_RESERVED2".to_string(),
        0x8b => "OP_1ADD".to_string(),
        0x8c => "OP_1SUB".to_string(),
        0x8d => "OP_2MUL".to_string(),
        0x8e => "OP_2DIV".to_string(),
        0x8f => "OP_NEGATE".to_string(),
        0x90 => "OP_ABS".to_string(),
        0x91 => "OP_NOT".to_string(),
        0x92 => "OP_0NOTEQUAL".to_string(),
        0x93 => "OP_ADD".to_string(),
        0x94 => "OP_SUB".to_string(),
        0x95 => "OP_MUL".to_string(),
        0x96 => "OP_DIV".to_string(),
        0x97 => "OP_MOD".to_string(),
        0x98 => "OP_LSHIFT".to_string(),
        0x99 => "OP_RSHIFT".to_string(),
        0x9a => "OP_BOOLAND".to_string(),
        0x9b => "OP_BOOLOR".to_string(),
        0x9c => "OP_NUMEQUAL".to_string(),
        0x9d => "OP_NUMEQUALVERIFY".to_string(),
        0x9e => "OP_NUMNOTEQUAL".to_string(),
        0x9f => "OP_LESSTHAN".to_string(),
        0xa0 => "OP_GREATERTHAN".to_string(),
        0xa1 => "OP_LESSTHANOREQUAL".to_string(),
        0xa2 => "OP_GREATERTHANOREQUAL".to_string(),
        0xa3 => "OP_MIN".to_string(),
        0xa4 => "OP_MAX".to_string(),
        0xa5 => "OP_WITHIN".to_string(),
        0xa6 => "OP_RIPEMD160".to_string(),
        0xa7 => "OP_SHA1".to_string(),
        0xa8 => "OP_SHA256".to_string(),
        0xa9 => "OP_HASH160".to_string(),
        0xaa => "OP_HASH256".to_string(),
        0xab => "OP_CODESEPARATOR".to_string(),
        0xac => "OP_CHECKSIG".to_string(),
        0xad => "OP_CHECKSIGVERIFY".to_string(),
        0xae => "OP_CHECKMULTISIG".to_string(),
        0xaf => "OP_CHECKMULTISIGVERIFY".to_string(),
        0xb0 => "OP_NOP1".to_string(),
        0xb1 => "OP_CHECKLOCKTIMEVERIFY".to_string(),
        0xb2 => "OP_CHECKSEQUENCEVERIFY".to_string(),
        0xb3 => "OP_NOP4".to_string(),
        0xb4 => "OP_NOP5".to_string(),
        0xb5 => "OP_NOP6".to_string(),
        0xb6 => "OP_NOP7".to_string(),
        0xb7 => "OP_NOP8".to_string(),
        0xb8 => "OP_NOP9".to_string(),
        0xb9 => "OP_NOP10".to_string(),
        0xba => "OP_CHECKSIGADD".to_string(),
        _ => format!("OP_UNKNOWN_<0x{:02x}>", opcode),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ========== classify_output_script ==========

    #[test]
    fn test_classify_p2pkh() {
        // 76a914{20 bytes}88ac
        let mut script = vec![0x76, 0xa9, 0x14];
        script.extend_from_slice(&[0xAA; 20]);
        script.push(0x88);
        script.push(0xac);
        assert_eq!(classify_output_script(&script), "p2pkh");
    }

    #[test]
    fn test_classify_p2sh() {
        // a914{20 bytes}87
        let mut script = vec![0xa9, 0x14];
        script.extend_from_slice(&[0xBB; 20]);
        script.push(0x87);
        assert_eq!(classify_output_script(&script), "p2sh");
    }

    #[test]
    fn test_classify_p2wpkh() {
        // 0014{20 bytes}
        let mut script = vec![0x00, 0x14];
        script.extend_from_slice(&[0xCC; 20]);
        assert_eq!(classify_output_script(&script), "p2wpkh");
    }

    #[test]
    fn test_classify_p2wsh() {
        // 0020{32 bytes}
        let mut script = vec![0x00, 0x20];
        script.extend_from_slice(&[0xDD; 32]);
        assert_eq!(classify_output_script(&script), "p2wsh");
    }

    #[test]
    fn test_classify_p2tr() {
        // 5120{32 bytes}
        let mut script = vec![0x51, 0x20];
        script.extend_from_slice(&[0xEE; 32]);
        assert_eq!(classify_output_script(&script), "p2tr");
    }

    #[test]
    fn test_classify_op_return() {
        let script = vec![0x6a, 0x08, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08];
        assert_eq!(classify_output_script(&script), "op_return");
    }

    #[test]
    fn test_classify_op_return_bare() {
        let script = vec![0x6a]; // bare OP_RETURN
        assert_eq!(classify_output_script(&script), "op_return");
    }

    #[test]
    fn test_classify_unknown() {
        let script = vec![0x01, 0x02, 0x03];
        assert_eq!(classify_output_script(&script), "unknown");
    }

    // ========== classify_input_script ==========

    #[test]
    fn test_classify_input_p2pkh() {
        // prevout is P2PKH script
        let mut prevout = vec![0x76, 0xa9, 0x14];
        prevout.extend_from_slice(&[0xAA; 20]);
        prevout.push(0x88);
        prevout.push(0xac);
        assert_eq!(classify_input_script(&prevout, &[0x01], &[]), "p2pkh");
    }

    #[test]
    fn test_classify_input_p2wpkh() {
        let mut prevout = vec![0x00, 0x14];
        prevout.extend_from_slice(&[0xCC; 20]);
        let witness = vec![vec![0x01; 72], vec![0x02; 33]];
        assert_eq!(classify_input_script(&prevout, &[], &witness), "p2wpkh");
    }

    #[test]
    fn test_classify_input_p2tr_keypath() {
        let mut prevout = vec![0x51, 0x20];
        prevout.extend_from_slice(&[0xEE; 32]);
        // Single 64-byte witness = keypath
        let witness = vec![vec![0x01; 64]];
        assert_eq!(
            classify_input_script(&prevout, &[], &witness),
            "p2tr_keypath"
        );
    }

    #[test]
    fn test_classify_input_p2tr_keypath_65() {
        let mut prevout = vec![0x51, 0x20];
        prevout.extend_from_slice(&[0xEE; 32]);
        // 65-byte signature (with sighash type) = keypath
        let witness = vec![vec![0x01; 65]];
        assert_eq!(
            classify_input_script(&prevout, &[], &witness),
            "p2tr_keypath"
        );
    }

    #[test]
    fn test_classify_input_p2tr_scriptpath() {
        let mut prevout = vec![0x51, 0x20];
        prevout.extend_from_slice(&[0xEE; 32]);
        // Multiple witness items, last starts with 0xc0 (control block)
        let mut control_block = vec![0xc0];
        control_block.extend_from_slice(&[0x01; 32]); // pubkey
        let witness = vec![vec![0x01; 10], vec![0x02; 20], control_block];
        assert_eq!(
            classify_input_script(&prevout, &[], &witness),
            "p2tr_scriptpath"
        );
    }

    #[test]
    fn test_classify_input_p2sh_p2wpkh() {
        // prevout is P2SH, scriptSig pushes 0014{20} (P2WPKH witness program)
        let mut prevout = vec![0xa9, 0x14];
        prevout.extend_from_slice(&[0xBB; 20]);
        prevout.push(0x87);

        // scriptSig: push 22 bytes (0x16 = 22), then 0014{20}
        let mut script_sig = vec![0x16, 0x00, 0x14];
        script_sig.extend_from_slice(&[0xCC; 20]);

        let witness = vec![vec![0x01; 72], vec![0x02; 33]];
        assert_eq!(
            classify_input_script(&prevout, &script_sig, &witness),
            "p2sh-p2wpkh"
        );
    }

    #[test]
    fn test_classify_input_p2sh_p2wsh() {
        let mut prevout = vec![0xa9, 0x14];
        prevout.extend_from_slice(&[0xBB; 20]);
        prevout.push(0x87);

        // scriptSig: push 34 bytes (0x22 = 34), then 0020{32}
        let mut script_sig = vec![0x22, 0x00, 0x20];
        script_sig.extend_from_slice(&[0xDD; 32]);

        let witness = vec![vec![0x01; 72]];
        assert_eq!(
            classify_input_script(&prevout, &script_sig, &witness),
            "p2sh-p2wsh"
        );
    }

    // ========== decode_op_return ==========

    #[test]
    fn test_op_return_single_push() {
        // 6a 08 <8 bytes "sob-2026">
        let data = b"sob-2026";
        let mut script = vec![0x6a, 0x08];
        script.extend_from_slice(data);
        let (hex, utf8, proto) = decode_op_return(&script);
        assert_eq!(hex, hex::encode(data));
        assert_eq!(utf8, Some("sob-2026".to_string()));
        assert_eq!(proto, "unknown");
    }

    #[test]
    fn test_op_return_multi_push() {
        // 6a 03 <aaa> 02 <bb>
        let script = vec![0x6a, 0x03, 0x61, 0x61, 0x61, 0x02, 0x62, 0x62];
        let (hex, utf8, _) = decode_op_return(&script);
        assert_eq!(hex, "6161616262"); // concatenated
        assert_eq!(utf8, Some("aaabb".to_string()));
    }

    #[test]
    fn test_op_return_pushdata1() {
        // 6a 4c 03 <3 bytes>
        let script = vec![0x6a, 0x4c, 0x03, 0x01, 0x02, 0x03];
        let (hex, _, _) = decode_op_return(&script);
        assert_eq!(hex, "010203");
    }

    #[test]
    fn test_op_return_bare() {
        // Just OP_RETURN with no data
        let script = vec![0x6a];
        let (hex, _, proto) = decode_op_return(&script);
        assert_eq!(hex, "");
        assert_eq!(proto, "unknown");
    }

    #[test]
    fn test_op_return_omni_protocol() {
        // Omni prefix: 6f6d6e69
        let script = vec![0x6a, 0x04, 0x6f, 0x6d, 0x6e, 0x69];
        let (_, _, proto) = decode_op_return(&script);
        assert_eq!(proto, "omni");
    }

    #[test]
    fn test_op_return_opentimestamps() {
        // OpenTimestamps prefix: 0109f91102
        let script = vec![0x6a, 0x05, 0x01, 0x09, 0xf9, 0x11, 0x02];
        let (_, _, proto) = decode_op_return(&script);
        assert_eq!(proto, "opentimestamps");
    }

    #[test]
    fn test_op_return_non_utf8() {
        // Invalid UTF-8 bytes
        let script = vec![0x6a, 0x03, 0xFF, 0xFE, 0xFD];
        let (hex, utf8, _) = decode_op_return(&script);
        assert_eq!(hex, "fffefd");
        assert!(utf8.is_none());
    }

    // ========== disassemble_script ==========

    #[test]
    fn test_disassemble_empty() {
        assert_eq!(disassemble_script(&[]), "");
    }

    #[test]
    fn test_disassemble_p2pkh() {
        // OP_DUP OP_HASH160 OP_PUSHBYTES_20 <20 bytes> OP_EQUALVERIFY OP_CHECKSIG
        let mut script = vec![0x76, 0xa9, 0x14];
        script.extend_from_slice(&[0xAA; 20]);
        script.push(0x88);
        script.push(0xac);
        let asm = disassemble_script(&script);
        assert!(asm.starts_with("OP_DUP OP_HASH160 OP_PUSHBYTES_20"));
        assert!(asm.ends_with("OP_EQUALVERIFY OP_CHECKSIG"));
    }

    #[test]
    fn test_disassemble_op_0() {
        let script = vec![0x00];
        assert_eq!(disassemble_script(&script), "OP_0");
    }

    #[test]
    fn test_disassemble_op_1_to_16() {
        for n in 1u8..=16 {
            let script = vec![0x50 + n];
            let asm = disassemble_script(&script);
            assert_eq!(asm, format!("OP_{}", n));
        }
    }

    #[test]
    fn test_disassemble_unknown_opcode() {
        let script = vec![0xFE]; // undefined opcode
        let asm = disassemble_script(&script);
        assert_eq!(asm, "OP_UNKNOWN_<0xfe>");
    }

    #[test]
    fn test_disassemble_op_return_with_data() {
        // OP_RETURN OP_PUSHBYTES_8 <8 bytes>
        let mut script = vec![0x6a, 0x08];
        script.extend_from_slice(b"sob-2026");
        let asm = disassemble_script(&script);
        assert!(asm.starts_with("OP_RETURN OP_PUSHBYTES_8"));
    }

    #[test]
    fn test_disassemble_op_1negate() {
        let script = vec![0x4f];
        assert_eq!(disassemble_script(&script), "OP_1NEGATE");
    }

    #[test]
    fn test_disassemble_checksigadd() {
        let script = vec![0xba];
        assert_eq!(disassemble_script(&script), "OP_CHECKSIGADD");
    }
}
