//! Smoke tests for the `txray` binary. These don't exercise the privacy
//! heuristics or the network layer - they just make sure the binary builds,
//! prints a version, and the `famous` subcommand returns non-empty output
//! for every curated block. Any regression in clap wiring or module plumbing
//! surfaces here before it hits the web layer.

use std::process::Command;

/// Path to the freshly-built `txray` binary, supplied by Cargo.
fn txray_bin() -> &'static str {
    env!("CARGO_BIN_EXE_txray")
}

fn run(args: &[&str]) -> (bool, String, String) {
    let out = Command::new(txray_bin())
        .args(args)
        .output()
        .expect("failed to execute txray binary");
    (
        out.status.success(),
        String::from_utf8_lossy(&out.stdout).into_owned(),
        String::from_utf8_lossy(&out.stderr).into_owned(),
    )
}

#[test]
fn prints_version() {
    let (ok, stdout, _) = run(&["--version"]);
    assert!(ok, "txray --version should exit 0");
    assert!(
        stdout.to_lowercase().contains("txray"),
        "version output should mention txray, got: {stdout}"
    );
}

#[test]
fn help_mentions_core_subcommands() {
    let (ok, stdout, _) = run(&["--help"]);
    assert!(ok, "txray --help should exit 0");
    for cmd in ["famous", "parse", "build", "analyze"] {
        assert!(
            stdout.contains(cmd),
            "--help output missing subcommand `{cmd}`"
        );
    }
}

#[test]
fn famous_without_args_lists_corpus() {
    let (ok, stdout, _) = run(&["famous"]);
    assert!(ok, "txray famous should exit 0");
    assert!(
        !stdout.trim().is_empty(),
        "famous with no args should print the corpus"
    );
}

#[test]
fn famous_genesis_lookup() {
    let (ok, stdout, _) = run(&["famous", "genesis"]);
    assert!(ok, "txray famous genesis should exit 0");
    assert!(
        stdout.to_lowercase().contains("genesis"),
        "famous genesis output should name the block, got: {stdout}"
    );
}

#[test]
fn famous_pizza_lookup() {
    let (ok, stdout, _) = run(&["famous", "pizza"]);
    assert!(ok, "txray famous pizza should exit 0");
    assert!(
        stdout.to_lowercase().contains("pizza"),
        "famous pizza output should name the block, got: {stdout}"
    );
}
