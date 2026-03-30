use serde_json::Value;

/// A warning with a code and human-readable message
#[derive(Debug, Clone)]
pub struct Warning {
    pub code: &'static str,
    pub message: &'static str,
}

/// Generate warnings for a analyzed transaction.
pub fn generate_warnings(
    fee_sats: u64,
    fee_rate_sat_vb: f64,
    rbf_signaling: bool,
    outputs: &[OutputInfo],
) -> Vec<Warning> {
    let mut warnings = Vec::new();

    // HIGH_FEE: fee > 1,000,000 sats OR fee_rate > 200 sat/vB
    if fee_sats > 1_000_000 || fee_rate_sat_vb > 200.0 {
        warnings.push(Warning {
            code: "HIGH_FEE",
            message: "Unusually high fee detected",
        });
    }

    // DUST_OUTPUT: any non-op_return output with value < 546 sats
    for output in outputs {
        if output.script_type != "op_return" && output.value_sats < 546 {
            warnings.push(Warning {
                code: "DUST_OUTPUT",
                message: "Output below dust threshold (546 sats)",
            });
            break; // Only emit once
        }
    }

    // UNKNOWN_OUTPUT_SCRIPT: any output with script_type == "unknown"
    for output in outputs {
        if output.script_type == "unknown" {
            warnings.push(Warning {
                code: "UNKNOWN_OUTPUT_SCRIPT",
                message: "Output has unrecognized script type",
            });
            break;
        }
    }

    // RBF_SIGNALING
    if rbf_signaling {
        warnings.push(Warning {
            code: "RBF_SIGNALING",
            message: "Transaction signals Replace-By-Fee (can be bumped)",
        });
    }

    warnings
}

/// Minimal info about an output needed for warning generation
#[derive(Debug)]
pub struct OutputInfo {
    pub script_type: String,
    pub value_sats: u64,
}

impl Warning {
    pub fn to_json(&self) -> Value {
        serde_json::json!({ "code": self.code, "message": self.message })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_output(script_type: &str, value: u64) -> OutputInfo {
        OutputInfo {
            script_type: script_type.to_string(),
            value_sats: value,
        }
    }

    fn codes(warnings: &[Warning]) -> Vec<&str> {
        warnings.iter().map(|w| w.code).collect()
    }

    #[test]
    fn test_no_warnings() {
        let outputs = vec![make_output("p2wpkh", 10_000)];
        let w = generate_warnings(1000, 10.0, false, &outputs);
        assert!(w.is_empty());
    }

    #[test]
    fn test_high_fee_by_amount() {
        let outputs = vec![make_output("p2wpkh", 10_000)];
        let w = generate_warnings(1_000_001, 10.0, false, &outputs);
        assert!(codes(&w).contains(&"HIGH_FEE"));
    }

    #[test]
    fn test_high_fee_by_rate() {
        let outputs = vec![make_output("p2wpkh", 10_000)];
        let w = generate_warnings(1000, 200.01, false, &outputs);
        assert!(codes(&w).contains(&"HIGH_FEE"));
    }

    #[test]
    fn test_high_fee_boundary_not_triggered() {
        let outputs = vec![make_output("p2wpkh", 10_000)];
        let w = generate_warnings(1_000_000, 200.0, false, &outputs);
        // 1_000_000 is NOT > 1_000_000, and 200.0 is NOT > 200
        assert!(!codes(&w).contains(&"HIGH_FEE"));
    }

    #[test]
    fn test_dust_output() {
        let outputs = vec![make_output("p2wpkh", 545)]; // < 546
        let w = generate_warnings(100, 1.0, false, &outputs);
        assert!(codes(&w).contains(&"DUST_OUTPUT"));
    }

    #[test]
    fn test_dust_output_op_return_excluded() {
        // op_return with 0 sats should NOT trigger dust
        let outputs = vec![make_output("op_return", 0)];
        let w = generate_warnings(100, 1.0, false, &outputs);
        assert!(!codes(&w).contains(&"DUST_OUTPUT"));
    }

    #[test]
    fn test_dust_only_emitted_once() {
        let outputs = vec![make_output("p2wpkh", 100), make_output("p2wpkh", 200)];
        let w = generate_warnings(100, 1.0, false, &outputs);
        let dust_count = w.iter().filter(|w| w.code == "DUST_OUTPUT").count();
        assert_eq!(dust_count, 1);
    }

    #[test]
    fn test_unknown_output_script() {
        let outputs = vec![make_output("unknown", 10_000)];
        let w = generate_warnings(100, 1.0, false, &outputs);
        assert!(codes(&w).contains(&"UNKNOWN_OUTPUT_SCRIPT"));
    }

    #[test]
    fn test_rbf_signaling_warning() {
        let outputs = vec![make_output("p2wpkh", 10_000)];
        let w = generate_warnings(100, 1.0, true, &outputs);
        assert!(codes(&w).contains(&"RBF_SIGNALING"));
    }

    #[test]
    fn test_all_warnings_together() {
        let outputs = vec![
            make_output("unknown", 100), // dust + unknown
        ];
        let w = generate_warnings(2_000_000, 300.0, true, &outputs);
        let c = codes(&w);
        assert!(c.contains(&"HIGH_FEE"));
        assert!(c.contains(&"DUST_OUTPUT"));
        assert!(c.contains(&"UNKNOWN_OUTPUT_SCRIPT"));
        assert!(c.contains(&"RBF_SIGNALING"));
    }
}
