use bitcoin::psbt::Psbt;
/// PSBT (BIP-174) construction.
///
/// Strategy: `witness_utxo` for ALL input types (including p2pkh).
/// Fixtures don't provide full prev-tx, so `non_witness_utxo` is impossible.
/// `witness_utxo` gives (value, scriptPubKey) which is the essential info.
use bitcoin::{
    absolute::LockTime, transaction, Amount, OutPoint, ScriptBuf, Sequence, Transaction, TxIn,
    TxOut, Txid,
};

use crate::coin_selection::CoinSelectionResult;
use crate::error::BuilderError;
use crate::fixture::Fixture;
use crate::transaction::TxParams;

/// An output entry for the transaction.
#[derive(Debug, Clone)]
pub struct OutputEntry {
    pub value_sats: u64,
    pub script_pubkey_hex: String,
    /// Display-only script type (from fixture, NOT used for logic).
    pub script_type: String,
    pub address: Option<String>,
    pub is_change: bool,
}

/// Build a PSBT from the coin selection result, outputs, and tx params.
///
/// Returns the base64-encoded PSBT string.
pub fn build_psbt(
    selection: &CoinSelectionResult,
    outputs: &[OutputEntry],
    tx_params: &TxParams,
) -> Result<String, BuilderError> {
    // Build unsigned transaction inputs
    let mut tx_inputs: Vec<TxIn> = Vec::with_capacity(selection.selected_utxos.len());
    for utxo in &selection.selected_utxos {
        let txid: Txid = utxo
            .txid
            .parse()
            .map_err(|e| BuilderError::internal(format!("Invalid txid: {e}")))?;
        tx_inputs.push(TxIn {
            previous_output: OutPoint {
                txid,
                vout: utxo.vout,
            },
            script_sig: ScriptBuf::new(), // unsigned — empty
            sequence: Sequence(tx_params.n_sequence),
            witness: bitcoin::Witness::default(), // empty
        });
    }

    // Build unsigned transaction outputs
    let mut tx_outputs: Vec<TxOut> = Vec::with_capacity(outputs.len());
    for out in outputs {
        let spk_bytes = hex::decode(&out.script_pubkey_hex)
            .map_err(|e| BuilderError::internal(format!("Bad output hex: {e}")))?;
        tx_outputs.push(TxOut {
            value: Amount::from_sat(out.value_sats),
            script_pubkey: ScriptBuf::from_bytes(spk_bytes),
        });
    }

    // Assemble unsigned transaction
    let unsigned_tx = Transaction {
        version: transaction::Version::TWO,
        lock_time: LockTime::from_consensus(tx_params.n_lock_time),
        input: tx_inputs,
        output: tx_outputs,
    };

    // Wrap in PSBT
    let mut psbt = Psbt::from_unsigned_tx(unsigned_tx)
        .map_err(|e| BuilderError::internal(format!("PSBT creation failed: {e}")))?;

    // Set witness_utxo for ALL inputs (value + scriptPubKey)
    // This applies to segwit AND legacy (p2pkh) inputs.
    for (i, utxo) in selection.selected_utxos.iter().enumerate() {
        let spk_bytes = hex::decode(&utxo.script_pubkey_hex)
            .map_err(|e| BuilderError::internal(format!("Bad input hex: {e}")))?;
        let txout = TxOut {
            value: Amount::from_sat(utxo.value_sats),
            script_pubkey: ScriptBuf::from_bytes(spk_bytes),
        };
        psbt.inputs[i].witness_utxo = Some(txout);
    }

    // Serialize to base64
    Ok(psbt.to_string())
}

/// Build the list of output entries from payments + optional change.
///
/// Order: all payments first (preserving fixture order), then change last.
pub fn build_outputs(
    fixture: &Fixture,
    selection: &CoinSelectionResult,
) -> (Vec<OutputEntry>, Option<usize>) {
    let mut outputs: Vec<OutputEntry> = Vec::new();

    // Payment outputs (preserving fixture order)
    for payment in &fixture.payments {
        outputs.push(OutputEntry {
            value_sats: payment.value_sats,
            script_pubkey_hex: payment.script_pubkey_hex.clone(),
            script_type: payment
                .script_type
                .clone()
                .unwrap_or_else(|| "unknown".to_string()),
            address: payment.address.clone(),
            is_change: false,
        });
    }

    // Change output (if any)
    let change_index = if let Some(change_value) = selection.change_value {
        let idx = outputs.len();
        outputs.push(OutputEntry {
            value_sats: change_value,
            script_pubkey_hex: fixture.change.script_pubkey_hex.clone(),
            script_type: fixture.change.script_type.clone(),
            address: fixture.change.address.clone(),
            is_change: true,
        });
        Some(idx)
    } else {
        None
    };

    (outputs, change_index)
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixture::Utxo;
    use crate::transaction::TxParams;

    fn make_selection() -> CoinSelectionResult {
        CoinSelectionResult {
            selected_utxos: vec![Utxo {
                txid: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
                    .to_string(),
                vout: 0,
                value_sats: 100_000,
                script_pubkey_hex: "0014aabbccddee0011223344556677889900aabbccdd".to_string(),
                script_type: "p2wpkh".to_string(),
                address: None,
            }],
            effective_types: vec!["p2wpkh".to_string()],
            change_value: Some(49_000),
            fee_sats: 1_000,
            vbytes: 141,
            weight: 562,
        }
    }

    fn make_tx_params() -> TxParams {
        TxParams {
            n_lock_time: 0,
            n_sequence: 0xFFFF_FFFF,
            rbf_signaling: false,
            locktime_type: "none".to_string(),
        }
    }

    #[test]
    fn test_psbt_valid_base64() {
        let selection = make_selection();
        let outputs = vec![
            OutputEntry {
                value_sats: 50_000,
                script_pubkey_hex: "0014aabbccddee0011223344556677889900aabbccdd".to_string(),
                script_type: "p2wpkh".to_string(),
                address: None,
                is_change: false,
            },
            OutputEntry {
                value_sats: 49_000,
                script_pubkey_hex: "0014aabbccddee0011223344556677889900aabbccdd".to_string(),
                script_type: "p2wpkh".to_string(),
                address: None,
                is_change: true,
            },
        ];
        let tx_params = make_tx_params();

        let psbt_b64 = build_psbt(&selection, &outputs, &tx_params).unwrap();

        // Must be valid base64
        let decoded = bitcoin::base64::Engine::decode(
            &bitcoin::base64::engine::general_purpose::STANDARD,
            &psbt_b64,
        )
        .expect("PSBT must be valid base64");

        // Must start with PSBT magic bytes: 0x70736274ff
        assert!(decoded.len() >= 5);
        assert_eq!(&decoded[0..5], b"psbt\xff", "PSBT magic bytes mismatch");
    }

    #[test]
    fn test_psbt_has_witness_utxo() {
        let selection = make_selection();
        let outputs = vec![OutputEntry {
            value_sats: 50_000,
            script_pubkey_hex: "0014aabbccddee0011223344556677889900aabbccdd".to_string(),
            script_type: "p2wpkh".to_string(),
            address: None,
            is_change: false,
        }];
        let tx_params = make_tx_params();

        let psbt_b64 = build_psbt(&selection, &outputs, &tx_params).unwrap();

        // Parse back to verify witness_utxo is set
        let psbt: Psbt = psbt_b64.parse().expect("PSBT must parse back");
        assert!(psbt.inputs[0].witness_utxo.is_some());
        let wu = psbt.inputs[0].witness_utxo.as_ref().unwrap();
        assert_eq!(wu.value.to_sat(), 100_000);
    }
}
