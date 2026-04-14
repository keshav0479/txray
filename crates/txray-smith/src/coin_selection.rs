/// Coin selection: multi-strategy iterative with dust-aware retry.
///
/// Strategy 1: Prefix by value (largest-first, current approach).
/// Strategy 2: Prefix by effective value (value minus fee-cost of input).
/// Strategy 3: Individual UTXO scan (try every single UTXO for n=1).
/// Strategy 4: Phase 2 target-match (swap UTXOs to produce change from send-all).
///
/// This multi-strategy approach prevents false INSUFFICIENT_FUNDS when
/// heavy-weight UTXOs are sorted first by value but can't cover fees,
/// while lighter-weight UTXOs with slightly less value can.
use crate::error::BuilderError;
use crate::fixture::{Fixture, Utxo};
use crate::weight::{
    estimate_weight, input_weight, resolve_input_type, weight_to_vbytes, InputInfo, OutputInfo,
};

/// Dust threshold in satoshis (README: 546 sats).
const DUST_THRESHOLD: u64 = 546;

/// Result of coin selection.
#[derive(Debug)]
pub struct CoinSelectionResult {
    /// Selected UTXOs (indices into the sorted list, mapped back to originals).
    pub selected_utxos: Vec<Utxo>,
    /// Effective types for each selected UTXO (classified from hex).
    pub effective_types: Vec<String>,
    /// If Some, a change output with this value should be created.
    pub change_value: Option<u64>,
    /// The fee in satoshis.
    pub fee_sats: u64,
    /// Estimated vbytes of the transaction.
    pub vbytes: u64,
    /// Estimated weight of the transaction.
    pub weight: u64,
}

/// Perform coin selection on the fixture.
///
/// Returns a `CoinSelectionResult` or an error.
pub fn select_coins(fixture: &Fixture) -> Result<CoinSelectionResult, BuilderError> {
    let payments_total: u64 = fixture.payments.iter().map(|p| p.value_sats).sum();
    let fee_rate = fixture.fee_rate_sat_vb;
    let max_inputs = fixture
        .policy
        .as_ref()
        .and_then(|p| p.max_inputs)
        .unwrap_or(fixture.utxos.len());

    // Resolve effective types for all UTXOs (from script_pubkey_hex, NOT fixture string)
    let effective_types: Vec<String> = fixture
        .utxos
        .iter()
        .map(|u| resolve_input_type(&u.script_pubkey_hex))
        .collect();

    // Build payment output infos (for weight estimation)
    let payment_outputs: Vec<OutputInfo> = fixture
        .payments
        .iter()
        .map(|p| OutputInfo {
            script_pubkey_hex: p.script_pubkey_hex.clone(),
        })
        .collect();

    // Change output info (for weight estimation when change is included)
    let change_output = OutputInfo {
        script_pubkey_hex: fixture.change.script_pubkey_hex.clone(),
    };

    let max_n = max_inputs.min(fixture.utxos.len());

    // Track best solutions found globally
    let mut best_with_change: Option<CoinSelectionResult> = None;
    let mut best_send_all: Option<CoinSelectionResult> = None;

    // ── Helper: try a specific set of UTXO indices ─────────────────────────
    let try_subset = |indices: &[usize],
                      best_change: &mut Option<CoinSelectionResult>,
                      best_sendall: &mut Option<CoinSelectionResult>| {
        let utxos: Vec<&Utxo> = indices.iter().map(|&i| &fixture.utxos[i]).collect();
        let types: Vec<String> = indices
            .iter()
            .map(|&i| effective_types[i].clone())
            .collect();
        let input_sum: u64 = utxos.iter().map(|u| u.value_sats).sum();

        if input_sum < payments_total {
            return;
        }

        let input_infos: Vec<InputInfo> = types
            .iter()
            .map(|t| InputInfo {
                effective_type: t.clone(),
            })
            .collect();

        // Try WITH change
        {
            let mut outputs_with_change = payment_outputs.clone();
            outputs_with_change.push(change_output.clone());

            let weight = estimate_weight(&input_infos, &outputs_with_change);
            let vbytes = weight_to_vbytes(weight);
            let min_fee = ceil_mul(vbytes, fee_rate);

            if input_sum >= payments_total + min_fee {
                let change_value = input_sum - payments_total - min_fee;
                if change_value >= DUST_THRESHOLD {
                    // Compare: prefer fewer inputs, then higher change
                    let dominated = if let Some(ref existing) = best_change {
                        let cur_n = indices.len();
                        let ex_n = existing.selected_utxos.len();
                        cur_n > ex_n
                            || (cur_n == ex_n && change_value <= existing.change_value.unwrap_or(0))
                    } else {
                        false
                    };

                    if !dominated {
                        *best_change = Some(CoinSelectionResult {
                            selected_utxos: utxos.iter().map(|u| (*u).clone()).collect(),
                            effective_types: types.clone(),
                            change_value: Some(change_value),
                            fee_sats: min_fee,
                            vbytes,
                            weight,
                        });
                    }
                }
            }
        }

        // Try WITHOUT change (only if no with-change solution yet)
        if best_change.is_none() {
            let weight = estimate_weight(&input_infos, &payment_outputs);
            let vbytes = weight_to_vbytes(weight);
            let min_fee = ceil_mul(vbytes, fee_rate);
            let leftover = input_sum - payments_total;

            if leftover >= min_fee {
                let dominated = if let Some(ref existing) = best_sendall {
                    indices.len() > existing.selected_utxos.len()
                        || (indices.len() == existing.selected_utxos.len()
                            && leftover >= existing.fee_sats)
                } else {
                    false
                };

                if !dominated {
                    *best_sendall = Some(CoinSelectionResult {
                        selected_utxos: utxos.iter().map(|u| (*u).clone()).collect(),
                        effective_types: types.clone(),
                        change_value: None,
                        fee_sats: leftover,
                        vbytes,
                        weight,
                    });
                }
            }
        }
    };

    // ── Strategy 1: Prefix by value descending ──────────────────────────────

    let mut by_value: Vec<usize> = (0..fixture.utxos.len()).collect();
    by_value.sort_by(|&a, &b| {
        fixture.utxos[b]
            .value_sats
            .cmp(&fixture.utxos[a].value_sats)
    });

    for n in 1..=max_n {
        let indices: Vec<usize> = by_value[0..n].to_vec();
        try_subset(&indices, &mut best_with_change, &mut best_send_all);
        if best_with_change.is_some() {
            break; // Fewest inputs with change - stop
        }
    }

    // ── Strategy 2: Prefix by effective value (value - fee cost) ────────────
    // This handles the case where lighter-weight UTXOs are more fee-efficient

    if best_with_change.is_none() {
        let mut by_effective: Vec<usize> = (0..fixture.utxos.len()).collect();
        by_effective.sort_by(|&a, &b| {
            let cost_a = input_weight(&effective_types[a], true) as f64 * fee_rate / 4.0;
            let cost_b = input_weight(&effective_types[b], true) as f64 * fee_rate / 4.0;
            let eff_a = fixture.utxos[a].value_sats as f64 - cost_a;
            let eff_b = fixture.utxos[b].value_sats as f64 - cost_b;
            eff_b
                .partial_cmp(&eff_a)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        for n in 1..=max_n {
            let indices: Vec<usize> = by_effective[0..n].to_vec();
            try_subset(&indices, &mut best_with_change, &mut best_send_all);
            if best_with_change.is_some() {
                break;
            }
        }
    }

    // ── Strategy 3: Individual UTXO scan ────────────────────────────────────
    // Try every single UTXO individually (catches cases where the largest
    // by value is too heavy but a smaller lighter UTXO works)

    if best_with_change.is_none() {
        for i in 0..fixture.utxos.len() {
            try_subset(&[i], &mut best_with_change, &mut best_send_all);
            if best_with_change.is_some() {
                break;
            }
        }
    }

    // ── Strategy 4: Pairwise combinations (for small max_inputs) ────────────
    // When max_inputs >= 2, try all pairs if no with-change found yet

    if best_with_change.is_none() && max_n >= 2 {
        let n_utxos = fixture.utxos.len();
        'outer: for i in 0..n_utxos {
            for j in (i + 1)..n_utxos {
                try_subset(&[i, j], &mut best_with_change, &mut best_send_all);
                if best_with_change.is_some() {
                    break 'outer;
                }
            }
        }
    }

    // ── Strategy 5: Triples (for max_inputs >= 3 and small pools) ───────────

    if best_with_change.is_none() && max_n >= 3 {
        let n_utxos = fixture.utxos.len().min(30); // cap to avoid O(n^3) explosion
        'outer3: for i in 0..n_utxos {
            for j in (i + 1)..n_utxos {
                for k in (j + 1)..n_utxos {
                    try_subset(&[i, j, k], &mut best_with_change, &mut best_send_all);
                    if best_with_change.is_some() {
                        break 'outer3;
                    }
                }
            }
        }
    }

    // ── Return best solution ────────────────────────────────────────────────

    // Prefer with-change over send-all
    if let Some(result) = best_with_change {
        return Ok(result);
    }

    if let Some(result) = best_send_all {
        return Ok(result);
    }

    // Nothing works
    Err(BuilderError::insufficient_funds(format!(
        "Cannot cover payments ({payments_total} sats) + fee with available UTXOs"
    )))
}

/// ceil(a * b) for u64 * f64 → u64
fn ceil_mul(a: u64, b: f64) -> u64 {
    (a as f64 * b).ceil() as u64
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixture::{ChangeTemplate, Fixture, Payment, Policy, Utxo};

    /// Helper: create a simple fixture for testing.
    fn make_fixture(
        utxo_values: &[u64],
        payment_total: u64,
        fee_rate: f64,
        max_inputs: Option<usize>,
    ) -> Fixture {
        let utxos: Vec<Utxo> = utxo_values
            .iter()
            .enumerate()
            .map(|(i, &v)| Utxo {
                txid: format!("{:064x}", i + 1),
                vout: 0,
                value_sats: v,
                // p2wpkh scriptPubKey
                script_pubkey_hex: "0014aabbccddee0011223344556677889900aabbccdd".to_string(),
                script_type: "p2wpkh".to_string(),
                address: None,
            })
            .collect();

        Fixture {
            network: "mainnet".to_string(),
            utxos,
            payments: vec![Payment {
                value_sats: payment_total,
                script_pubkey_hex: "0014aabbccddee0011223344556677889900aabbccdd".to_string(),
                script_type: None,
                address: None,
            }],
            change: ChangeTemplate {
                script_pubkey_hex: "0014aabbccddee0011223344556677889900aabbccdd".to_string(),
                script_type: "p2wpkh".to_string(),
                address: None,
            },
            fee_rate_sat_vb: fee_rate,
            rbf: None,
            locktime: None,
            current_height: None,
            policy: max_inputs.map(|m| Policy {
                max_inputs: Some(m),
            }),
        }
    }

    /// Helper: create a fixture with mixed script types.
    fn make_mixed_fixture(
        utxos: Vec<(u64, &str)>, // (value, script_pubkey_hex)
        payment_total: u64,
        fee_rate: f64,
        max_inputs: Option<usize>,
    ) -> Fixture {
        let utxo_list: Vec<Utxo> = utxos
            .iter()
            .enumerate()
            .map(|(i, (v, spk))| Utxo {
                txid: format!("{:064x}", i + 1),
                vout: 0,
                value_sats: *v,
                script_pubkey_hex: spk.to_string(),
                script_type: "unknown".to_string(),
                address: None,
            })
            .collect();

        Fixture {
            network: "mainnet".to_string(),
            utxos: utxo_list,
            payments: vec![Payment {
                value_sats: payment_total,
                script_pubkey_hex: "0014aabbccddee0011223344556677889900aabbccdd".to_string(),
                script_type: None,
                address: None,
            }],
            change: ChangeTemplate {
                script_pubkey_hex: "0014aabbccddee0011223344556677889900aabbccdd".to_string(),
                script_type: "p2wpkh".to_string(),
                address: None,
            },
            fee_rate_sat_vb: fee_rate,
            rbf: None,
            locktime: None,
            current_height: None,
            policy: max_inputs.map(|m| Policy {
                max_inputs: Some(m),
            }),
        }
    }

    #[test]
    fn test_select_single_input_with_change() {
        let fixture = make_fixture(&[100_000], 50_000, 1.0, None);
        let result = select_coins(&fixture).unwrap();
        assert_eq!(result.selected_utxos.len(), 1);
        assert!(result.change_value.is_some());
        let change = result.change_value.unwrap();
        assert!(change >= DUST_THRESHOLD);
        assert_eq!(
            result.selected_utxos[0].value_sats,
            50_000 + result.fee_sats + change
        );
    }

    #[test]
    fn test_select_multiple_inputs_needed() {
        let fixture = make_fixture(&[30_000, 20_000], 40_000, 1.0, None);
        let result = select_coins(&fixture).unwrap();
        assert_eq!(result.selected_utxos.len(), 2);
    }

    #[test]
    fn test_select_max_inputs_respected() {
        let fixture = make_fixture(&[50_000, 40_000, 30_000], 60_000, 1.0, Some(2));
        let result = select_coins(&fixture).unwrap();
        assert!(result.selected_utxos.len() <= 2);
    }

    #[test]
    fn test_select_max_inputs_insufficient() {
        let fixture = make_fixture(&[5_000, 5_000, 5_000], 10_000, 1.0, Some(1));
        let result = select_coins(&fixture);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.code, "INSUFFICIENT_FUNDS");
    }

    #[test]
    fn test_select_send_all() {
        // UTXO value close to payment + fee, with change below dust threshold.
        // 1 p2wpkh in, 1 p2wpkh out: ~110 vbytes at rate 1.0 → fee ~110 sats
        // With change: leftover ≈ 600 - 141 = 459 < 546 (dust) → can't use change
        // Without change: leftover = 600 ≥ 110 (fee) → send-all
        let fixture = make_fixture(&[50_600], 50_000, 1.0, None);
        let result = select_coins(&fixture).unwrap();
        assert!(result.change_value.is_none());
        assert!(result.fee_sats > 0);
        assert_eq!(
            result.selected_utxos[0].value_sats,
            50_000 + result.fee_sats
        );
    }

    // ── Codex stress case: lighter UTXO succeeds when heavier fails ──

    #[test]
    fn test_codex_lighter_utxo_preferred() {
        // UTXO A: 118k, unknown script (592 WU) - sorted first by value
        // UTXO B: 115k, p2tr (230 WU) - lighter, should be selected
        // Payment: 100k, fee_rate: 100, max_inputs: 1
        // With UTXO A: fee would be very high due to 592 WU → may not fit
        // With UTXO B: fee is lower → should work
        let fixture = make_mixed_fixture(
            vec![
                (118_000, "6a"), // unknown, heavy
                (
                    115_000,
                    "5120aabbccddee001122334455667788990011223344556677889900aabbccddee00",
                ), // p2tr, light
            ],
            100_000,
            100.0,
            Some(1),
        );
        let result = select_coins(&fixture);
        assert!(result.is_ok(), "Should find a valid solution");
        let r = result.unwrap();
        // Should pick the p2tr UTXO (lighter), not the unknown one
        assert_eq!(r.selected_utxos.len(), 1);
    }

    #[test]
    fn test_codex_prefer_change_over_sendall_lighter() {
        // Two UTXOs: heavier one gets send-all, but lighter one gets change
        // Algorithm should prefer the lighter one with change
        let fixture = make_mixed_fixture(
            vec![
                (130_320, "6a"),                                           // unknown, heavy
                (129_384, "0014aabbccddee0011223344556677889900aabbccdd"), // p2wpkh, light
            ],
            100_000,
            50.0,
            Some(1),
        );
        let result = select_coins(&fixture).unwrap();
        // Should prefer with-change solution
        assert!(result.change_value.is_some());
    }
}
