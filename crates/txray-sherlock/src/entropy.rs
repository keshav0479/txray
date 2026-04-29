//! Boltzmann entropy analysis - measure transaction privacy via interpretation counting.
//!
//! Uses backtracking over input->output assignments to count valid matchings.
//! Each input is assigned to exactly one output; multiple inputs may fund the
//! same output. This is the simplified single-assignment model (as used by OXT).
//! Higher entropy = more ambiguous = better privacy.

use serde::Serialize;

/// Maximum combined inputs + outputs before we bail out to avoid O(2^n) blowup.
const MAX_IO_COUNT: usize = 15;

/// Result of Boltzmann entropy analysis.
#[derive(Debug, Clone, Serialize)]
pub struct BoltzmannResult {
    /// Number of valid interpretations (input->output matchings)
    pub interpretations: u64,
    /// Entropy in bits: log2(interpretations)
    pub entropy_bits: f64,
    /// Maximum possible entropy for this tx shape: log2(n_inputs! * n_outputs!)
    pub max_entropy: f64,
    /// Normalized entropy: entropy_bits / max_entropy (0.0 to 1.0)
    pub entropy_density: f64,
    /// Links that exist in ALL valid interpretations (forced connections)
    pub deterministic_links: Vec<(usize, usize)>,
    /// Probability matrix: link_matrix[i][j] = probability that input i funds output j
    pub link_matrix: Vec<Vec<f64>>,
    /// Privacy grade: A (best) through F (worst)
    pub privacy_grade: char,
    /// Whether the analysis was truncated due to complexity
    pub too_complex: bool,
}

/// Compute Boltzmann entropy for a transaction given input and output amounts.
///
/// Returns `None` if inputs/outputs are empty.
pub fn compute_entropy(input_amounts: &[u64], output_amounts: &[u64]) -> Option<BoltzmannResult> {
    let n_in = input_amounts.len();
    let n_out = output_amounts.len();

    if n_in == 0 || n_out == 0 {
        return None;
    }

    // Check complexity cap
    if n_in + n_out > MAX_IO_COUNT {
        return Some(BoltzmannResult {
            interpretations: 0,
            entropy_bits: 0.0,
            max_entropy: 0.0,
            entropy_density: 0.0,
            deterministic_links: Vec::new(),
            link_matrix: Vec::new(),
            privacy_grade: '?',
            too_complex: true,
        });
    }

    // Count valid interpretations via input->output assignment backtracking.
    // Each input is assigned to exactly one output; multiple inputs can share
    // an output. We enumerate all assignments where sums match exactly.
    let (interpretations, link_counts) = count_interpretations(input_amounts, output_amounts);

    let entropy_bits = if interpretations > 0 {
        (interpretations as f64).log2()
    } else {
        0.0
    };

    // Max entropy: if all inputs could map to all outputs equally
    let max_entropy = if n_in > 1 && n_out > 1 {
        let max_interp = factorial(n_in.min(n_out));
        (max_interp as f64).log2()
    } else {
        0.0
    };

    let entropy_density = if max_entropy > 0.0 {
        (entropy_bits / max_entropy).min(1.0)
    } else if interpretations <= 1 {
        0.0
    } else {
        1.0
    };

    // Build link probability matrix
    let link_matrix: Vec<Vec<f64>> = if interpretations > 0 {
        link_counts
            .iter()
            .map(|row| {
                row.iter()
                    .map(|&count| count as f64 / interpretations as f64)
                    .collect()
            })
            .collect()
    } else {
        vec![vec![0.0; n_out]; n_in]
    };

    // Find deterministic links (probability == 1.0)
    let deterministic_links: Vec<(usize, usize)> = if interpretations > 0 {
        link_matrix
            .iter()
            .enumerate()
            .flat_map(|(i, row)| {
                row.iter().enumerate().filter_map(move |(j, &prob)| {
                    if (prob - 1.0).abs() < f64::EPSILON {
                        Some((i, j))
                    } else {
                        None
                    }
                })
            })
            .collect()
    } else {
        Vec::new()
    };

    let privacy_grade = grade_entropy(entropy_bits);

    Some(BoltzmannResult {
        interpretations,
        entropy_bits,
        max_entropy,
        entropy_density,
        deterministic_links,
        link_matrix,
        privacy_grade,
        too_complex: false,
    })
}

/// Count the number of valid interpretations using brute-force enumeration
/// of input->output assignments. For each valid assignment, track which
/// (input, output) links are used.
///
/// A valid interpretation is a partition of inputs into groups where each
/// group's sum equals exactly one output amount.
fn count_interpretations(inputs: &[u64], outputs: &[u64]) -> (u64, Vec<Vec<u64>>) {
    let n_in = inputs.len();
    let n_out = outputs.len();
    let mut total_count: u64 = 0;
    let mut link_counts = vec![vec![0u64; n_out]; n_in];

    // We need to assign each input to exactly one output such that
    // for each output j: sum of inputs assigned to j == outputs[j].
    //
    // Use recursive backtracking with partial sum tracking.
    let mut assignment = vec![0usize; n_in]; // assignment[i] = which output input i is assigned to
    let mut partial_sums = vec![0u64; n_out]; // running sum for each output

    fn backtrack(
        input_idx: usize,
        inputs: &[u64],
        outputs: &[u64],
        assignment: &mut Vec<usize>,
        partial_sums: &mut Vec<u64>,
        total_count: &mut u64,
        link_counts: &mut Vec<Vec<u64>>,
    ) {
        if input_idx == inputs.len() {
            // Check if all outputs are exactly matched
            if partial_sums.iter().zip(outputs.iter()).all(|(s, o)| s == o) {
                *total_count += 1;
                // Record links for this valid assignment
                for (i, &j) in assignment.iter().enumerate() {
                    link_counts[i][j] += 1;
                }
            }
            return;
        }

        let input_val = inputs[input_idx];

        for j in 0..outputs.len() {
            // Prune: don't assign if it would exceed the output amount
            let Some(next_sum) = partial_sums[j].checked_add(input_val) else {
                continue;
            };
            if next_sum > outputs[j] {
                continue;
            }

            assignment[input_idx] = j;
            partial_sums[j] = next_sum;

            backtrack(
                input_idx + 1,
                inputs,
                outputs,
                assignment,
                partial_sums,
                total_count,
                link_counts,
            );

            partial_sums[j] -= input_val;
        }
    }

    backtrack(
        0,
        inputs,
        outputs,
        &mut assignment,
        &mut partial_sums,
        &mut total_count,
        &mut link_counts,
    );

    (total_count, link_counts)
}

/// Simple factorial (capped to avoid overflow).
fn factorial(n: usize) -> u64 {
    (1..=n as u64).fold(1u64, |acc, x| acc.saturating_mul(x))
}

/// Assign a privacy grade based on entropy bits.
fn grade_entropy(entropy_bits: f64) -> char {
    if entropy_bits >= 4.0 {
        'A'
    } else if entropy_bits >= 3.0 {
        'B'
    } else if entropy_bits >= 2.0 {
        'C'
    } else if entropy_bits >= 1.0 {
        'D'
    } else {
        'F'
    }
}

impl std::fmt::Display for BoltzmannResult {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "Boltzmann Entropy Analysis")?;
        writeln!(
            f,
            "------------------------------------------------------------------------------"
        )?;
        writeln!(f)?;

        if self.too_complex {
            writeln!(
                f,
                "  Transaction too complex for exact analysis (>{} inputs+outputs)",
                MAX_IO_COUNT
            )?;
            return Ok(());
        }

        writeln!(f, "  Interpretations:    {}", self.interpretations)?;
        writeln!(f, "  Entropy:            {:.2} bits", self.entropy_bits)?;
        writeln!(f, "  Max entropy:        {:.2} bits", self.max_entropy)?;
        writeln!(
            f,
            "  Entropy density:    {:.1}%",
            self.entropy_density * 100.0
        )?;
        writeln!(f, "  Privacy grade:      {}", self.privacy_grade)?;
        writeln!(f)?;

        if !self.deterministic_links.is_empty() {
            writeln!(f, "  Deterministic links (forced connections):")?;
            for &(i, j) in &self.deterministic_links {
                writeln!(f, "    input[{}] -> output[{}]", i, j)?;
            }
            writeln!(f)?;
        }

        if !self.link_matrix.is_empty() {
            writeln!(f, "  Link probability matrix:")?;
            write!(f, "         ")?;
            for j in 0..self.link_matrix[0].len() {
                write!(f, "  out[{}]", j)?;
            }
            writeln!(f)?;
            for (i, row) in self.link_matrix.iter().enumerate() {
                write!(f, "  in[{}]  ", i)?;
                for &prob in row {
                    write!(f, "  {:.2}  ", prob)?;
                }
                writeln!(f)?;
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deterministic_1in_1out() {
        // 1 input, 1 output with matching amounts -> exactly 1 interpretation
        let result = compute_entropy(&[100_000], &[100_000]).unwrap();
        assert_eq!(result.interpretations, 1);
        assert_eq!(result.entropy_bits, 0.0);
        assert_eq!(result.privacy_grade, 'F');
        assert!(!result.too_complex);
        // The single link is deterministic
        assert_eq!(result.deterministic_links, vec![(0, 0)]);
    }

    #[test]
    fn no_valid_interpretation() {
        // Amounts don't balance -> 0 interpretations
        let result = compute_entropy(&[100_000], &[200_000]).unwrap();
        assert_eq!(result.interpretations, 0);
        assert_eq!(result.entropy_bits, 0.0);
        assert_eq!(result.privacy_grade, 'F');
    }

    #[test]
    fn simple_2in_2out_distinct() {
        // 2 inputs (30k, 70k), 2 outputs (30k, 70k) -> 1 interpretation
        // (30k->30k, 70k->70k is the only valid assignment)
        let result = compute_entropy(&[30_000, 70_000], &[30_000, 70_000]).unwrap();
        assert_eq!(result.interpretations, 1);
        assert_eq!(result.privacy_grade, 'F');
    }

    #[test]
    fn equal_value_2in_2out_ambiguous() {
        // 2 inputs (50k, 50k), 2 outputs (50k, 50k) -> 2 interpretations
        // (either input can go to either output)
        let result = compute_entropy(&[50_000, 50_000], &[50_000, 50_000]).unwrap();
        assert_eq!(result.interpretations, 2);
        assert!((result.entropy_bits - 1.0).abs() < 0.01); // log2(2) = 1.0
        assert_eq!(result.privacy_grade, 'D');
        // No deterministic links - each link has 50% probability
        assert!(result.deterministic_links.is_empty());
    }

    #[test]
    fn coinjoin_pattern_high_entropy() {
        // 3 inputs (100k each), 3 outputs (100k each) -> many interpretations
        let result =
            compute_entropy(&[100_000, 100_000, 100_000], &[100_000, 100_000, 100_000]).unwrap();
        // 3! = 6 interpretations (any permutation works)
        assert_eq!(result.interpretations, 6);
        assert!((result.entropy_bits - 2.585).abs() < 0.01); // log2(6) ~= 2.585
        assert_eq!(result.privacy_grade, 'C');
    }

    #[test]
    fn too_complex_bails_out() {
        // 16 inputs + outputs -> too complex
        let inputs: Vec<u64> = (1..=8).map(|i| i * 10_000).collect();
        let outputs: Vec<u64> = (1..=8).map(|i| i * 10_000).collect();
        let result = compute_entropy(&inputs, &outputs).unwrap();
        assert!(result.too_complex);
        assert_eq!(result.privacy_grade, '?');
    }

    #[test]
    fn empty_inputs_returns_none() {
        assert!(compute_entropy(&[], &[100_000]).is_none());
    }

    #[test]
    fn empty_outputs_returns_none() {
        assert!(compute_entropy(&[100_000], &[]).is_none());
    }

    #[test]
    fn link_matrix_probabilities_sum_correctly() {
        // For a valid result, each row should have probabilities that
        // reflect the fraction of interpretations using that link
        let result = compute_entropy(&[50_000, 50_000], &[50_000, 50_000]).unwrap();
        assert_eq!(result.link_matrix.len(), 2);
        assert_eq!(result.link_matrix[0].len(), 2);
        // Each input maps to each output in exactly half the interpretations
        assert!((result.link_matrix[0][0] - 0.5).abs() < 0.01);
        assert!((result.link_matrix[0][1] - 0.5).abs() < 0.01);
    }

    #[test]
    fn grade_boundaries() {
        assert_eq!(grade_entropy(0.0), 'F');
        assert_eq!(grade_entropy(0.9), 'F');
        assert_eq!(grade_entropy(1.0), 'D');
        assert_eq!(grade_entropy(2.0), 'C');
        assert_eq!(grade_entropy(3.0), 'B');
        assert_eq!(grade_entropy(4.0), 'A');
        assert_eq!(grade_entropy(10.0), 'A');
    }
}
