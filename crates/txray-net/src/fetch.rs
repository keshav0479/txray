use crate::error::NetError;
use crate::ApiSource;

/// Map an ApiSource to its base URL (no trailing slash).
pub fn base_url(source: &ApiSource) -> &str {
    match source {
        ApiSource::MempoolSpace => "https://mempool.space/api",
        ApiSource::Esplora => "https://blockstream.info/api",
        ApiSource::Custom(url) => url.trim_end_matches('/'),
    }
}

/// GET request returning raw bytes, with retry and exponential backoff.
pub async fn fetch_bytes_with_retry(url: &str, max_retries: u32) -> Result<Vec<u8>, NetError> {
    let client = reqwest::Client::new();
    let mut last_err = None;

    for attempt in 0..max_retries {
        match client.get(url).send().await {
            Ok(resp) => {
                if resp.status() == reqwest::StatusCode::NOT_FOUND {
                    return Err(NetError::NotFound(format!("{} returned 404", url)));
                }
                if !resp.status().is_success() {
                    last_err = Some(NetError::Http(format!(
                        "{} returned status {}",
                        url,
                        resp.status()
                    )));
                } else {
                    match resp.bytes().await {
                        Ok(bytes) => return Ok(bytes.to_vec()),
                        Err(e) => {
                            last_err = Some(NetError::Http(format!("failed to read body: {}", e)));
                        }
                    }
                }
            }
            Err(e) => {
                last_err = Some(NetError::Http(format!("request failed: {}", e)));
            }
        }

        if attempt + 1 < max_retries {
            let delay = std::time::Duration::from_millis(500 * 2u64.pow(attempt));
            tokio::time::sleep(delay).await;
        }
    }

    Err(last_err.unwrap_or_else(|| NetError::Http("unknown error".to_string())))
}

/// GET request returning text, with retry and exponential backoff.
pub async fn fetch_text_with_retry(url: &str, max_retries: u32) -> Result<String, NetError> {
    let client = reqwest::Client::new();
    let mut last_err = None;

    for attempt in 0..max_retries {
        match client.get(url).send().await {
            Ok(resp) => {
                if resp.status() == reqwest::StatusCode::NOT_FOUND {
                    return Err(NetError::NotFound(format!("{} returned 404", url)));
                }
                if !resp.status().is_success() {
                    last_err = Some(NetError::Http(format!(
                        "{} returned status {}",
                        url,
                        resp.status()
                    )));
                } else {
                    match resp.text().await {
                        Ok(text) => return Ok(text),
                        Err(e) => {
                            last_err = Some(NetError::Http(format!("failed to read body: {}", e)));
                        }
                    }
                }
            }
            Err(e) => {
                last_err = Some(NetError::Http(format!("request failed: {}", e)));
            }
        }

        if attempt + 1 < max_retries {
            let delay = std::time::Duration::from_millis(500 * 2u64.pow(attempt));
            tokio::time::sleep(delay).await;
        }
    }

    Err(last_err.unwrap_or_else(|| NetError::Http("unknown error".to_string())))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mempool_base_url() {
        assert_eq!(
            base_url(&ApiSource::MempoolSpace),
            "https://mempool.space/api"
        );
    }

    #[test]
    fn esplora_base_url() {
        assert_eq!(
            base_url(&ApiSource::Esplora),
            "https://blockstream.info/api"
        );
    }

    #[test]
    fn custom_base_url_strips_trailing_slash() {
        let source = ApiSource::Custom("http://localhost:3000/".to_string());
        assert_eq!(base_url(&source), "http://localhost:3000");
    }

    #[test]
    fn custom_base_url_no_trailing_slash() {
        let source = ApiSource::Custom("http://localhost:3000".to_string());
        assert_eq!(base_url(&source), "http://localhost:3000");
    }
}
