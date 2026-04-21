use super::parser::RawTransaction;

/// Compute weight, vbytes, and segwit savings for a parsed transaction.
///
/// weight = base_size * 3 + total_size  (BIP141)
/// vbytes = ceil(weight / 4)
pub fn compute_weight_info(tx: &RawTransaction) -> WeightInfo {
    let total_size = tx.raw_bytes.len() as u64;
    let base_size = tx.base_bytes.len() as u64;

    let weight = base_size * 3 + total_size;
    let vbytes = weight.div_ceil(4); // ceil(weight / 4)

    let segwit_savings = if tx.is_segwit {
        let witness_bytes = total_size - base_size;
        let non_witness_bytes = base_size;
        let weight_if_legacy = total_size * 4;
        let savings_pct = if weight_if_legacy > 0 {
            let raw = (1.0 - (weight as f64 / weight_if_legacy as f64)) * 100.0;
            (raw * 100.0).round() / 100.0 // round to 2 decimals
        } else {
            0.0
        };

        Some(SegwitSavings {
            witness_bytes,
            non_witness_bytes,
            total_bytes: total_size,
            weight_actual: weight,
            weight_if_legacy,
            savings_pct,
        })
    } else {
        None
    };

    WeightInfo {
        size_bytes: total_size,
        weight,
        vbytes,
        segwit_savings,
    }
}

/// Transaction weight metrics computed per BIP141.
#[derive(Debug, Clone)]
pub struct WeightInfo {
    pub size_bytes: u64,
    pub weight: u64,
    pub vbytes: u64,
    pub segwit_savings: Option<SegwitSavings>,
}

/// SegWit discount savings analysis comparing actual vs hypothetical legacy weight.
#[derive(Debug, Clone)]
pub struct SegwitSavings {
    pub witness_bytes: u64,
    pub non_witness_bytes: u64,
    pub total_bytes: u64,
    pub weight_actual: u64,
    pub weight_if_legacy: u64,
    pub savings_pct: f64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tx::parser::RawTransaction;

    /// Build a minimal RawTransaction for testing weight calculations
    fn make_tx(is_segwit: bool, raw_size: usize, base_size: usize) -> RawTransaction {
        RawTransaction {
            version: 2,
            is_segwit,
            inputs: vec![],
            outputs: vec![],
            locktime: 0,
            raw_bytes: vec![0u8; raw_size],
            base_bytes: vec![0u8; base_size],
        }
    }

    #[test]
    fn test_legacy_tx_weight() {
        // Legacy: raw = base = 200 bytes
        let tx = make_tx(false, 200, 200);
        let info = compute_weight_info(&tx);

        assert_eq!(info.size_bytes, 200);
        // weight = 200*3 + 200 = 800 (but since raw == base, it's 200*4)
        assert_eq!(info.weight, 800);
        assert_eq!(info.vbytes, 200); // 800/4 = 200
        assert!(info.segwit_savings.is_none());
    }

    #[test]
    fn test_segwit_tx_weight() {
        // SegWit: raw = 222 (with witness), base = 115 (without)
        let tx = make_tx(true, 222, 115);
        let info = compute_weight_info(&tx);

        assert_eq!(info.size_bytes, 222);
        // weight = 115*3 + 222 = 345 + 222 = 567
        assert_eq!(info.weight, 567);
        // vbytes = ceil(567/4) = 142
        assert_eq!(info.vbytes, 142);

        let ss = info.segwit_savings.unwrap();
        assert_eq!(ss.witness_bytes, 222 - 115); // 107
        assert_eq!(ss.non_witness_bytes, 115);
        assert_eq!(ss.total_bytes, 222);
        assert_eq!(ss.weight_actual, 567);
        assert_eq!(ss.weight_if_legacy, 222 * 4); // 888
                                                  // savings = (1 - 567/888) * 100 = 36.15% (approximately)
        assert!(ss.savings_pct > 36.0 && ss.savings_pct < 37.0);
    }

    #[test]
    fn test_vbytes_ceiling() {
        // weight = 5 -> vbytes = ceil(5/4) = 2
        let tx = make_tx(false, 1, 1);
        let info = compute_weight_info(&tx);
        // weight = 1*3 + 1 = 4, vbytes = 1
        assert_eq!(info.weight, 4);
        assert_eq!(info.vbytes, 1);
    }

    #[test]
    fn test_segwit_savings_pct_rounded() {
        // Verify savings_pct is rounded to 2 decimal places
        let tx = make_tx(true, 300, 150);
        let info = compute_weight_info(&tx);
        let ss = info.segwit_savings.unwrap();
        // Check that savings_pct has at most 2 decimal places
        let rounded = (ss.savings_pct * 100.0).round() / 100.0;
        assert_eq!(ss.savings_pct, rounded);
    }
}
