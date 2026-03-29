//! # txray-corpus
//!
//! Curated corpus of historically significant Bitcoin blocks.
//! Provides metadata, educational annotations, and lookup functions
//! for 8 famous blocks that demonstrate key Bitcoin concepts.

/// A historically significant Bitcoin block with educational annotations.
#[derive(Debug, Clone)]
pub struct FamousBlock {
    /// Short name (e.g. "Genesis Block")
    pub name: &'static str,
    /// Block height
    pub height: u64,
    /// Block hash (hex, little-endian display order)
    pub hash: &'static str,
    /// One-line description
    pub description: &'static str,
    /// Why this block is interesting for analysis
    pub why_interesting: &'static str,
    /// Specific things to look for when parsing this block
    pub what_to_look_for: &'static [&'static str],
}

/// The 8 famous blocks in the corpus.
pub const FAMOUS_BLOCKS: &[FamousBlock] = &[
    FamousBlock {
        name: "Genesis Block",
        height: 0,
        hash: "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
        description: "The first Bitcoin block, mined by Satoshi Nakamoto on 2009-01-03",
        why_interesting: "Contains the embedded Times headline. The 50 BTC coinbase reward is unspendable due to a quirk in the original code.",
        what_to_look_for: &[
            "The coinbase scriptSig contains 'The Times 03/Jan/2009 Chancellor on brink of second bailout for banks'",
            "Only 1 transaction (the coinbase)",
            "Previous block hash is all zeros",
            "The 50 BTC output is unspendable",
        ],
    },
    FamousBlock {
        name: "First Transaction",
        height: 170,
        hash: "00000000d1145790a8694403d4063f323d499e655c83426834d4ce2f8dd4a2ee",
        description: "Block containing the first person-to-person Bitcoin transaction: Satoshi to Hal Finney",
        why_interesting: "The first real P2P Bitcoin transfer. Satoshi sent 10 BTC to Hal Finney using a raw P2PK (pay-to-public-key) script, not P2PKH.",
        what_to_look_for: &[
            "Two transactions: coinbase + the Satoshi-to-Hal transfer",
            "The transfer uses P2PK (raw public key in output script), not P2PKH",
            "10 BTC sent, 40 BTC change back to Satoshi",
        ],
    },
    FamousBlock {
        name: "Pizza Transaction",
        height: 57043,
        hash: "00000000152340ca42227603908689183edc47355204e7aca29571e22f4395e9",
        description: "Block containing the famous 10,000 BTC pizza purchase by Laszlo Hanyecz",
        why_interesting: "The first known commercial Bitcoin transaction. Laszlo paid 10,000 BTC for two pizzas, establishing Bitcoin's first real-world exchange rate.",
        what_to_look_for: &[
            "Look for the transaction spending 10,000 BTC",
            "This established the first BTC/USD exchange rate (~$0.003 per BTC)",
            "May 22 is now celebrated as Bitcoin Pizza Day",
        ],
    },
    FamousBlock {
        name: "First OP_RETURN",
        height: 252490,
        hash: "000000000000000a5e2add4620a3b8e29c62c3f38c917b6cfa1e1c8d9cce278e",
        description: "One of the earliest blocks with OP_RETURN data embedding",
        why_interesting: "OP_RETURN was standardized in Bitcoin Core 0.9.0 (March 2014) to provide a clean way to embed data without polluting the UTXO set.",
        what_to_look_for: &[
            "Look for outputs with OP_RETURN (0x6a) as the first opcode",
            "OP_RETURN outputs are provably unspendable",
            "Data is typically protocol identifiers (Omni, OpenTimestamps, etc.)",
        ],
    },
    FamousBlock {
        name: "SegWit Activation",
        height: 481824,
        hash: "0000000000000000001c8018d9cb3b742ef25114f27563e3fc4a1902167f9893",
        description: "The first block enforcing Segregated Witness (BIP141) rules",
        why_interesting: "SegWit separated signature data from transaction data, enabling the Lightning Network and fixing transaction malleability. This block marks the activation.",
        what_to_look_for: &[
            "Look for transactions with witness data (segwit flag 0x0001 after version)",
            "Compare weight vs size to see the segwit discount in action",
            "P2WPKH and P2WSH outputs start appearing",
            "The coinbase must include the witness commitment",
        ],
    },
    FamousBlock {
        name: "Largest Transaction",
        height: 484986,
        hash: "0000000000000000001de87baa5bed42e6dff0e4e8b2dd57f8dd290fef4fa402",
        description: "Contains one of the largest transactions ever in terms of size",
        why_interesting: "A stress test transaction that pushed the limits of block space. Demonstrates how transaction size, weight, and fees interact at scale.",
        what_to_look_for: &[
            "Look for transactions with unusually high input or output counts",
            "Compare the weight of this block to typical blocks",
            "Fee rates may be unusual due to the large transaction",
        ],
    },
    FamousBlock {
        name: "Wasabi CoinJoin",
        height: 530484,
        hash: "0000000000000000001e481a85c07b73e8a97428d07aee4dbb0a37143e10f535",
        description: "An early block containing Wasabi Wallet CoinJoin transactions",
        why_interesting: "CoinJoin transactions combine multiple users' inputs and create equal-value outputs, breaking the common-input-ownership heuristic and improving privacy.",
        what_to_look_for: &[
            "Look for transactions with many inputs and many equal-value outputs",
            "Equal outputs make it impossible to trace which input paid which output",
            "The CIOH heuristic should NOT flag CoinJoin inputs as same-owner",
            "Boltzmann entropy should be high for these transactions",
        ],
    },
    FamousBlock {
        name: "First Taproot Spends",
        height: 709635,
        hash: "0000000000000000000687bca986194dc2c1f68e3ef29c24a3e3a20aaff3e95f",
        description: "The first block with real Taproot (P2TR) key-path spends",
        why_interesting: "Taproot (BIP341) activated at block 709,632. This block contains some of the earliest real P2TR spends, showing the new script type in action.",
        what_to_look_for: &[
            "Look for P2TR outputs (OP_1 <32-byte-key>)",
            "Key-path spends have a single 64-byte Schnorr signature in the witness",
            "Compare P2TR witness size to P2WPKH to see efficiency gains",
        ],
    },
];

/// Return all famous blocks in the corpus.
pub fn list_famous() -> &'static [FamousBlock] {
    FAMOUS_BLOCKS
}

/// Find a famous block by name (case-insensitive substring match).
pub fn find_by_name(query: &str) -> Option<&'static FamousBlock> {
    let q = query.to_ascii_lowercase();
    FAMOUS_BLOCKS
        .iter()
        .find(|b| b.name.to_ascii_lowercase().contains(&q))
}

/// Find a famous block by exact height.
pub fn find_by_height(height: u64) -> Option<&'static FamousBlock> {
    FAMOUS_BLOCKS.iter().find(|b| b.height == height)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn list_returns_8_blocks() {
        assert_eq!(list_famous().len(), 8);
    }

    #[test]
    fn all_blocks_have_64_char_hash() {
        for block in list_famous() {
            assert_eq!(block.hash.len(), 64, "bad hash length for {}", block.name);
        }
    }

    #[test]
    fn find_genesis_by_name() {
        let found = find_by_name("genesis").unwrap();
        assert_eq!(found.height, 0);
        assert_eq!(found.name, "Genesis Block");
    }

    #[test]
    fn find_by_name_case_insensitive() {
        let found = find_by_name("PIZZA").unwrap();
        assert_eq!(found.height, 57043);
    }

    #[test]
    fn find_by_name_partial_match() {
        let found = find_by_name("taproot").unwrap();
        assert_eq!(found.height, 709635);
    }

    #[test]
    fn find_by_name_returns_none_for_unknown() {
        assert!(find_by_name("nonexistent block xyz").is_none());
    }

    #[test]
    fn find_genesis_by_height() {
        let found = find_by_height(0).unwrap();
        assert_eq!(found.name, "Genesis Block");
    }

    #[test]
    fn find_segwit_by_height() {
        let found = find_by_height(481824).unwrap();
        assert_eq!(found.name, "SegWit Activation");
    }

    #[test]
    fn find_by_height_returns_none_for_unknown() {
        assert!(find_by_height(999999999).is_none());
    }

    #[test]
    fn all_blocks_have_what_to_look_for() {
        for block in list_famous() {
            assert!(
                !block.what_to_look_for.is_empty(),
                "{} has no what_to_look_for",
                block.name
            );
        }
    }

    #[test]
    fn heights_are_ordered() {
        let heights: Vec<u64> = list_famous().iter().map(|b| b.height).collect();
        for window in heights.windows(2) {
            assert!(window[0] < window[1], "blocks should be in height order");
        }
    }
}
