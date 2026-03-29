use crate::error::NetError;
use std::fs;
use std::path::PathBuf;

/// Returns the cache directory: ~/.txray/cache/
fn cache_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    PathBuf::from(home).join(".txray").join("cache")
}

/// Returns the cache file path for a given block hash.
fn cache_path(hash: &str) -> PathBuf {
    cache_dir().join(format!("{}.dat", hash))
}

/// Read cached block data if it exists.
pub fn read_cached(hash: &str) -> Option<Vec<u8>> {
    let path = cache_path(hash);
    fs::read(&path).ok()
}

/// Write block data to the cache directory.
pub fn write_cache(hash: &str, data: &[u8]) -> Result<(), NetError> {
    let dir = cache_dir();
    fs::create_dir_all(&dir).map_err(|e| {
        NetError::Cache(format!(
            "failed to create cache dir {}: {}",
            dir.display(),
            e
        ))
    })?;

    let path = cache_path(hash);
    fs::write(&path, data).map_err(|e| {
        NetError::Cache(format!(
            "failed to write cache file {}: {}",
            path.display(),
            e
        ))
    })?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cache_dir_contains_txray() {
        let dir = cache_dir();
        let dir_str = dir.to_string_lossy();
        assert!(
            dir_str.contains(".txray"),
            "cache dir should contain .txray"
        );
        assert!(
            dir_str.ends_with("cache"),
            "cache dir should end with cache"
        );
    }

    #[test]
    fn cache_path_uses_hash() {
        let path = cache_path("abc123");
        assert!(path.to_string_lossy().ends_with("abc123.dat"));
    }

    #[test]
    fn read_nonexistent_returns_none() {
        let result = read_cached("nonexistent_hash_000000");
        assert!(result.is_none());
    }

    #[test]
    fn write_and_read_cache() {
        let hash = "test_txray_net_cache_roundtrip";
        let data = b"test block data";
        write_cache(hash, data).unwrap();

        let cached = read_cached(hash);
        assert!(cached.is_some());
        assert_eq!(cached.unwrap(), data);

        // cleanup
        let path = cache_path(hash);
        let _ = fs::remove_file(path);
    }
}
