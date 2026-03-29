//! Unified error types for txray-core.

use std::fmt;

/// Core error type for all parsing and analysis operations.
#[derive(Debug, Clone)]
pub struct TxrayError {
    /// Machine-readable error code (e.g. INVALID_TX, PREVOUT_MISSING)
    pub code: String,
    /// Human-readable error description
    pub message: String,
}

impl TxrayError {
    pub fn new(code: &str, message: impl Into<String>) -> Self {
        Self {
            code: code.to_string(),
            message: message.into(),
        }
    }

    pub fn invalid_tx(msg: impl Into<String>) -> Self {
        Self::new("INVALID_TX", msg)
    }

    pub fn invalid_hex(msg: impl Into<String>) -> Self {
        Self::new("INVALID_HEX", msg)
    }

    pub fn invalid_block(msg: impl Into<String>) -> Self {
        Self::new("INVALID_BLOCK", msg)
    }

    pub fn invalid_undo(msg: impl Into<String>) -> Self {
        Self::new("INVALID_UNDO", msg)
    }

    pub fn prevout_missing(msg: impl Into<String>) -> Self {
        Self::new("PREVOUT_MISSING", msg)
    }

    pub fn prevout_duplicate(msg: impl Into<String>) -> Self {
        Self::new("PREVOUT_DUPLICATE", msg)
    }

    pub fn prevout_extra(msg: impl Into<String>) -> Self {
        Self::new("PREVOUT_EXTRA", msg)
    }

    pub fn merkle_mismatch(msg: impl Into<String>) -> Self {
        Self::new("MERKLE_MISMATCH", msg)
    }

    pub fn coinbase_invalid(msg: impl Into<String>) -> Self {
        Self::new("COINBASE_INVALID", msg)
    }

    pub fn invalid_fixture(msg: impl Into<String>) -> Self {
        Self::new("INVALID_FIXTURE", msg)
    }

    pub fn file_not_found(msg: impl Into<String>) -> Self {
        Self::new("FILE_NOT_FOUND", msg)
    }

    pub fn to_json(&self) -> String {
        serde_json::json!({
            "ok": false,
            "error": {
                "code": self.code,
                "message": self.message,
            }
        })
        .to_string()
    }
}

impl fmt::Display for TxrayError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}: {}", self.code, self.message)
    }
}

impl std::error::Error for TxrayError {}
