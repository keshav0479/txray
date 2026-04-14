//! Integration tests that drive txray-smith over the published web fixtures.
//! Each fixture in `web/public/fixtures/*.json` is checked into the repo as a
//! reference example for the browser UI - we reuse them here so any change
//! that breaks fixture parsing fails in CI.

use std::fs;
use std::path::PathBuf;

use txray_smith::{parse_fixture, validate_fixture};

fn fixtures_dir() -> PathBuf {
    // CARGO_MANIFEST_DIR points at crates/txray-smith; walk up to the repo
    // root and into the web fixtures directory.
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .join("web")
        .join("public")
        .join("fixtures")
}

fn load(name: &str) -> String {
    let path = fixtures_dir().join(name);
    fs::read_to_string(&path)
        .unwrap_or_else(|e| panic!("reading fixture {}: {}", path.display(), e))
}

fn assert_fixture_ok(name: &str) {
    let json = load(name);
    let fixture = parse_fixture(&json).unwrap_or_else(|e| panic!("{name} parse: {e}"));
    validate_fixture(&fixture).unwrap_or_else(|e| panic!("{name} validate: {e}"));
    assert!(
        !fixture.utxos.is_empty(),
        "{name} should declare at least one utxo"
    );
}

#[test]
fn basic_change_p2wpkh_parses() {
    assert_fixture_ok("basic_change_p2wpkh.json");
}

#[test]
fn rbf_send_all_parses() {
    assert_fixture_ok("rbf_send_all.json");
}

#[test]
fn rbf_with_locktime_parses() {
    assert_fixture_ok("rbf_with_locktime.json");
}

#[test]
fn small_utxos_consolidation_parses() {
    assert_fixture_ok("small_utxos_consolidation.json");
}

#[test]
fn large_mixed_script_types_parses() {
    assert_fixture_ok("large_mixed_script_types.json");
}

#[test]
fn many_inputs_many_outputs_parses() {
    assert_fixture_ok("many_inputs_many_outputs.json");
}
