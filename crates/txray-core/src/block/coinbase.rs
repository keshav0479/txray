use crate::error::TxrayError;

/// Identify coinbase transaction and decode BIP34 height.
/// Coinbase tx is first in block, must have exactly one input
/// with txid=0x00..00 and vout=0xFFFFFFFF.
pub fn decode_bip34_height(coinbase_script_sig: &[u8]) -> Result<u64, TxrayError> {
    // BIP34: first byte of scriptSig is the push length for the height bytes
    if coinbase_script_sig.is_empty() {
        return Err(TxrayError::coinbase_invalid("Empty coinbase scriptSig"));
    }

    let push_len = coinbase_script_sig[0] as usize;

    // BIP34 height is encoded as a minimal CScript push
    // push_len 1-4 means the next push_len bytes encode the height in LE
    if push_len == 0 || push_len > 4 {
        // Could be pre-BIP34 or unusual encoding
        // For push_len 0, height is 0
        if push_len == 0 {
            return Ok(0);
        }
        return Err(TxrayError::coinbase_invalid(format!(
            "Invalid BIP34 push length: {}",
            push_len
        )));
    }

    if coinbase_script_sig.len() < 1 + push_len {
        return Err(TxrayError::coinbase_invalid(
            "Coinbase scriptSig too short for BIP34 height",
        ));
    }

    let height_bytes = &coinbase_script_sig[1..1 + push_len];
    let mut height: u64 = 0;
    for (i, &b) in height_bytes.iter().enumerate() {
        height |= (b as u64) << (8 * i);
    }

    Ok(height)
}

/// Verify that a transaction is a valid coinbase
pub fn is_coinbase(inputs: &[(Vec<u8>, u32)]) -> bool {
    if inputs.len() != 1 {
        return false;
    }
    let (txid_raw, vout) = &inputs[0];
    // txid must be all zeros and vout must be 0xFFFFFFFF
    txid_raw.iter().all(|&b| b == 0) && *vout == 0xFFFFFFFF
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_coinbase_valid() {
        let txid = vec![0u8; 32];
        let inputs = vec![(txid, 0xFFFFFFFF)];
        assert!(is_coinbase(&inputs));
    }

    #[test]
    fn test_is_coinbase_wrong_vout() {
        let txid = vec![0u8; 32];
        let inputs = vec![(txid, 0)];
        assert!(!is_coinbase(&inputs));
    }

    #[test]
    fn test_is_coinbase_nonzero_txid() {
        let mut txid = vec![0u8; 32];
        txid[0] = 1;
        let inputs = vec![(txid, 0xFFFFFFFF)];
        assert!(!is_coinbase(&inputs));
    }

    #[test]
    fn test_is_coinbase_multiple_inputs() {
        let inputs = vec![(vec![0u8; 32], 0xFFFFFFFF), (vec![0u8; 32], 0xFFFFFFFF)];
        assert!(!is_coinbase(&inputs));
    }

    #[test]
    fn test_bip34_height_1_byte() {
        // Push 1 byte: height = 5
        let script = vec![0x01, 0x05];
        assert_eq!(decode_bip34_height(&script).unwrap(), 5);
    }

    #[test]
    fn test_bip34_height_2_bytes() {
        // Push 2 bytes: height = 0x0301 = 769 (LE)
        let script = vec![0x02, 0x01, 0x03, 0xFF]; // extra bytes after height
        assert_eq!(decode_bip34_height(&script).unwrap(), 769);
    }

    #[test]
    fn test_bip34_height_3_bytes() {
        // Push 3 bytes: height = 800000 = 0x0C3500 (LE: 00 35 0C)
        let script = vec![0x03, 0x00, 0x35, 0x0C, 0xFF, 0xFF];
        assert_eq!(decode_bip34_height(&script).unwrap(), 800_000);
    }

    #[test]
    fn test_bip34_height_4_bytes() {
        // Push 4 bytes: height = 0x01000000 = 16777216
        let script = vec![0x04, 0x00, 0x00, 0x00, 0x01];
        assert_eq!(decode_bip34_height(&script).unwrap(), 16_777_216);
    }

    #[test]
    fn test_bip34_empty_script_error() {
        assert!(decode_bip34_height(&[]).is_err());
    }

    #[test]
    fn test_bip34_invalid_push_length() {
        // Push length > 4 is invalid
        let script = vec![0x05, 0x01, 0x02, 0x03, 0x04, 0x05];
        assert!(decode_bip34_height(&script).is_err());
    }
}
