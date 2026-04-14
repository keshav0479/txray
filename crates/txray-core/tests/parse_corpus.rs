//! Integration tests that parse well-known historical Bitcoin transactions
//! and assert the round-tripped txid matches the canonical value. These are
//! hermetic - every byte is checked into the test, no network required.

use txray_core::tx::hash::compute_txid;
use txray_core::tx::parser::parse_raw_tx;

/// The genesis block coinbase. Block 0, the only tx in the genesis block.
const GENESIS_COINBASE_HEX: &str = "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff4d04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420666f722062616e6b73ffffffff0100f2052a01000000434104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac00000000";

/// Canonical txid of the genesis coinbase, in display (big-endian) order.
const GENESIS_COINBASE_TXID: &str =
    "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b";

fn hex_to_bytes(hex: &str) -> Vec<u8> {
    (0..hex.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&hex[i..i + 2], 16).expect("valid hex"))
        .collect()
}

#[test]
fn genesis_coinbase_parses() {
    let bytes = hex_to_bytes(GENESIS_COINBASE_HEX);
    let parsed = parse_raw_tx(&bytes).expect("genesis coinbase should parse");

    assert_eq!(parsed.inputs.len(), 1, "genesis has one input");
    assert_eq!(parsed.outputs.len(), 1, "genesis has one output");
    assert!(!parsed.is_segwit, "genesis is pre-segwit");
}

#[test]
fn genesis_coinbase_txid_matches() {
    let bytes = hex_to_bytes(GENESIS_COINBASE_HEX);
    let parsed = parse_raw_tx(&bytes).expect("genesis coinbase should parse");
    let txid = compute_txid(&parsed.base_bytes);
    assert_eq!(txid, GENESIS_COINBASE_TXID);
}

#[test]
fn genesis_coinbase_value_is_50btc() {
    let bytes = hex_to_bytes(GENESIS_COINBASE_HEX);
    let parsed = parse_raw_tx(&bytes).expect("parse");
    assert_eq!(parsed.outputs[0].value, 50 * 100_000_000);
}

#[test]
fn genesis_coinbase_input_is_null() {
    let bytes = hex_to_bytes(GENESIS_COINBASE_HEX);
    let parsed = parse_raw_tx(&bytes).expect("parse");
    // Coinbase inputs use a null outpoint: all-zero txid, 0xffffffff vout.
    assert_eq!(parsed.inputs[0].txid, [0u8; 32]);
    assert_eq!(parsed.inputs[0].vout, 0xffffffff);
}
