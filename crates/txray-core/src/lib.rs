//! # txray-core
//!
//! Core Bitcoin primitives for the txray toolkit.
//!
//! Provides raw transaction parsing, script classification, address derivation,
//! block parsing, merkle root computation, and UTXO undo data handling —
//! all from raw bytes, without depending on external Bitcoin crates.

pub mod block;
pub mod error;
pub mod tx;
