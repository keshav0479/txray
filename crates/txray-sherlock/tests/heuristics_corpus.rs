//! Hermetic integration tests for txray-sherlock. Block-level analysis
//! needs real `blk*.dat` files we don't check in, so these exercise the
//! pure pieces of the public API that don't touch disk.

use txray_sherlock::{analyze_block_file, compute_fee_stats};

#[test]
fn fee_stats_on_empty_input() {
    let stats = compute_fee_stats(&[]);
    assert_eq!(stats.min_sat_vb, 0.0);
    assert_eq!(stats.max_sat_vb, 0.0);
    assert_eq!(stats.mean_sat_vb, 0.0);
    assert_eq!(stats.median_sat_vb, 0.0);
}

#[test]
fn fee_stats_on_single_value() {
    let stats = compute_fee_stats(&[12.5]);
    assert_eq!(stats.min_sat_vb, 12.5);
    assert_eq!(stats.max_sat_vb, 12.5);
    assert_eq!(stats.mean_sat_vb, 12.5);
    assert_eq!(stats.median_sat_vb, 12.5);
}

#[test]
fn fee_stats_even_and_odd_median() {
    // Odd-length: median is the middle element.
    let odd = compute_fee_stats(&[1.0, 2.0, 3.0, 4.0, 5.0]);
    assert_eq!(odd.median_sat_vb, 3.0);
    assert_eq!(odd.mean_sat_vb, 3.0);

    // Even-length: median averages the two middle elements.
    let even = compute_fee_stats(&[1.0, 2.0, 3.0, 4.0]);
    assert_eq!(even.median_sat_vb, 2.5);
    assert_eq!(even.mean_sat_vb, 2.5);
    assert_eq!(even.min_sat_vb, 1.0);
    assert_eq!(even.max_sat_vb, 4.0);
}

#[test]
fn fee_stats_unsorted_input() {
    // Function must sort internally - out-of-order input still produces
    // the right min/max/median.
    let stats = compute_fee_stats(&[9.0, 1.0, 5.0, 3.0, 7.0]);
    assert_eq!(stats.min_sat_vb, 1.0);
    assert_eq!(stats.max_sat_vb, 9.0);
    assert_eq!(stats.median_sat_vb, 5.0);
    assert_eq!(stats.mean_sat_vb, 5.0);
}

#[test]
fn analyze_block_file_missing_path_returns_file_not_found() {
    // Every path is missing → the function must return an error rather
    // than panicking. This guards against future refactors that forget
    // the existence check.
    let res = analyze_block_file("/no/such/blk.dat", "/no/such/rev.dat", "/no/such/xor.dat");
    assert!(res.is_err(), "missing files should return Err");
}
