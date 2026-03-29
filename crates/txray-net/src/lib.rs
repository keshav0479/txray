//! # txray-net
//!
//! Fetch raw Bitcoin blocks and transactions from public APIs
//! (mempool.space and Blockstream Esplora). Includes retry logic
//! and local disk caching.

mod cache;
mod fetch;

pub mod error;
pub use error::NetError;

/// Which API backend to use for fetching
#[derive(Debug, Clone)]
pub enum ApiSource {
    /// mempool.space/api
    MempoolSpace,
    /// blockstream.info/api
    Esplora,
    /// user-provided base URL
    Custom(String),
}

/// Identify a block by hash or height
#[derive(Debug, Clone)]
pub enum BlockId {
    Hash(String),
    Height(u64),
}

/// Resolve a block height to its hash string.
pub async fn fetch_block_hash(source: &ApiSource, height: u64) -> Result<String, NetError> {
    let base = fetch::base_url(source);
    let url = format!("{}/block-height/{}", base, height);
    let text = fetch::fetch_text_with_retry(&url, 3).await?;
    let hash = text.trim().to_string();
    if hash.len() != 64 || !hash.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(NetError::InvalidResponse(format!(
            "expected 64-char hex hash, got: {}",
            hash
        )));
    }
    Ok(hash)
}

/// Fetch a raw block as bytes. Checks cache first, fetches and caches on miss.
pub async fn fetch_raw_block(source: &ApiSource, id: &BlockId) -> Result<Vec<u8>, NetError> {
    // resolve to hash first
    let hash = match id {
        BlockId::Hash(h) => h.clone(),
        BlockId::Height(height) => fetch_block_hash(source, *height).await?,
    };

    // check cache
    if let Some(data) = cache::read_cached(&hash) {
        return Ok(data);
    }

    // fetch from API
    let base = fetch::base_url(source);
    let url = format!("{}/block/{}/raw", base, hash);
    let data = fetch::fetch_bytes_with_retry(&url, 3).await?;

    if data.is_empty() {
        return Err(NetError::NotFound(format!(
            "empty response for block {}",
            hash
        )));
    }

    // cache for next time
    cache::write_cache(&hash, &data)?;

    Ok(data)
}

/// Fetch a raw transaction as bytes.
pub async fn fetch_raw_tx(source: &ApiSource, txid: &str) -> Result<Vec<u8>, NetError> {
    if txid.len() != 64 || !txid.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(NetError::InvalidBlockId(format!(
            "invalid txid: expected 64-char hex, got: {}",
            txid
        )));
    }

    let base = fetch::base_url(source);
    let url = format!("{}/tx/{}/raw", base, txid);
    let data = fetch::fetch_bytes_with_retry(&url, 3).await?;

    if data.is_empty() {
        return Err(NetError::NotFound(format!(
            "empty response for tx {}",
            txid
        )));
    }

    Ok(data)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn block_id_hash_variant() {
        let id = BlockId::Hash("abc123".to_string());
        match id {
            BlockId::Hash(h) => assert_eq!(h, "abc123"),
            _ => panic!("expected Hash variant"),
        }
    }

    #[test]
    fn block_id_height_variant() {
        let id = BlockId::Height(170);
        match id {
            BlockId::Height(h) => assert_eq!(h, 170),
            _ => panic!("expected Height variant"),
        }
    }

    #[test]
    fn api_source_clone() {
        let source = ApiSource::MempoolSpace;
        let cloned = source.clone();
        assert!(matches!(cloned, ApiSource::MempoolSpace));
    }

    #[test]
    fn api_source_custom() {
        let source = ApiSource::Custom("http://localhost:3000".to_string());
        match source {
            ApiSource::Custom(url) => assert_eq!(url, "http://localhost:3000"),
            _ => panic!("expected Custom variant"),
        }
    }
}
