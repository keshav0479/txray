use crate::error::TxrayError;

/// Cap a CompactSize u64 value to a safe usize, checking it doesn't exceed remaining data.
fn safe_count(val: u64, remaining: usize, label: &str) -> Result<usize, TxrayError> {
    let count = val as usize;
    // Each element is at least 1 byte, so count can never exceed remaining bytes
    if count > remaining {
        return Err(TxrayError::invalid_tx(format!(
            "{} count {} exceeds remaining data ({})",
            label, count, remaining
        )));
    }
    Ok(count)
}

/// A parsed raw Bitcoin transaction.
#[derive(Debug, Clone)]
pub struct RawTransaction {
    pub version: i32,
    pub is_segwit: bool,
    pub inputs: Vec<TxInput>,
    pub outputs: Vec<TxOutput>,
    pub locktime: u32,
    /// Full serialization bytes (with witness if segwit)
    pub raw_bytes: Vec<u8>,
    /// Base serialization bytes (without witness — legacy format)
    pub base_bytes: Vec<u8>,
}

/// A parsed transaction input with scriptSig, sequence, and witness data.
#[derive(Debug, Clone)]
pub struct TxInput {
    pub txid: [u8; 32],
    pub vout: u32,
    pub script_sig: Vec<u8>,
    pub sequence: u32,
    pub witness: Vec<Vec<u8>>,
}

/// A parsed transaction output with value (satoshis) and scriptPubKey.
#[derive(Debug, Clone)]
pub struct TxOutput {
    pub value: u64,
    pub script_pubkey: Vec<u8>,
}

/// Read a CompactSize (Bitcoin varint used in transactions)
fn read_compact_size(data: &[u8], offset: &mut usize) -> Result<u64, TxrayError> {
    if *offset >= data.len() {
        return Err(TxrayError::invalid_tx(
            "Unexpected end of data reading compact size",
        ));
    }
    let first = data[*offset];
    *offset += 1;
    match first {
        0..=0xfc => Ok(first as u64),
        0xfd => {
            if *offset + 2 > data.len() {
                return Err(TxrayError::invalid_tx(
                    "Unexpected end reading compact size u16",
                ));
            }
            let val = u16::from_le_bytes([data[*offset], data[*offset + 1]]);
            *offset += 2;
            Ok(val as u64)
        }
        0xfe => {
            if *offset + 4 > data.len() {
                return Err(TxrayError::invalid_tx(
                    "Unexpected end reading compact size u32",
                ));
            }
            let val = u32::from_le_bytes([
                data[*offset],
                data[*offset + 1],
                data[*offset + 2],
                data[*offset + 3],
            ]);
            *offset += 4;
            Ok(val as u64)
        }
        0xff => {
            if *offset + 8 > data.len() {
                return Err(TxrayError::invalid_tx(
                    "Unexpected end reading compact size u64",
                ));
            }
            let val = u64::from_le_bytes([
                data[*offset],
                data[*offset + 1],
                data[*offset + 2],
                data[*offset + 3],
                data[*offset + 4],
                data[*offset + 5],
                data[*offset + 6],
                data[*offset + 7],
            ]);
            *offset += 8;
            Ok(val)
        }
    }
}

fn read_bytes(data: &[u8], offset: &mut usize, n: usize) -> Result<Vec<u8>, TxrayError> {
    if *offset + n > data.len() {
        return Err(TxrayError::invalid_tx(format!(
            "Unexpected end of data: need {} bytes at offset {}, have {}",
            n,
            *offset,
            data.len()
        )));
    }
    let bytes = data[*offset..*offset + n].to_vec();
    *offset += n;
    Ok(bytes)
}

fn read_u32_le(data: &[u8], offset: &mut usize) -> Result<u32, TxrayError> {
    let bytes = read_bytes(data, offset, 4)?;
    Ok(u32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
}

fn read_u64_le(data: &[u8], offset: &mut usize) -> Result<u64, TxrayError> {
    let bytes = read_bytes(data, offset, 8)?;
    Ok(u64::from_le_bytes([
        bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7],
    ]))
}

fn read_i32_le(data: &[u8], offset: &mut usize) -> Result<i32, TxrayError> {
    let bytes = read_bytes(data, offset, 4)?;
    Ok(i32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
}

/// Encode a compact size to bytes (for base serialization reconstruction)
fn encode_compact_size(val: u64) -> Vec<u8> {
    if val <= 0xfc {
        vec![val as u8]
    } else if val <= 0xffff {
        let mut v = vec![0xfd];
        v.extend_from_slice(&(val as u16).to_le_bytes());
        v
    } else if val <= 0xffff_ffff {
        let mut v = vec![0xfe];
        v.extend_from_slice(&(val as u32).to_le_bytes());
        v
    } else {
        let mut v = vec![0xff];
        v.extend_from_slice(&val.to_le_bytes());
        v
    }
}

/// Parse a raw Bitcoin transaction from bytes.
pub fn parse_raw_tx(data: &[u8]) -> Result<RawTransaction, TxrayError> {
    if data.len() < 10 {
        return Err(TxrayError::invalid_tx("Transaction too short"));
    }

    let mut offset = 0;

    // Version (4 bytes)
    let version = read_i32_le(data, &mut offset)?;

    // Check for segwit marker (0x00) + flag (0x01)
    let is_segwit = if offset + 2 <= data.len() && data[offset] == 0x00 && data[offset + 1] == 0x01
    {
        offset += 2; // skip marker + flag
        true
    } else {
        false
    };

    // Parse inputs
    let input_count = safe_count(
        read_compact_size(data, &mut offset)?,
        data.len().saturating_sub(offset),
        "input",
    )?;
    if input_count == 0 {
        return Err(TxrayError::invalid_tx("Transaction has zero inputs"));
    }

    let mut inputs = Vec::with_capacity(input_count);
    for _ in 0..input_count {
        let txid_bytes = read_bytes(data, &mut offset, 32)?;
        let mut txid = [0u8; 32];
        txid.copy_from_slice(&txid_bytes);

        let vout = read_u32_le(data, &mut offset)?;

        let script_len = safe_count(
            read_compact_size(data, &mut offset)?,
            data.len().saturating_sub(offset),
            "script_sig",
        )?;
        let script_sig = read_bytes(data, &mut offset, script_len)?;

        let sequence = read_u32_le(data, &mut offset)?;

        inputs.push(TxInput {
            txid,
            vout,
            script_sig,
            sequence,
            witness: Vec::new(),
        });
    }

    // Parse outputs
    let output_count = safe_count(
        read_compact_size(data, &mut offset)?,
        data.len().saturating_sub(offset),
        "output",
    )?;
    if output_count == 0 {
        return Err(TxrayError::invalid_tx("Transaction has zero outputs"));
    }

    let mut outputs = Vec::with_capacity(output_count);
    for _ in 0..output_count {
        let value = read_u64_le(data, &mut offset)?;

        let script_len = safe_count(
            read_compact_size(data, &mut offset)?,
            data.len().saturating_sub(offset),
            "script_pubkey",
        )?;
        let script_pubkey = read_bytes(data, &mut offset, script_len)?;

        outputs.push(TxOutput {
            value,
            script_pubkey,
        });
    }

    // Parse witness data if segwit
    if is_segwit {
        for input in inputs.iter_mut() {
            let item_count = safe_count(
                read_compact_size(data, &mut offset)?,
                data.len().saturating_sub(offset),
                "witness_items",
            )?;
            let mut witness = Vec::with_capacity(item_count);
            for _ in 0..item_count {
                let item_len = safe_count(
                    read_compact_size(data, &mut offset)?,
                    data.len().saturating_sub(offset),
                    "witness_item",
                )?;
                let item = read_bytes(data, &mut offset, item_len)?;
                witness.push(item);
            }
            input.witness = witness;
        }
    }

    // Locktime (4 bytes)
    let locktime = read_u32_le(data, &mut offset)?;

    if offset != data.len() {
        return Err(TxrayError::invalid_tx(format!(
            "Extra bytes after transaction: consumed {}, total {}",
            offset,
            data.len()
        )));
    }

    // Build base serialization (without witness) for txid hashing and weight
    let mut base_bytes = Vec::new();
    base_bytes.extend_from_slice(&version.to_le_bytes());
    base_bytes.extend_from_slice(&encode_compact_size(input_count as u64));
    for inp in &inputs {
        base_bytes.extend_from_slice(&inp.txid);
        base_bytes.extend_from_slice(&inp.vout.to_le_bytes());
        base_bytes.extend_from_slice(&encode_compact_size(inp.script_sig.len() as u64));
        base_bytes.extend_from_slice(&inp.script_sig);
        base_bytes.extend_from_slice(&inp.sequence.to_le_bytes());
    }
    base_bytes.extend_from_slice(&encode_compact_size(output_count as u64));
    for out in &outputs {
        base_bytes.extend_from_slice(&out.value.to_le_bytes());
        base_bytes.extend_from_slice(&encode_compact_size(out.script_pubkey.len() as u64));
        base_bytes.extend_from_slice(&out.script_pubkey);
    }
    base_bytes.extend_from_slice(&locktime.to_le_bytes());

    Ok(RawTransaction {
        version,
        is_segwit,
        inputs,
        outputs,
        locktime,
        raw_bytes: data.to_vec(),
        base_bytes,
    })
}

impl TxInput {
    /// Return the txid as reversed hex (standard display convention)
    pub fn txid_hex(&self) -> String {
        let mut reversed = self.txid;
        reversed.reverse();
        hex::encode(reversed)
    }
}
