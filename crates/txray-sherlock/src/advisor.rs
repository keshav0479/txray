//! Privacy Advisor — combined privacy score and recommendation engine.
//!
//! Combines heuristic analysis, entropy, and wallet fingerprint signals
//! into a single 1–10 privacy score with actionable recommendations.

use serde::Serialize;

use crate::entropy::BoltzmannResult;
use crate::fingerprint::{Confidence, WalletFingerprint};
use crate::heuristics::TxAnalysis;

/// A privacy issue detected in the transaction.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub enum PrivacyIssue {
    /// Address reuse detected (input address appears in outputs)
    AddressReuse,
    /// Change output detected with high confidence
    ChangeDetectedHigh,
    /// Change output detected with medium confidence
    ChangeDetectedMedium,
    /// Round-number payment reveals payment/change boundary
    RoundNumberPayment,
    /// Wallet software was identified
    WalletIdentifiable,
    /// Mixed input script types reduce anonymity set
    MixedInputTypes,
    /// Low entropy (few valid interpretations)
    LowEntropy,
    /// Single input, single output — trivially linkable
    TrivialStructure,
}

/// Privacy advice result.
#[derive(Debug, Clone, Serialize)]
pub struct PrivacyAdvice {
    /// Overall privacy score (1 = worst, 10 = best)
    pub score: u8,
    /// Issues that reduce privacy
    pub issues: Vec<PrivacyIssue>,
    /// Human-readable recommendations
    pub recommendations: Vec<String>,
    /// Grade label
    pub grade: String,
}

/// Analyze a transaction's privacy from multiple analysis results.
///
/// - `heuristics`: result from `analyze_transaction()`
/// - `entropy`: optional Boltzmann entropy result
/// - `fingerprint`: optional wallet fingerprint result
pub fn advise_transaction(
    heuristics: &TxAnalysis,
    entropy: Option<&BoltzmannResult>,
    fingerprint: Option<&WalletFingerprint>,
) -> PrivacyAdvice {
    let mut score: i32 = 10;
    let mut issues = Vec::new();
    let mut recommendations = Vec::new();

    // --- Address reuse: -3 ---
    if heuristics.heuristics.get("address_reuse")
        .and_then(|v| v.get("detected"))
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
    {
        score -= 3;
        issues.push(PrivacyIssue::AddressReuse);
        recommendations.push(
            "Never reuse addresses — generate a fresh address for each transaction".to_string(),
        );
    }

    // --- Change detection: -2 (high) or -1 (medium) ---
    let change_heuristic = heuristics.heuristics.get("change_detection");
    if let Some(cd) = change_heuristic {
        if cd.get("detected").and_then(|v| v.as_bool()).unwrap_or(false) {
            let confidence = cd
                .get("confidence")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            match confidence {
                "high" => {
                    score -= 2;
                    issues.push(PrivacyIssue::ChangeDetectedHigh);
                    recommendations.push(
                        "Use the same script type for all outputs to obscure which is change"
                            .to_string(),
                    );
                }
                "medium" => {
                    score -= 1;
                    issues.push(PrivacyIssue::ChangeDetectedMedium);
                    recommendations.push(
                        "Avoid round-number payments to make change output less obvious".to_string(),
                    );
                }
                _ => {}
            }
        }
    }

    // --- Round number payment: -2 ---
    if heuristics.heuristics.get("round_number_payment")
        .and_then(|v| v.get("detected"))
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
    {
        score -= 2;
        issues.push(PrivacyIssue::RoundNumberPayment);
        recommendations.push(
            "Avoid sending exact round amounts (e.g., 0.01 BTC) — add random sats".to_string(),
        );
    }

    // --- Wallet identifiable: -1 ---
    if let Some(fp) = fingerprint {
        if fp.likely_wallet.is_some()
            && matches!(fp.confidence, Confidence::High | Confidence::Medium)
        {
            score -= 1;
            issues.push(PrivacyIssue::WalletIdentifiable);
            recommendations.push(
                "Consider using wallet software with less distinctive transaction patterns"
                    .to_string(),
            );
        }
    }

    // --- Mixed input types: -1 ---
    if let Some(fp) = fingerprint {
        if !fp.input_type_consistency {
            score -= 1;
            issues.push(PrivacyIssue::MixedInputTypes);
            recommendations.push(
                "Use inputs of the same script type to avoid revealing wallet boundaries"
                    .to_string(),
            );
        }
    }

    // --- Low entropy: -2 ---
    if let Some(ent) = entropy {
        if !ent.too_complex && ent.entropy_bits < 1.0 {
            score -= 2;
            issues.push(PrivacyIssue::LowEntropy);
            recommendations.push(
                "Transaction has few valid interpretations — consider CoinJoin for better privacy"
                    .to_string(),
            );
        }
    }

    // --- Trivial structure: -1 ---
    if heuristics.output_script_types.len() <= 1
        && !heuristics.is_coinbase
    {
        score -= 1;
        issues.push(PrivacyIssue::TrivialStructure);
        recommendations.push(
            "Single-output transactions are trivially linkable — use batching or CoinJoin"
                .to_string(),
        );
    }

    // --- Bonuses ---

    // CoinJoin detected: +2
    if heuristics.classification == "coinjoin" {
        score += 2;
    }

    // High entropy: +1
    if let Some(ent) = entropy {
        if !ent.too_complex && ent.entropy_bits >= 3.0 {
            score += 1;
        }
    }

    // Clamp to [1, 10]
    let score = score.clamp(1, 10) as u8;

    let grade = match score {
        9..=10 => "Excellent",
        7..=8 => "Good",
        5..=6 => "Fair",
        3..=4 => "Poor",
        _ => "Critical",
    }
    .to_string();

    if recommendations.is_empty() {
        recommendations.push("Transaction has good privacy characteristics".to_string());
    }

    PrivacyAdvice {
        score,
        issues,
        recommendations,
        grade,
    }
}

impl std::fmt::Display for PrivacyAdvice {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "Privacy Advice")?;
        writeln!(f, "══════════════")?;
        writeln!(f)?;
        writeln!(f, "  Score: {}/10 ({})", self.score, self.grade)?;
        writeln!(f)?;

        if !self.issues.is_empty() {
            writeln!(f, "  Issues:")?;
            for issue in &self.issues {
                writeln!(f, "    ✗ {:?}", issue)?;
            }
            writeln!(f)?;
        }

        writeln!(f, "  Recommendations:")?;
        for rec in &self.recommendations {
            writeln!(f, "    → {}", rec)?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::heuristics::TxAnalysis;
    use std::collections::BTreeMap;

    fn make_analysis(overrides: Vec<(&str, serde_json::Value)>) -> TxAnalysis {
        let mut heuristics = BTreeMap::new();
        // Default: all not detected
        for &id in crate::heuristics::ALL_HEURISTIC_IDS {
            heuristics.insert(id.to_string(), serde_json::json!({"detected": false}));
        }
        // Apply overrides
        for (key, val) in overrides {
            heuristics.insert(key.to_string(), val);
        }
        TxAnalysis {
            txid: "test".to_string(),
            heuristics,
            classification: "simple_payment".to_string(),
            is_coinbase: false,
            fee_rate: 5.0,
            output_script_types: vec!["p2wpkh".to_string(), "p2wpkh".to_string()],
        }
    }

    #[test]
    fn perfect_privacy_score_10() {
        let analysis = make_analysis(vec![]);
        let advice = advise_transaction(&analysis, None, None);
        assert_eq!(advice.score, 10);
        assert_eq!(advice.grade, "Excellent");
        assert!(advice.issues.is_empty());
    }

    #[test]
    fn address_reuse_penalty() {
        let analysis = make_analysis(vec![
            ("address_reuse", serde_json::json!({"detected": true})),
        ]);
        let advice = advise_transaction(&analysis, None, None);
        assert!(advice.score <= 7);
        assert!(advice.issues.contains(&PrivacyIssue::AddressReuse));
    }

    #[test]
    fn round_number_penalty() {
        let analysis = make_analysis(vec![
            ("round_number_payment", serde_json::json!({"detected": true})),
        ]);
        let advice = advise_transaction(&analysis, None, None);
        assert!(advice.score <= 8);
        assert!(advice.issues.contains(&PrivacyIssue::RoundNumberPayment));
    }

    #[test]
    fn coinjoin_bonus() {
        let mut analysis = make_analysis(vec![
            ("coinjoin", serde_json::json!({"detected": true})),
        ]);
        analysis.classification = "coinjoin".to_string();
        analysis.output_script_types = vec![
            "p2wpkh".to_string(),
            "p2wpkh".to_string(),
            "p2wpkh".to_string(),
        ];
        let advice = advise_transaction(&analysis, None, None);
        // CoinJoin adds +2, so should still be very high
        assert!(advice.score >= 10);
    }

    #[test]
    fn combined_issues_stack() {
        let analysis = make_analysis(vec![
            ("address_reuse", serde_json::json!({"detected": true})),
            ("round_number_payment", serde_json::json!({"detected": true})),
            ("change_detection", serde_json::json!({
                "detected": true,
                "confidence": "high",
                "likely_change_index": 1,
                "method": "script_type_match"
            })),
        ]);

        let fp = WalletFingerprint {
            bip69_compliant: false,
            low_r_signatures: Some(true),
            anti_fee_sniping: true,
            rbf_signaling: true,
            change_position: crate::fingerprint::ChangePosition::Last,
            input_type_consistency: true,
            likely_wallet: Some("Bitcoin Core (≥0.17)".to_string()),
            confidence: Confidence::High,
        };

        let advice = advise_transaction(&analysis, None, Some(&fp));
        // address_reuse(-3) + round(-2) + change_high(-2) + wallet_id(-1) = -8 → score=2
        assert!(advice.score <= 3);
        assert_eq!(advice.grade, "Critical");
        assert!(advice.issues.len() >= 3);
    }

    #[test]
    fn low_entropy_penalty() {
        let analysis = make_analysis(vec![]);
        let entropy = BoltzmannResult {
            interpretations: 1,
            entropy_bits: 0.0,
            max_entropy: 1.0,
            entropy_density: 0.0,
            deterministic_links: vec![(0, 0)],
            link_matrix: vec![vec![1.0]],
            privacy_grade: 'F',
            too_complex: false,
        };
        let advice = advise_transaction(&analysis, Some(&entropy), None);
        assert!(advice.issues.contains(&PrivacyIssue::LowEntropy));
        assert!(advice.score <= 8);
    }

    #[test]
    fn score_never_below_1() {
        let analysis = make_analysis(vec![
            ("address_reuse", serde_json::json!({"detected": true})),
            ("round_number_payment", serde_json::json!({"detected": true})),
            ("change_detection", serde_json::json!({"detected": true, "confidence": "high"})),
        ]);
        let mut single_output_analysis = analysis;
        single_output_analysis.output_script_types = vec!["p2wpkh".to_string()];

        let fp = WalletFingerprint {
            bip69_compliant: false,
            low_r_signatures: Some(true),
            anti_fee_sniping: true,
            rbf_signaling: true,
            change_position: crate::fingerprint::ChangePosition::Last,
            input_type_consistency: false, // mixed inputs too
            likely_wallet: Some("Bitcoin Core (≥0.17)".to_string()),
            confidence: Confidence::High,
        };

        let entropy = BoltzmannResult {
            interpretations: 1,
            entropy_bits: 0.0,
            max_entropy: 1.0,
            entropy_density: 0.0,
            deterministic_links: vec![],
            link_matrix: vec![],
            privacy_grade: 'F',
            too_complex: false,
        };

        let advice = advise_transaction(
            &single_output_analysis,
            Some(&entropy),
            Some(&fp),
        );
        assert_eq!(advice.score, 1); // clamped to minimum
        assert_eq!(advice.grade, "Critical");
    }
}
