/// RBF / Locktime resolution.
///
/// Implements the 5-row interaction matrix from README lines 193-199:
///
/// | rbf          | locktime present | current_height | nSequence  | nLockTime      |
/// |--------------|------------------|----------------|------------|----------------|
/// | false/absent | no               | -              | 0xFFFFFFFF | 0              |
/// | false/absent | yes              | -              | 0xFFFFFFFE | locktime value |
/// | true         | no               | yes            | 0xFFFFFFFD | current_height |
/// | true         | yes              | -              | 0xFFFFFFFD | locktime value |
/// | true         | no               | no             | 0xFFFFFFFD | 0              |
use crate::fixture::Fixture;

/// Resolved transaction parameters for RBF and locktime.
#[derive(Debug, Clone)]
pub struct TxParams {
    pub n_lock_time: u32,
    pub n_sequence: u32,
    pub rbf_signaling: bool,
    pub locktime_type: String,
}

/// Resolve nSequence and nLockTime from fixture fields.
///
/// Logic:
/// 1. Determine nLockTime:
///    - If fixture has `locktime`, use it.
///    - Else if `rbf == true` and `current_height` exists, use current_height (anti-fee-sniping).
///    - Else 0.
/// 2. Determine nSequence:
///    - If `rbf == true` → 0xFFFFFFFD (enables RBF).
///    - Else if nLockTime != 0 → 0xFFFFFFFE (enables locktime without RBF).
///    - Else → 0xFFFFFFFF (final, no RBF, no locktime).
/// 3. Derive report fields:
///    - `rbf_signaling`: true if nSequence <= 0xFFFFFFFD.
///    - `locktime_type`: "none" if 0, "block_height" if < 500_000_000, "unix_timestamp" otherwise.
pub fn resolve_rbf_locktime(fixture: &Fixture) -> TxParams {
    let rbf = fixture.rbf.unwrap_or(false);

    // Step 1: resolve nLockTime
    let n_lock_time = if let Some(lt) = fixture.locktime {
        lt
    } else {
        fixture.current_height.filter(|_| rbf).unwrap_or_default()
    };

    // Step 2: resolve nSequence
    let n_sequence: u32 = if rbf {
        0xFFFF_FFFD // enables RBF
    } else if n_lock_time != 0 {
        0xFFFF_FFFE // enables locktime without RBF
    } else {
        0xFFFF_FFFF // final
    };

    // Step 3: derive report fields
    let rbf_signaling = n_sequence <= 0xFFFF_FFFD;

    let locktime_type = if n_lock_time == 0 {
        "none".to_string()
    } else if n_lock_time < 500_000_000 {
        "block_height".to_string()
    } else {
        "unix_timestamp".to_string()
    };

    TxParams {
        n_lock_time,
        n_sequence,
        rbf_signaling,
        locktime_type,
    }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixture::{ChangeTemplate, Fixture, Payment, Utxo};

    /// Helper: create a fixture with specific RBF/locktime fields.
    fn make_fixture(
        rbf: Option<bool>,
        locktime: Option<u32>,
        current_height: Option<u32>,
    ) -> Fixture {
        Fixture {
            network: "mainnet".to_string(),
            utxos: vec![Utxo {
                txid: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
                    .to_string(),
                vout: 0,
                value_sats: 100_000,
                script_pubkey_hex: "0014aabbccddee0011223344556677889900aabbccdd".to_string(),
                script_type: "p2wpkh".to_string(),
                address: None,
            }],
            payments: vec![Payment {
                value_sats: 50_000,
                script_pubkey_hex: "0014aabbccddee0011223344556677889900aabbccdd".to_string(),
                script_type: None,
                address: None,
            }],
            change: ChangeTemplate {
                script_pubkey_hex: "0014aabbccddee0011223344556677889900aabbccdd".to_string(),
                script_type: "p2wpkh".to_string(),
                address: None,
            },
            fee_rate_sat_vb: 5.0,
            rbf,
            locktime,
            current_height,
            policy: None,
        }
    }

    // ── Row 1: rbf=false/absent, no locktime ──

    #[test]
    fn test_rbf_false_no_locktime() {
        let fixture = make_fixture(None, None, None);
        let params = resolve_rbf_locktime(&fixture);
        assert_eq!(params.n_sequence, 0xFFFF_FFFF);
        assert_eq!(params.n_lock_time, 0);
        assert!(!params.rbf_signaling);
        assert_eq!(params.locktime_type, "none");
    }

    #[test]
    fn test_rbf_explicit_false_no_locktime() {
        let fixture = make_fixture(Some(false), None, None);
        let params = resolve_rbf_locktime(&fixture);
        assert_eq!(params.n_sequence, 0xFFFF_FFFF);
        assert_eq!(params.n_lock_time, 0);
        assert!(!params.rbf_signaling);
    }

    // ── Row 2: rbf=false/absent, locktime present ──

    #[test]
    fn test_rbf_false_with_locktime_block() {
        let fixture = make_fixture(None, Some(800_000), None);
        let params = resolve_rbf_locktime(&fixture);
        assert_eq!(params.n_sequence, 0xFFFF_FFFE);
        assert_eq!(params.n_lock_time, 800_000);
        assert!(!params.rbf_signaling);
        assert_eq!(params.locktime_type, "block_height");
    }

    #[test]
    fn test_rbf_false_with_locktime_timestamp() {
        let fixture = make_fixture(None, Some(1_700_000_000), None);
        let params = resolve_rbf_locktime(&fixture);
        assert_eq!(params.n_sequence, 0xFFFF_FFFE);
        assert_eq!(params.n_lock_time, 1_700_000_000);
        assert!(!params.rbf_signaling);
        assert_eq!(params.locktime_type, "unix_timestamp");
    }

    // ── Row 3: rbf=true, no locktime, current_height present ──

    #[test]
    fn test_rbf_true_anti_fee_sniping() {
        let fixture = make_fixture(Some(true), None, Some(850_000));
        let params = resolve_rbf_locktime(&fixture);
        assert_eq!(params.n_sequence, 0xFFFF_FFFD);
        assert_eq!(params.n_lock_time, 850_000);
        assert!(params.rbf_signaling);
        assert_eq!(params.locktime_type, "block_height");
    }

    // ── Row 4: rbf=true, locktime present ──

    #[test]
    fn test_rbf_true_with_locktime() {
        let fixture = make_fixture(Some(true), Some(900_000), None);
        let params = resolve_rbf_locktime(&fixture);
        assert_eq!(params.n_sequence, 0xFFFF_FFFD);
        assert_eq!(params.n_lock_time, 900_000);
        assert!(params.rbf_signaling);
        assert_eq!(params.locktime_type, "block_height");
    }

    #[test]
    fn test_rbf_true_locktime_overrides_current_height() {
        // When both locktime and current_height are present, locktime wins
        let fixture = make_fixture(Some(true), Some(900_000), Some(850_000));
        let params = resolve_rbf_locktime(&fixture);
        assert_eq!(params.n_lock_time, 900_000); // locktime, not current_height
    }

    // ── Row 5: rbf=true, no locktime, no current_height ──

    #[test]
    fn test_rbf_true_no_locktime_no_height() {
        let fixture = make_fixture(Some(true), None, None);
        let params = resolve_rbf_locktime(&fixture);
        assert_eq!(params.n_sequence, 0xFFFF_FFFD);
        assert_eq!(params.n_lock_time, 0);
        assert!(params.rbf_signaling);
        assert_eq!(params.locktime_type, "none");
    }

    // ── Locktime boundary ──

    #[test]
    fn test_locktime_boundary_499999999() {
        let fixture = make_fixture(None, Some(499_999_999), None);
        let params = resolve_rbf_locktime(&fixture);
        assert_eq!(params.locktime_type, "block_height");
    }

    #[test]
    fn test_locktime_boundary_500000000() {
        let fixture = make_fixture(None, Some(500_000_000), None);
        let params = resolve_rbf_locktime(&fixture);
        assert_eq!(params.locktime_type, "unix_timestamp");
    }
}
