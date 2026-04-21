/// Derive a Bitcoin address from a scriptPubKey and its classified type.
pub fn derive_address(script: &[u8], script_type: &str) -> Option<String> {
    match script_type {
        "p2pkh" => {
            // script: 76a914{20-byte-hash}88ac
            if script.len() < 25 {
                return None;
            }
            let hash = &script[3..23];
            Some(base58check_encode(0x00, hash))
        }
        "p2sh" => {
            // script: a914{20-byte-hash}87
            if script.len() < 23 {
                return None;
            }
            let hash = &script[2..22];
            Some(base58check_encode(0x05, hash))
        }
        "p2wpkh" => {
            // script: 0014{20-byte-hash}
            if script.len() < 22 {
                return None;
            }
            let hash = &script[2..22];
            encode_bech32("bc", 0, hash)
        }
        "p2wsh" => {
            // script: 0020{32-byte-hash}
            if script.len() < 34 {
                return None;
            }
            let hash = &script[2..34];
            encode_bech32("bc", 0, hash)
        }
        "p2tr" => {
            // script: 5120{32-byte-key}
            if script.len() < 34 {
                return None;
            }
            let key = &script[2..34];
            encode_bech32m("bc", 1, key)
        }
        _ => None,
    }
}

/// Derive the address for an input based on its prevout scriptPubKey
pub fn derive_input_address(prevout_script: &[u8]) -> Option<String> {
    let script_type = super::script::classify_output_script(prevout_script);
    derive_address(prevout_script, script_type)
}

/// Base58Check encoding with a version byte
fn base58check_encode(version: u8, payload: &[u8]) -> String {
    let mut data = Vec::with_capacity(1 + payload.len());
    data.push(version);
    data.extend_from_slice(payload);
    bs58::encode(&data).with_check().into_string()
}

/// Bech32 encoding (witness v0)
fn encode_bech32(hrp: &str, witness_version: u8, data: &[u8]) -> Option<String> {
    use bech32::{Bech32, Hrp};

    let hrp = Hrp::parse(hrp).ok()?;

    // Build 5-bit data: witness version byte + converted program data
    let mut five_bit: Vec<u8> = Vec::new();
    five_bit.push(witness_version); // witness version is already 0-16

    let converted = convert_bits(data, 8, 5, true)?;
    five_bit.extend_from_slice(&converted);

    let encoded = bech32::encode::<Bech32>(hrp, &five_bit).ok()?;
    Some(encoded)
}

/// Bech32m encoding (witness v1+)
fn encode_bech32m(hrp: &str, witness_version: u8, data: &[u8]) -> Option<String> {
    use bech32::{Bech32m, Hrp};

    let hrp = Hrp::parse(hrp).ok()?;

    let mut five_bit: Vec<u8> = Vec::new();
    five_bit.push(witness_version);

    let converted = convert_bits(data, 8, 5, true)?;
    five_bit.extend_from_slice(&converted);

    let encoded = bech32::encode::<Bech32m>(hrp, &five_bit).ok()?;
    Some(encoded)
}

/// Convert between bit groups (e.g., 8-bit to 5-bit)
fn convert_bits(data: &[u8], from_bits: u32, to_bits: u32, pad: bool) -> Option<Vec<u8>> {
    let mut acc: u32 = 0;
    let mut bits: u32 = 0;
    let mut result = Vec::new();
    let max_v = (1u32 << to_bits) - 1;

    for &value in data {
        let v = value as u32;
        if v >> from_bits != 0 {
            return None;
        }
        acc = (acc << from_bits) | v;
        bits += from_bits;
        while bits >= to_bits {
            bits -= to_bits;
            result.push(((acc >> bits) & max_v) as u8);
        }
    }

    if pad {
        if bits > 0 {
            result.push(((acc << (to_bits - bits)) & max_v) as u8);
        }
    } else if bits >= from_bits || ((acc << (to_bits - bits)) & max_v) != 0 {
        return None;
    }

    Some(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_derive_p2pkh_address() {
        // P2PKH: 76a914{20}88ac -> address starts with "1"
        let mut script = vec![0x76, 0xa9, 0x14];
        script.extend_from_slice(&[0x89; 20]);
        script.push(0x88);
        script.push(0xac);
        let addr = derive_address(&script, "p2pkh");
        assert!(addr.is_some());
        assert!(addr.unwrap().starts_with("1"));
    }

    #[test]
    fn test_derive_p2sh_address() {
        // P2SH: a914{20}87 -> address starts with "3"
        let mut script = vec![0xa9, 0x14];
        script.extend_from_slice(&[0xAB; 20]);
        script.push(0x87);
        let addr = derive_address(&script, "p2sh");
        assert!(addr.is_some());
        assert!(addr.unwrap().starts_with("3"));
    }

    #[test]
    fn test_derive_p2wpkh_address() {
        // P2WPKH: 0014{20} -> bc1q...
        let mut script = vec![0x00, 0x14];
        script.extend_from_slice(&[0xCC; 20]);
        let addr = derive_address(&script, "p2wpkh");
        assert!(addr.is_some());
        assert!(addr.unwrap().starts_with("bc1q"));
    }

    #[test]
    fn test_derive_p2wsh_address() {
        // P2WSH: 0020{32} -> bc1q...
        let mut script = vec![0x00, 0x20];
        script.extend_from_slice(&[0xDD; 32]);
        let addr = derive_address(&script, "p2wsh");
        assert!(addr.is_some());
        assert!(addr.unwrap().starts_with("bc1q"));
    }

    #[test]
    fn test_derive_p2tr_address() {
        // P2TR: 5120{32} -> bech32m address for witness v1
        let mut script = vec![0x51, 0x20];
        script.extend_from_slice(&[0xEE; 32]);
        let addr = derive_address(&script, "p2tr");
        assert!(addr.is_some(), "P2TR should produce a valid address");
        let addr_str = addr.unwrap();
        // Bech32m address starts with the "bc1" HRP separator
        assert!(
            addr_str.to_lowercase().starts_with("bc1"),
            "Expected bc1 prefix, got: {}",
            addr_str
        );
        // P2TR addresses are longer than P2WPKH (32-byte program vs 20-byte)
        assert!(
            addr_str.len() > 40,
            "P2TR address should be long, got len={}",
            addr_str.len()
        );
    }

    #[test]
    fn test_derive_unknown_returns_none() {
        let script = vec![0x01, 0x02, 0x03];
        let addr = derive_address(&script, "unknown");
        assert!(addr.is_none());
    }

    #[test]
    fn test_derive_op_return_returns_none() {
        let script = vec![0x6a, 0x04, 0x01, 0x02, 0x03, 0x04];
        let addr = derive_address(&script, "op_return");
        assert!(addr.is_none());
    }

    #[test]
    fn test_derive_input_address_delegates() {
        // derive_input_address should classify then derive
        let mut script = vec![0x00, 0x14];
        script.extend_from_slice(&[0xCC; 20]);
        let addr = derive_input_address(&script);
        assert!(addr.is_some());
        assert!(addr.unwrap().starts_with("bc1q"));
    }

    #[test]
    fn test_p2pkh_address_deterministic() {
        // Same script -> same address every time
        let mut script = vec![0x76, 0xa9, 0x14];
        script.extend_from_slice(&[0x00; 20]);
        script.push(0x88);
        script.push(0xac);
        let a1 = derive_address(&script, "p2pkh").unwrap();
        let a2 = derive_address(&script, "p2pkh").unwrap();
        assert_eq!(a1, a2);
    }
}
