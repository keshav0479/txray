use std::fmt;

/// Structured error for the PSBT builder.
/// Serializes to: {"ok": false, "error": {"code": "...", "message": "..."}}
#[derive(Debug)]
pub struct BuilderError {
    pub code: String,
    pub message: String,
}

impl BuilderError {
    /// Malformed fixture: missing fields, bad hex, duplicate UTXOs, etc.
    pub fn invalid_fixture(msg: impl Into<String>) -> Self {
        Self {
            code: "INVALID_FIXTURE".to_string(),
            message: msg.into(),
        }
    }

    /// Cannot cover payments + fees with available UTXOs.
    pub fn insufficient_funds(msg: impl Into<String>) -> Self {
        Self {
            code: "INSUFFICIENT_FUNDS".to_string(),
            message: msg.into(),
        }
    }

    /// Unexpected internal errors (IO, serialization, etc.)
    pub fn internal(msg: impl Into<String>) -> Self {
        Self {
            code: "INTERNAL".to_string(),
            message: msg.into(),
        }
    }

    /// Serialize to the error JSON format required by the grader.
    pub fn to_json(&self) -> String {
        serde_json::json!({
            "ok": false,
            "error": {
                "code": self.code,
                "message": self.message
            }
        })
        .to_string()
    }
}

impl fmt::Display for BuilderError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[{}] {}", self.code, self.message)
    }
}

impl std::error::Error for BuilderError {}

impl From<std::io::Error> for BuilderError {
    fn from(e: std::io::Error) -> Self {
        Self::internal(format!("IO error: {e}"))
    }
}

impl From<serde_json::Error> for BuilderError {
    fn from(e: serde_json::Error) -> Self {
        Self::invalid_fixture(format!("JSON parse error: {e}"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_json_format() {
        let err = BuilderError::invalid_fixture("missing utxos field");
        let json: serde_json::Value = serde_json::from_str(&err.to_json()).unwrap();
        assert_eq!(json["ok"], false);
        assert_eq!(json["error"]["code"], "INVALID_FIXTURE");
        assert!(!json["error"]["message"].as_str().unwrap().is_empty());
    }

    #[test]
    fn test_insufficient_funds_error() {
        let err = BuilderError::insufficient_funds("need 10000 sats, have 5000");
        let json: serde_json::Value = serde_json::from_str(&err.to_json()).unwrap();
        assert_eq!(json["error"]["code"], "INSUFFICIENT_FUNDS");
    }
}
