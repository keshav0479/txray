// --- Type definitions matching the actual Rust CLI output schema ---

export interface VinEntry {
  txid: string;
  vout: number;
  sequence: number;
  script_sig_hex: string;
  script_asm: string;
  witness: string[];
  script_type: string;
  address: string | null;
  prevout: {
    value_sats: number;
    script_pubkey_hex: string;
  };
  relative_timelock: {
    enabled: boolean;
    type?: string;
    value?: number;
  };
  witness_script_asm?: string;
}

export interface VoutEntry {
  n: number;
  value_sats: number;
  script_pubkey_hex: string;
  script_asm: string;
  script_type: string;
  address: string | null;
  op_return_data_hex?: string;
  op_return_data_utf8?: string | null;
  op_return_protocol?: string;
}

export interface Warning {
  code: string;
}

export interface AnalyzedTx {
  ok: boolean;
  network: string;
  segwit: boolean;
  txid: string;
  wtxid: string | null;
  version: number;
  locktime: number;
  size_bytes: number;
  weight: number;
  vbytes: number;
  total_input_sats: number;
  total_output_sats: number;
  fee_sats: number;
  fee_rate_sat_vb: number;
  rbf_signaling: boolean;
  locktime_type: string;
  locktime_value: number;
  segwit_savings: {
    witness_bytes: number;
    non_witness_bytes: number;
    total_bytes: number;
    weight_actual: number;
    weight_if_legacy: number;
    savings_pct: number;
  } | null;
  vin: VinEntry[];
  vout: VoutEntry[];
  warnings: Warning[];
}

// Block-mode CLI output
export interface BlockAnalysis {
  ok: boolean;
  mode: "block";
  block_header: {
    version: number;
    prev_block_hash: string;
    merkle_root: string;
    merkle_root_valid: boolean;
    timestamp: number;
    bits: string;
    nonce: number;
    block_hash: string;
  };
  tx_count: number;
  coinbase: {
    bip34_height: number;
    coinbase_script_hex: string;
    total_output_sats: number;
  };
  transactions: AnalyzedTx[];
  block_stats: {
    total_fees_sats: number;
    total_weight: number;
    avg_fee_rate_sat_vb: number;
    script_type_summary: Record<string, number>;
  };
}
