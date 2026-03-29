use crate::tx::hash::dsha256;

/// Compute merkle root from a list of txids (as raw 32-byte hashes, NOT reversed).
/// Uses standard Bitcoin double-SHA256 pairwise hashing.
pub fn compute_merkle_root(txids: &[[u8; 32]]) -> [u8; 32] {
    if txids.is_empty() {
        return [0u8; 32];
    }
    if txids.len() == 1 {
        return txids[0];
    }

    let mut current_level: Vec<[u8; 32]> = txids.to_vec();

    while current_level.len() > 1 {
        let mut next_level = Vec::new();

        // If odd number, duplicate the last element
        if !current_level.len().is_multiple_of(2) {
            let last = *current_level.last().unwrap();
            current_level.push(last);
        }

        for pair in current_level.chunks(2) {
            let mut combined = Vec::with_capacity(64);
            combined.extend_from_slice(&pair[0]);
            combined.extend_from_slice(&pair[1]);
            next_level.push(dsha256(&combined));
        }

        current_level = next_level;
    }

    current_level[0]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_merkle_single_tx() {
        let txid = [0xABu8; 32];
        let root = compute_merkle_root(&[txid]);
        // Single tx → root IS the txid itself
        assert_eq!(root, txid);
    }

    #[test]
    fn test_merkle_empty() {
        let root = compute_merkle_root(&[]);
        assert_eq!(root, [0u8; 32]);
    }

    #[test]
    fn test_merkle_two_txs() {
        let tx1 = [0x01u8; 32];
        let tx2 = [0x02u8; 32];
        let root = compute_merkle_root(&[tx1, tx2]);

        // Manual: dsha256(tx1 || tx2)
        let mut combined = Vec::new();
        combined.extend_from_slice(&tx1);
        combined.extend_from_slice(&tx2);
        let expected = dsha256(&combined);
        assert_eq!(root, expected);
    }

    #[test]
    fn test_merkle_three_txs_odd_duplicates_last() {
        let tx1 = [0x01u8; 32];
        let tx2 = [0x02u8; 32];
        let tx3 = [0x03u8; 32];
        let root = compute_merkle_root(&[tx1, tx2, tx3]);

        // Level 1: hash(tx1||tx2), hash(tx3||tx3)
        let mut c12 = Vec::new();
        c12.extend_from_slice(&tx1);
        c12.extend_from_slice(&tx2);
        let h12 = dsha256(&c12);

        let mut c33 = Vec::new();
        c33.extend_from_slice(&tx3);
        c33.extend_from_slice(&tx3); // duplicated
        let h33 = dsha256(&c33);

        // Level 2: hash(h12||h33)
        let mut final_c = Vec::new();
        final_c.extend_from_slice(&h12);
        final_c.extend_from_slice(&h33);
        let expected = dsha256(&final_c);

        assert_eq!(root, expected);
    }

    #[test]
    fn test_merkle_deterministic() {
        let tx1 = [0x11u8; 32];
        let tx2 = [0x22u8; 32];
        // Same inputs should always produce same root
        let r1 = compute_merkle_root(&[tx1, tx2]);
        let r2 = compute_merkle_root(&[tx1, tx2]);
        assert_eq!(r1, r2);
    }
}
