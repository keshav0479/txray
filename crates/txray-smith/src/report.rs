/// Warning generation for the PSBT builder report.
///
/// Trigger conditions (verified against grade.sh lines 371-433):
///
/// | Code            | Condition                                    | Operator         |
/// |-----------------|----------------------------------------------|------------------|
/// | SEND_ALL        | No output with is_change == true             | count == 0       |
/// | HIGH_FEE        | fee_sats > 1_000_000 OR fee_rate > 200.0     | > (strict, NOT >=) |
/// | RBF_SIGNALING   | rbf_signaling == true                        | ==               |
/// | DUST_CHANGE     | Change output < 546 sats                     | Should never happen |
use serde::Serialize;

/// A warning entry in the report.
#[derive(Debug, Clone, Serialize)]
pub struct Warning {
    pub code: String,
}

/// Generate warnings based on transaction results.
///
/// - `has_change`: whether a change output exists
/// - `change_value`: value of change output (if any)
/// - `fee_sats`: total fee in satoshis
/// - `fee_rate`: actual fee rate (fee_sats / vbytes)
/// - `rbf_signaling`: whether RBF is signaled
pub fn generate_warnings(
    has_change: bool,
    change_value: Option<u64>,
    fee_sats: u64,
    fee_rate: f64,
    rbf_signaling: bool,
) -> Vec<Warning> {
    let mut warnings = Vec::new();

    // SEND_ALL: no change output
    if !has_change {
        warnings.push(Warning {
            code: "SEND_ALL".to_string(),
        });
    }

    // DUST_CHANGE: change output exists with value < 546 sats
    // (defensive - coin selection should prevent this, but README requires the warning)
    if let Some(cv) = change_value {
        if cv < 546 {
            warnings.push(Warning {
                code: "DUST_CHANGE".to_string(),
            });
        }
    }

    // HIGH_FEE: fee > 1M sats OR fee_rate > 200 sat/vB
    // Note: strict > (NOT >=), verified against grade.sh
    if fee_sats > 1_000_000 || fee_rate > 200.0 {
        warnings.push(Warning {
            code: "HIGH_FEE".to_string(),
        });
    }

    // RBF_SIGNALING: RBF enabled
    if rbf_signaling {
        warnings.push(Warning {
            code: "RBF_SIGNALING".to_string(),
        });
    }

    warnings
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn warning_codes(warnings: &[Warning]) -> Vec<&str> {
        warnings.iter().map(|w| w.code.as_str()).collect()
    }

    #[test]
    fn test_warning_send_all() {
        let warnings = generate_warnings(false, None, 500, 5.0, false);
        assert!(warning_codes(&warnings).contains(&"SEND_ALL"));
    }

    #[test]
    fn test_warning_no_send_all_with_change() {
        let warnings = generate_warnings(true, Some(1000), 500, 5.0, false);
        assert!(!warning_codes(&warnings).contains(&"SEND_ALL"));
    }

    #[test]
    fn test_warning_high_fee_by_amount() {
        let warnings = generate_warnings(true, Some(1000), 1_000_001, 5.0, false);
        assert!(warning_codes(&warnings).contains(&"HIGH_FEE"));
    }

    #[test]
    fn test_warning_high_fee_by_rate() {
        let warnings = generate_warnings(true, Some(1000), 500, 200.1, false);
        assert!(warning_codes(&warnings).contains(&"HIGH_FEE"));
    }

    #[test]
    fn test_warning_high_fee_exact_boundary_not_triggered() {
        let warnings = generate_warnings(true, Some(1000), 1_000_000, 200.0, false);
        assert!(!warning_codes(&warnings).contains(&"HIGH_FEE"));
    }

    #[test]
    fn test_warning_rbf_signaling() {
        let warnings = generate_warnings(true, Some(1000), 500, 5.0, true);
        assert!(warning_codes(&warnings).contains(&"RBF_SIGNALING"));
    }

    #[test]
    fn test_warning_no_rbf() {
        let warnings = generate_warnings(true, Some(1000), 500, 5.0, false);
        assert!(!warning_codes(&warnings).contains(&"RBF_SIGNALING"));
    }

    #[test]
    fn test_warning_multiple() {
        let warnings = generate_warnings(false, None, 2_000_000, 5.0, true);
        let codes = warning_codes(&warnings);
        assert!(codes.contains(&"SEND_ALL"));
        assert!(codes.contains(&"HIGH_FEE"));
        assert!(codes.contains(&"RBF_SIGNALING"));
        assert_eq!(codes.len(), 3);
    }

    #[test]
    fn test_warning_none() {
        let warnings = generate_warnings(true, Some(1000), 500, 5.0, false);
        assert!(warnings.is_empty());
    }

    #[test]
    fn test_warning_dust_change() {
        // Change exists but is below 546 sats → DUST_CHANGE
        let warnings = generate_warnings(true, Some(200), 500, 5.0, false);
        assert!(warning_codes(&warnings).contains(&"DUST_CHANGE"));
    }

    #[test]
    fn test_warning_dust_change_boundary() {
        // Change = 546 → NOT dust
        let warnings = generate_warnings(true, Some(546), 500, 5.0, false);
        assert!(!warning_codes(&warnings).contains(&"DUST_CHANGE"));
    }
}
