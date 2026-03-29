/// Errors from network fetching and caching operations.
#[derive(Debug, thiserror::Error)]
pub enum NetError {
    #[error("http request failed: {0}")]
    Http(String),

    #[error("not found: {0}")]
    NotFound(String),

    #[error("invalid response: {0}")]
    InvalidResponse(String),

    #[error("cache error: {0}")]
    Cache(String),

    #[error("invalid block id: {0}")]
    InvalidBlockId(String),
}
