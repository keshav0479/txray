use crate::error::TxrayError;
use crate::tx::hash::dsha256;

/// Cap a CompactSize u64 value to a safe usize for block parsing.
fn safe_block_count(val: u64, remaining: usize, label: &str) -> Result<usize, TxrayError> {
    let count = val as usize;
    if count > remaining {
        return Err(TxrayError::invalid_block(format!(
            "{} count {} exceeds remaining data ({})",
            label, count, remaining
        )));
    }
    Ok(count)
}

/// Checked addition for block offsets - returns error instead of wrapping.
fn checked_offset(pos: usize, add: usize, limit: usize, label: &str) -> Result<usize, TxrayError> {
    let new_pos = pos
        .checked_add(add)
        .ok_or_else(|| TxrayError::invalid_block(format!("{}: offset overflow", label)))?;
    if new_pos > limit {
        return Err(TxrayError::invalid_block(format!(
            "{}: offset {} exceeds data length {}",
            label, new_pos, limit
        )));
    }
    Ok(new_pos)
}

/// Parsed block header (80 bytes)
#[derive(Debug, Clone)]
pub struct BlockHeader {
    pub version: i32,
    pub prev_block_hash: [u8; 32], // raw bytes (internal byte order)
    pub merkle_root: [u8; 32],     // raw bytes (internal byte order)
    pub timestamp: u32,
    pub bits: u32,
    pub nonce: u32,
    pub block_hash: [u8; 32], // raw bytes = dsha256(header_bytes)
    pub raw_header: [u8; 80],
}

/// A raw block extracted from blk*.dat
#[derive(Debug)]
pub struct RawBlock {
    pub header: BlockHeader,
    pub payload: Vec<u8>, // full block payload (header + all txs)
}

/// Parse the first block from a blk*.dat file.
/// Format: [magic: 4 bytes] [size: 4 bytes LE] [block_payload: size bytes]
pub fn parse_first_block(data: &[u8]) -> Result<RawBlock, TxrayError> {
    let magic = [0xf9, 0xbe, 0xb4, 0xd9];

    if data.len() < 8 {
        return Err(TxrayError::invalid_block("Block file too short"));
    }

    if data[0..4] != magic {
        return Err(TxrayError::invalid_block(format!(
            "Invalid magic bytes: {:02x}{:02x}{:02x}{:02x}",
            data[0], data[1], data[2], data[3]
        )));
    }

    let block_size = u32::from_le_bytes([data[4], data[5], data[6], data[7]]) as usize;

    if 8 + block_size > data.len() {
        return Err(TxrayError::invalid_block(
            "Block payload extends past end of file",
        ));
    }

    let block_data = &data[8..8 + block_size];

    // Parse 80-byte header
    if block_data.len() < 80 {
        return Err(TxrayError::invalid_block("Block too short for header"));
    }

    let mut raw_header = [0u8; 80];
    raw_header.copy_from_slice(&block_data[0..80]);

    let version = i32::from_le_bytes([block_data[0], block_data[1], block_data[2], block_data[3]]);

    let mut prev_block_hash = [0u8; 32];
    prev_block_hash.copy_from_slice(&block_data[4..36]);

    let mut merkle_root = [0u8; 32];
    merkle_root.copy_from_slice(&block_data[36..68]);

    let timestamp = u32::from_le_bytes([
        block_data[68],
        block_data[69],
        block_data[70],
        block_data[71],
    ]);
    let bits = u32::from_le_bytes([
        block_data[72],
        block_data[73],
        block_data[74],
        block_data[75],
    ]);
    let nonce = u32::from_le_bytes([
        block_data[76],
        block_data[77],
        block_data[78],
        block_data[79],
    ]);

    let block_hash = dsha256(&raw_header);

    let header = BlockHeader {
        version,
        prev_block_hash,
        merkle_root,
        timestamp,
        bits,
        nonce,
        block_hash,
        raw_header,
    };

    Ok(RawBlock {
        header,
        payload: block_data.to_vec(),
    })
}

/// Parse a raw block payload (no magic/size prefix).
/// Used for blocks fetched from APIs like mempool.space or Esplora.
pub fn parse_raw_block(data: &[u8]) -> Result<RawBlock, TxrayError> {
    if data.len() < 80 {
        return Err(TxrayError::invalid_block("Block too short for header"));
    }

    let mut raw_header = [0u8; 80];
    raw_header.copy_from_slice(&data[0..80]);

    let version = i32::from_le_bytes([data[0], data[1], data[2], data[3]]);

    let mut prev_block_hash = [0u8; 32];
    prev_block_hash.copy_from_slice(&data[4..36]);

    let mut merkle_root = [0u8; 32];
    merkle_root.copy_from_slice(&data[36..68]);

    let timestamp = u32::from_le_bytes([data[68], data[69], data[70], data[71]]);
    let bits = u32::from_le_bytes([data[72], data[73], data[74], data[75]]);
    let nonce = u32::from_le_bytes([data[76], data[77], data[78], data[79]]);

    let block_hash = dsha256(&raw_header);

    let header = BlockHeader {
        version,
        prev_block_hash,
        merkle_root,
        timestamp,
        bits,
        nonce,
        block_hash,
        raw_header,
    };

    Ok(RawBlock {
        header,
        payload: data.to_vec(),
    })
}

/// Parse ALL blocks from a blk*.dat file.
/// Format: repeated [magic: 4 bytes] [size: 4 bytes LE] [block_payload: size bytes]
pub fn parse_all_blocks(data: &[u8]) -> Result<Vec<RawBlock>, TxrayError> {
    let magic = [0xf9, 0xbe, 0xb4, 0xd9];
    let mut pos = 0;
    let mut blocks = Vec::new();

    while pos + 8 <= data.len() {
        if data[pos..pos + 4] != magic {
            return Err(TxrayError::invalid_block(format!(
                "Invalid magic bytes at offset {}: {:02x}{:02x}{:02x}{:02x}",
                pos,
                data[pos],
                data[pos + 1],
                data[pos + 2],
                data[pos + 3]
            )));
        }

        let block_size =
            u32::from_le_bytes([data[pos + 4], data[pos + 5], data[pos + 6], data[pos + 7]])
                as usize;
        pos += 8;

        if pos + block_size > data.len() {
            return Err(TxrayError::invalid_block(format!(
                "Block payload at offset {} extends past end of file (need {}, have {})",
                pos - 8,
                block_size,
                data.len() - pos
            )));
        }

        let block_data = &data[pos..pos + block_size];
        pos += block_size;

        if block_data.len() < 80 {
            return Err(TxrayError::invalid_block("Block too short for header"));
        }

        let mut raw_header = [0u8; 80];
        raw_header.copy_from_slice(&block_data[0..80]);

        let version =
            i32::from_le_bytes([block_data[0], block_data[1], block_data[2], block_data[3]]);

        let mut prev_block_hash = [0u8; 32];
        prev_block_hash.copy_from_slice(&block_data[4..36]);

        let mut merkle_root = [0u8; 32];
        merkle_root.copy_from_slice(&block_data[36..68]);

        let timestamp = u32::from_le_bytes([
            block_data[68],
            block_data[69],
            block_data[70],
            block_data[71],
        ]);
        let bits = u32::from_le_bytes([
            block_data[72],
            block_data[73],
            block_data[74],
            block_data[75],
        ]);
        let nonce = u32::from_le_bytes([
            block_data[76],
            block_data[77],
            block_data[78],
            block_data[79],
        ]);

        let block_hash = dsha256(&raw_header);

        let header = BlockHeader {
            version,
            prev_block_hash,
            merkle_root,
            timestamp,
            bits,
            nonce,
            block_hash,
            raw_header,
        };

        blocks.push(RawBlock {
            header,
            payload: block_data.to_vec(),
        });
    }

    if blocks.is_empty() {
        return Err(TxrayError::invalid_block("No valid blocks found in file"));
    }

    Ok(blocks)
}

/// Reversed hex string for display (standard Bitcoin convention)
pub fn reversed_hex(hash: &[u8; 32]) -> String {
    let mut reversed = *hash;
    reversed.reverse();
    hex::encode(reversed)
}

/// Bits field as hex string (8 chars)
pub fn bits_hex(bits: u32) -> String {
    format!("{:08x}", bits)
}

/// Parse all transactions from a block payload (after the 80-byte header).
/// Returns the raw bytes for each transaction so we can parse them individually.
pub fn extract_raw_transactions(block_payload: &[u8]) -> Result<Vec<Vec<u8>>, TxrayError> {
    if block_payload.len() < 81 {
        return Err(TxrayError::invalid_block(
            "Block too short for any transactions",
        ));
    }

    let mut pos = 80; // skip header

    // Read transaction count (CompactSize)
    let (tx_count_raw, bytes_read) = read_compact_size(&block_payload[pos..])?;
    pos += bytes_read;

    let tx_count = safe_block_count(
        tx_count_raw,
        block_payload.len().saturating_sub(pos),
        "tx_count",
    )?;

    let mut transactions = Vec::with_capacity(tx_count);

    for i in 0..tx_count {
        let tx_start = pos;

        // We need to scan through the transaction to find its end
        // Parse version (4 bytes)
        if pos + 4 > block_payload.len() {
            return Err(TxrayError::invalid_block(format!(
                "Transaction {} truncated at version",
                i
            )));
        }
        pos += 4;

        // Check for segwit marker
        let is_segwit = if pos + 2 <= block_payload.len()
            && block_payload[pos] == 0x00
            && block_payload[pos + 1] == 0x01
        {
            pos += 2; // skip marker + flag
            true
        } else {
            false
        };

        // Parse inputs
        let (input_count_raw, br) = read_compact_size(&block_payload[pos..])?;
        pos += br;
        let input_count = safe_block_count(
            input_count_raw,
            block_payload.len().saturating_sub(pos),
            "input_count",
        )?;

        for _ in 0..input_count {
            // txid (32) + vout (4)
            pos = checked_offset(pos, 36, block_payload.len(), "input txid+vout")?;
            // scriptSig
            let (script_len, br) = read_compact_size(&block_payload[pos..])?;
            let script_len = safe_block_count(
                script_len,
                block_payload.len().saturating_sub(pos + br),
                "scriptSig",
            )?;
            pos = checked_offset(pos, br + script_len, block_payload.len(), "scriptSig data")?;
            // sequence (4)
            pos = checked_offset(pos, 4, block_payload.len(), "input sequence")?;
        }

        // Parse outputs
        let (output_count_raw, br) = read_compact_size(&block_payload[pos..])?;
        pos += br;
        let output_count = safe_block_count(
            output_count_raw,
            block_payload.len().saturating_sub(pos),
            "output_count",
        )?;

        for _ in 0..output_count {
            // value (8)
            pos = checked_offset(pos, 8, block_payload.len(), "output value")?;
            // scriptPubKey
            let (script_len, br) = read_compact_size(&block_payload[pos..])?;
            let script_len = safe_block_count(
                script_len,
                block_payload.len().saturating_sub(pos + br),
                "scriptPubKey",
            )?;
            pos = checked_offset(
                pos,
                br + script_len,
                block_payload.len(),
                "scriptPubKey data",
            )?;
        }

        // Parse witness (if segwit)
        if is_segwit {
            for _ in 0..input_count {
                let (item_count_raw, br) = read_compact_size(&block_payload[pos..])?;
                pos += br;
                let item_count = safe_block_count(
                    item_count_raw,
                    block_payload.len().saturating_sub(pos),
                    "witness_item_count",
                )?;
                for _ in 0..item_count {
                    let (item_len, br) = read_compact_size(&block_payload[pos..])?;
                    let item_len = safe_block_count(
                        item_len,
                        block_payload.len().saturating_sub(pos + br),
                        "witness_item",
                    )?;
                    pos = checked_offset(pos, br + item_len, block_payload.len(), "witness data")?;
                }
            }
        }

        // locktime (4)
        pos = checked_offset(pos, 4, block_payload.len(), "locktime")?;

        if pos > block_payload.len() {
            return Err(TxrayError::invalid_block(format!(
                "Transaction {} extends past block boundary",
                i
            )));
        }

        transactions.push(block_payload[tx_start..pos].to_vec());
    }

    Ok(transactions)
}

/// Read CompactSize from a byte slice, returning (value, bytes_consumed)
fn read_compact_size(data: &[u8]) -> Result<(u64, usize), TxrayError> {
    if data.is_empty() {
        return Err(TxrayError::invalid_block(
            "Unexpected end of data reading CompactSize",
        ));
    }
    let first = data[0];
    match first {
        0..=0xfc => Ok((first as u64, 1)),
        0xfd => {
            if data.len() < 3 {
                return Err(TxrayError::invalid_block("CompactSize 0xfd too short"));
            }
            let val = u16::from_le_bytes([data[1], data[2]]) as u64;
            Ok((val, 3))
        }
        0xfe => {
            if data.len() < 5 {
                return Err(TxrayError::invalid_block("CompactSize 0xfe too short"));
            }
            let val = u32::from_le_bytes([data[1], data[2], data[3], data[4]]) as u64;
            Ok((val, 5))
        }
        0xff => {
            if data.len() < 9 {
                return Err(TxrayError::invalid_block("CompactSize 0xff too short"));
            }
            let val = u64::from_le_bytes([
                data[1], data[2], data[3], data[4], data[5], data[6], data[7], data[8],
            ]);
            Ok((val, 9))
        }
    }
}
