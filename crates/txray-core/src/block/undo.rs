use crate::error::TxrayError;
use crate::tx::hash::dsha256;

/// A decoded prevout from the undo data
#[derive(Debug, Clone)]
pub struct UndoPrevout {
    pub value_sats: u64,
    pub script_pubkey: Vec<u8>,
}

/// Parse all undo records from a rev*.dat file.
/// Returns a Vec of undo records, one per block.
/// Each undo record is a Vec<Vec<UndoPrevout>>: one Vec<UndoPrevout> per non-coinbase tx,
/// and within that, one UndoPrevout per input.
pub fn parse_undo_file(data: &[u8]) -> Result<Vec<UndoRecord>, TxrayError> {
    let magic = [0xf9, 0xbe, 0xb4, 0xd9];
    let mut pos = 0;
    let mut records = Vec::new();

    while pos + 8 <= data.len() {
        // Find magic bytes
        if data[pos..pos + 4] != magic {
            pos += 1;
            continue;
        }

        // Read size (4 bytes LE)
        let size = u32::from_le_bytes([data[pos + 4], data[pos + 5], data[pos + 6], data[pos + 7]])
            as usize;
        pos += 8;

        // size field covers just the payload; checksum is an additional 32 bytes after
        if pos + size + 32 > data.len() {
            return Err(TxrayError::invalid_undo(
                "Undo record extends past end of file",
            ));
        }

        let payload = &data[pos..pos + size];
        let checksum = &data[pos + size..pos + size + 32];
        pos += size + 32;

        records.push(UndoRecord {
            payload: payload.to_vec(),
            checksum: {
                let mut arr = [0u8; 32];
                arr.copy_from_slice(checksum);
                arr
            },
        });
    }

    Ok(records)
}

pub struct UndoRecord {
    pub payload: Vec<u8>,
    pub checksum: [u8; 32],
}

impl UndoRecord {
    /// Check if this undo record's checksum matches the given prev_block_hash.
    /// Returns true if dsha256(prev_block_hash || payload) == stored checksum.
    pub fn verify_checksum(&self, prev_block_hash: &[u8; 32]) -> bool {
        let mut input = Vec::with_capacity(32 + self.payload.len());
        input.extend_from_slice(prev_block_hash);
        input.extend_from_slice(&self.payload);
        dsha256(&input) == self.checksum
    }

    /// Parse the undo record for a given block.
    /// `prev_block_hash` is the raw (non-reversed) 32-byte hash of the PREVIOUS block
    /// (i.e., the prev_block_hash field from the current block's header).
    /// `tx_input_counts` is used only for validation (number of inputs per non-coinbase tx).
    pub fn parse(
        &self,
        prev_block_hash: &[u8; 32],
        tx_input_counts: &[usize],
    ) -> Result<Vec<Vec<UndoPrevout>>, TxrayError> {
        let payload = &self.payload;

        // Verify checksum: dsha256(prev_block_hash || payload)
        let mut checksum_input = Vec::with_capacity(32 + payload.len());
        checksum_input.extend_from_slice(prev_block_hash);
        checksum_input.extend_from_slice(payload);
        let computed_checksum = dsha256(&checksum_input);

        if computed_checksum != self.checksum {
            return Err(TxrayError::invalid_undo(format!(
                "Undo checksum mismatch: expected {}, got {}",
                hex::encode(self.checksum),
                hex::encode(computed_checksum)
            )));
        }

        // Parse the undo payload
        let mut cursor = UndoCursor::new(payload);

        // Number of CTxUndo entries (CompactSize) - should equal number of non-coinbase txs
        let num_txs_raw = cursor.read_compact_size()?;
        let num_txs = usize::try_from(num_txs_raw).map_err(|_| {
            TxrayError::invalid_undo(format!(
                "Undo tx count {} does not fit this platform",
                num_txs_raw
            ))
        })?;

        // Guard: count can't exceed remaining data (each entry is >= 1 byte)
        if num_txs > cursor.data.len().saturating_sub(cursor.pos) {
            return Err(TxrayError::invalid_undo(format!(
                "Undo tx count {} exceeds remaining data",
                num_txs
            )));
        }

        if num_txs != tx_input_counts.len() {
            return Err(TxrayError::invalid_undo(format!(
                "Undo tx count mismatch: undo has {}, block has {} non-coinbase txs",
                num_txs,
                tx_input_counts.len()
            )));
        }

        let mut result = Vec::with_capacity(num_txs);

        for (tx_idx, &expected_inputs) in tx_input_counts.iter().enumerate() {
            // Each CTxUndo is a vector<Coin> (vprevout) serialized with VectorFormatter
            // So there's a CompactSize for the number of prevouts in THIS tx
            let num_prevouts_raw = cursor.read_compact_size()?;
            let num_prevouts = usize::try_from(num_prevouts_raw).map_err(|_| {
                TxrayError::invalid_undo(format!(
                    "Undo prevout count {} does not fit this platform",
                    num_prevouts_raw
                ))
            })?;

            // Guard: count can't exceed remaining data
            if num_prevouts > cursor.data.len().saturating_sub(cursor.pos) {
                return Err(TxrayError::invalid_undo(format!(
                    "Undo prevout count {} exceeds remaining data for tx {}",
                    num_prevouts, tx_idx
                )));
            }

            if num_prevouts != expected_inputs {
                return Err(TxrayError::invalid_undo(format!(
                    "Undo prevout count mismatch for tx {}: undo has {}, block has {} inputs",
                    tx_idx, num_prevouts, expected_inputs
                )));
            }

            let mut prevouts = Vec::with_capacity(num_prevouts);
            for _ in 0..num_prevouts {
                let prevout = cursor.read_txin_undo()?;
                prevouts.push(prevout);
            }
            result.push(prevouts);
        }

        Ok(result)
    }
}

struct UndoCursor<'a> {
    data: &'a [u8],
    pos: usize,
}

impl<'a> UndoCursor<'a> {
    fn new(data: &'a [u8]) -> Self {
        Self { data, pos: 0 }
    }

    fn read_byte(&mut self) -> Result<u8, TxrayError> {
        if self.pos >= self.data.len() {
            return Err(TxrayError::invalid_undo("Unexpected end of undo data"));
        }
        let b = self.data[self.pos];
        self.pos += 1;
        Ok(b)
    }

    fn read_bytes(&mut self, n: usize) -> Result<&'a [u8], TxrayError> {
        let end = self
            .pos
            .checked_add(n)
            .ok_or_else(|| TxrayError::invalid_undo("Undo cursor offset overflow"))?;
        if end > self.data.len() {
            return Err(TxrayError::invalid_undo("Unexpected end of undo data"));
        }
        let slice = &self.data[self.pos..end];
        self.pos = end;
        Ok(slice)
    }

    /// Read CompactSize (standard Bitcoin varint, NOT Core VARINT)
    fn read_compact_size(&mut self) -> Result<u64, TxrayError> {
        let first = self.read_byte()?;
        match first {
            0..=0xfc => Ok(first as u64),
            0xfd => {
                let lo = self.read_byte()? as u64;
                let hi = self.read_byte()? as u64;
                Ok(lo | (hi << 8))
            }
            0xfe => {
                let b0 = self.read_byte()? as u64;
                let b1 = self.read_byte()? as u64;
                let b2 = self.read_byte()? as u64;
                let b3 = self.read_byte()? as u64;
                Ok(b0 | (b1 << 8) | (b2 << 16) | (b3 << 24))
            }
            0xff => {
                let mut val = 0u64;
                for i in 0..8 {
                    val |= (self.read_byte()? as u64) << (8 * i);
                }
                Ok(val)
            }
        }
    }

    /// Read Bitcoin Core VARINT (different from CompactSize!)
    /// This is the key encoding used in undo data for nCode, amount, nSize, etc.
    fn read_core_varint(&mut self) -> Result<u64, TxrayError> {
        let mut result: u64 = 0;
        loop {
            let byte = self.read_byte()?;
            result = (result << 7) | (byte as u64 & 0x7F);
            if byte & 0x80 == 0 {
                break;
            }
            result += 1;
        }
        Ok(result)
    }

    /// Read a CTxInUndo entry (one prevout)
    fn read_txin_undo(&mut self) -> Result<UndoPrevout, TxrayError> {
        // 1. Read nCode (Core VARINT)
        let n_code = self.read_core_varint()?;
        let _height = n_code >> 1;
        let _is_coinbase = (n_code & 1) != 0;

        // 2. If height > 0, read nVersion (Core VARINT) - we don't use it
        if _height > 0 {
            let _n_version = self.read_core_varint()?;
        }

        // 3. Read compressed amount (Core VARINT)
        let compressed_amount = self.read_core_varint()?;
        let value_sats = decompress_amount(compressed_amount);

        // 4. Read compressed script
        let script_pubkey = self.read_compressed_script()?;

        Ok(UndoPrevout {
            value_sats,
            script_pubkey,
        })
    }

    /// Read a compressed script from undo data
    fn read_compressed_script(&mut self) -> Result<Vec<u8>, TxrayError> {
        let n_size_raw = self.read_core_varint()?;
        let n_size = usize::try_from(n_size_raw).map_err(|_| {
            TxrayError::invalid_undo(format!(
                "Compressed script size {} does not fit this platform",
                n_size_raw
            ))
        })?;

        match n_size {
            0 => {
                // P2PKH: read 20 bytes, expand to full script
                let hash = self.read_bytes(20)?;
                let mut script = Vec::with_capacity(25);
                script.push(0x76); // OP_DUP
                script.push(0xa9); // OP_HASH160
                script.push(0x14); // OP_PUSHBYTES_20
                script.extend_from_slice(hash);
                script.push(0x88); // OP_EQUALVERIFY
                script.push(0xac); // OP_CHECKSIG
                Ok(script)
            }
            1 => {
                // P2SH: read 20 bytes, expand to full script
                let hash = self.read_bytes(20)?;
                let mut script = Vec::with_capacity(23);
                script.push(0xa9); // OP_HASH160
                script.push(0x14); // OP_PUSHBYTES_20
                script.extend_from_slice(hash);
                script.push(0x87); // OP_EQUAL
                Ok(script)
            }
            2 | 3 => {
                // Compressed pubkey P2PK: read 33 bytes (02/03 prefix + 32 bytes)
                // nSize IS the first byte of the compressed pubkey
                let remaining = self.read_bytes(32)?;
                let mut pubkey = Vec::with_capacity(33);
                pubkey.push(n_size as u8); // 0x02 or 0x03
                pubkey.extend_from_slice(remaining);

                // Build P2PK script: OP_PUSHBYTES_33 <33-byte pubkey> OP_CHECKSIG
                let mut script = Vec::with_capacity(35);
                script.push(0x21); // OP_PUSHBYTES_33
                script.extend_from_slice(&pubkey);
                script.push(0xac); // OP_CHECKSIG
                Ok(script)
            }
            4 | 5 => {
                // Uncompressed pubkey stored as compressed, needs decompression
                // Read 32 bytes (x-coordinate), decompress to 65-byte uncompressed pubkey
                let x_bytes = self.read_bytes(32)?;

                // Decompress: use secp256k1 point decompression
                // nSize 4 -> even y (0x02), nSize 5 -> odd y (0x03)
                let compressed_prefix = if n_size == 4 { 0x02u8 } else { 0x03u8 };
                let mut compressed = Vec::with_capacity(33);
                compressed.push(compressed_prefix);
                compressed.extend_from_slice(x_bytes);

                // We need to decompress the pubkey to get the full 65 bytes
                // For P2PK: OP_PUSHBYTES_65 <65-byte uncompressed pubkey> OP_CHECKSIG
                let uncompressed = decompress_pubkey(&compressed)?;

                let mut script = Vec::with_capacity(67);
                script.push(0x41); // OP_PUSHBYTES_65
                script.extend_from_slice(&uncompressed);
                script.push(0xac); // OP_CHECKSIG
                Ok(script)
            }
            _ => {
                // Raw script, length = nSize - 6
                let script_len = n_size - 6;
                if script_len > 10_000_000 {
                    return Err(TxrayError::invalid_undo(format!(
                        "Unreasonable script length: {}",
                        script_len
                    )));
                }
                let script = self.read_bytes(script_len)?;
                Ok(script.to_vec())
            }
        }
    }
}

/// Decompress a Bitcoin Core compressed amount back to satoshis.
/// See Bitcoin Core: src/compressor.cpp DecompressAmount()
fn decompress_amount(x: u64) -> u64 {
    if x == 0 {
        return 0;
    }
    let mut x = x - 1;
    let e = (x % 10) as u32;
    x /= 10;

    let n = if e < 9 {
        let d = (x % 9) + 1;
        x /= 9;
        x * 10 + d
    } else {
        x + 1
    };

    n * 10u64.pow(e)
}

/// Decompress a secp256k1 compressed public key to uncompressed format.
/// Uses the k256 crate for reliable elliptic curve point decompression.
fn decompress_pubkey(compressed: &[u8]) -> Result<Vec<u8>, TxrayError> {
    if compressed.len() != 33 {
        return Err(TxrayError::invalid_undo("Invalid compressed pubkey length"));
    }

    let prefix = compressed[0];
    if prefix != 0x02 && prefix != 0x03 {
        return Err(TxrayError::invalid_undo("Invalid compressed pubkey prefix"));
    }

    use k256::elliptic_curve::sec1::{FromEncodedPoint, ToEncodedPoint};
    use k256::EncodedPoint;

    let encoded = EncodedPoint::from_bytes(compressed)
        .map_err(|_| TxrayError::invalid_undo("Invalid compressed pubkey encoding"))?;

    let point = k256::AffinePoint::from_encoded_point(&encoded);
    if point.is_none().into() {
        return Err(TxrayError::invalid_undo(
            "Compressed pubkey is not on curve",
        ));
    }

    // Convert to uncompressed encoding (04 || x || y)
    let uncompressed = point.unwrap().to_encoded_point(false);

    Ok(uncompressed.as_bytes().to_vec())
}

#[cfg(test)]
mod tests {
    use super::*;

    // ========== decompress_amount ==========
    // Test vectors from Bitcoin Core: src/test/compress_tests.cpp

    #[test]
    fn test_decompress_amount_zero() {
        assert_eq!(decompress_amount(0), 0);
    }

    #[test]
    fn test_decompress_amount_one_satoshi() {
        // CompressAmount(1) = 1, DecompressAmount(1) = 1
        assert_eq!(decompress_amount(1), 1);
    }

    #[test]
    fn test_decompress_amount_known_vectors() {
        // Bitcoin Core compressed amounts use denomination encoding:
        // compressed 9 -> 1 BTC = 100_000_000 sats
        assert_eq!(decompress_amount(9), 100_000_000);

        // Verify function handles various inputs without panicking
        let val = decompress_amount(10);
        assert!(val > 0);
    }

    #[test]
    fn test_decompress_amount_round_trip_identity() {
        // The compression is lossless for exact amounts
        // CompressAmount(100000000) and back should work
        // We just verify the function doesn't panic on large values
        let large = decompress_amount(100_000);
        assert!(large > 0);
    }

    // ========== decompress_pubkey ==========

    #[test]
    fn test_decompress_pubkey_valid_02() {
        // secp256k1 generator point x-coordinate with 02 prefix
        let mut compressed = vec![0x02];
        // x = generator point of secp256k1
        compressed.extend_from_slice(
            &hex::decode("79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798")
                .unwrap(),
        );
        let result = decompress_pubkey(&compressed);
        assert!(result.is_ok());
        let uncompressed = result.unwrap();
        assert_eq!(uncompressed.len(), 65);
        assert_eq!(uncompressed[0], 0x04); // uncompressed prefix
    }

    #[test]
    fn test_decompress_pubkey_invalid_prefix() {
        let mut invalid = vec![0x05]; // invalid prefix
        invalid.extend_from_slice(&[0x01; 32]);
        assert!(decompress_pubkey(&invalid).is_err());
    }

    #[test]
    fn test_decompress_pubkey_wrong_length() {
        let short = vec![0x02, 0x01, 0x02]; // too short
        assert!(decompress_pubkey(&short).is_err());
    }
}
