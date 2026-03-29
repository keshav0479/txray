// integration tests require network access, run with:
// cargo test -p txray-net -- --ignored

#[tokio::test]
#[ignore]
async fn fetch_genesis_block_from_mempool() {
    let bytes = txray_net::fetch_raw_block(
        &txray_net::ApiSource::MempoolSpace,
        &txray_net::BlockId::Height(0),
    )
    .await
    .unwrap();

    // genesis block is 285 bytes
    assert_eq!(bytes.len(), 285);
}

#[tokio::test]
#[ignore]
async fn fetch_genesis_block_from_esplora() {
    let bytes = txray_net::fetch_raw_block(
        &txray_net::ApiSource::Esplora,
        &txray_net::BlockId::Height(0),
    )
    .await
    .unwrap();

    assert_eq!(bytes.len(), 285);
}

#[tokio::test]
#[ignore]
async fn fetch_block_hash_height_0() {
    let hash = txray_net::fetch_block_hash(&txray_net::ApiSource::MempoolSpace, 0)
        .await
        .unwrap();

    assert_eq!(
        hash,
        "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f"
    );
}

#[tokio::test]
#[ignore]
async fn fetch_block_by_hash() {
    let genesis_hash = "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f";
    let bytes = txray_net::fetch_raw_block(
        &txray_net::ApiSource::MempoolSpace,
        &txray_net::BlockId::Hash(genesis_hash.to_string()),
    )
    .await
    .unwrap();

    assert_eq!(bytes.len(), 285);
}

#[tokio::test]
async fn invalid_txid_rejected() {
    let result =
        txray_net::fetch_raw_tx(&txray_net::ApiSource::MempoolSpace, "not_a_valid_txid").await;

    assert!(result.is_err());
}
