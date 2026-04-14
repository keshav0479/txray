/// XOR-decode data using an 8-byte cyclic key.
/// If the key is all zeros, no transformation is needed.
pub fn xor_decode(data: &mut [u8], key: &[u8]) {
    if key.is_empty() || key.iter().all(|&b| b == 0) {
        return; // no-op for all-zeros key
    }
    let key_len = key.len();
    for (i, byte) in data.iter_mut().enumerate() {
        *byte ^= key[i % key_len];
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_xor_zero_key_noop() {
        let original = vec![0x01, 0x02, 0x03, 0x04];
        let mut data = original.clone();
        xor_decode(&mut data, &[0x00, 0x00, 0x00, 0x00]);
        assert_eq!(data, original);
    }

    #[test]
    fn test_xor_empty_key_noop() {
        let original = vec![0x01, 0x02, 0x03, 0x04];
        let mut data = original.clone();
        xor_decode(&mut data, &[]);
        assert_eq!(data, original);
    }

    #[test]
    fn test_xor_decode_basic() {
        let mut data = vec![0x01 ^ 0xAB, 0x02 ^ 0xCD]; // pre-XOR'd
        xor_decode(&mut data, &[0xAB, 0xCD]);
        assert_eq!(data, vec![0x01, 0x02]);
    }

    #[test]
    fn test_xor_round_trip() {
        let original = vec![0xDE, 0xAD, 0xBE, 0xEF, 0x01, 0x02, 0x03];
        let key = vec![0x12, 0x34, 0x56];
        let mut data = original.clone();
        // Encode
        xor_decode(&mut data, &key);
        assert_ne!(data, original);
        // Decode (XOR is its own inverse)
        xor_decode(&mut data, &key);
        assert_eq!(data, original);
    }

    #[test]
    fn test_xor_cyclic_key() {
        // Key shorter than data - cycles
        let key = vec![0xFF];
        let mut data = vec![0x00, 0x55, 0xAA];
        xor_decode(&mut data, &key);
        assert_eq!(data, vec![0xFF, 0xAA, 0x55]);
    }
}
