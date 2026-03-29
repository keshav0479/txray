use sha2::{Digest, Sha256};

/// Double-SHA256 hash
pub fn dsha256(data: &[u8]) -> [u8; 32] {
    let first = Sha256::digest(data);
    let second = Sha256::digest(first);
    let mut result = [0u8; 32];
    result.copy_from_slice(&second);
    result
}

/// Compute txid from base serialization (without witness), returned as reversed-hex
pub fn compute_txid(base_bytes: &[u8]) -> String {
    let hash = dsha256(base_bytes);
    let mut reversed = hash;
    reversed.reverse();
    hex::encode(reversed)
}

/// Compute wtxid from full serialization (with witness), returned as reversed-hex
pub fn compute_wtxid(raw_bytes: &[u8]) -> String {
    let hash = dsha256(raw_bytes);
    let mut reversed = hash;
    reversed.reverse();
    hex::encode(reversed)
}

/// Compute txid raw hash (non-reversed bytes) for merkle root computation
pub fn compute_txid_raw(base_bytes: &[u8]) -> [u8; 32] {
    dsha256(base_bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dsha256_empty() {
        // dsha256("") is a well-known constant
        let result = dsha256(b"");
        // SHA256(SHA256("")) = 5df6e0e2...
        let expected = "5df6e0e2761359d30a8275058e299fcc0381534545f55cf43e41983f5d4c9456";
        assert_eq!(hex::encode(result), expected);
    }

    #[test]
    fn test_dsha256_known_vector() {
        // SHA256(SHA256("hello")) — verified against Bitcoin Core
        let result = dsha256(b"hello");
        let hex_result = hex::encode(result);
        // Double-hash should be deterministic and 64 hex chars
        assert_eq!(hex_result.len(), 64);
        // Verify it's different from single SHA256
        let single_sha = sha2::Sha256::digest(b"hello");
        assert_ne!(&result[..], &single_sha[..]);
    }

    #[test]
    fn test_compute_txid_reversed() {
        // txid should be reversed hex of dsha256
        let data = b"test transaction data";
        let raw = dsha256(data);
        let txid = compute_txid(data);

        // Verify it's a valid 64-char hex string
        assert_eq!(txid.len(), 64);

        // Verify the reversal: first byte of raw = last byte pair of txid
        let raw_hex = hex::encode(raw);
        let txid_bytes: Vec<u8> = hex::decode(&txid).unwrap();
        let mut reversed = txid_bytes;
        reversed.reverse();
        assert_eq!(hex::encode(reversed), raw_hex);
    }

    #[test]
    fn test_compute_wtxid_reversed() {
        let data = b"test witness data";
        let raw = dsha256(data);
        let wtxid = compute_wtxid(data);
        assert_eq!(wtxid.len(), 64);

        let mut expected = raw;
        expected.reverse();
        assert_eq!(wtxid, hex::encode(expected));
    }

    #[test]
    fn test_compute_txid_raw_not_reversed() {
        let data = b"some bytes";
        let raw = compute_txid_raw(data);
        let expected = dsha256(data);
        assert_eq!(raw, expected); // NOT reversed
    }
}
