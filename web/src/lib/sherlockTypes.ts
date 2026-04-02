// TypeScript interfaces matching the sherlock JSON output structure

export interface HeuristicResult {
  detected: boolean;
  [key: string]: unknown;
}

export interface TxInput {
  value_sats: number;
  script_type: string;
  address: string | null;
}

export interface TxOutput {
  value_sats: number;
  script_type: string;
  address: string | null;
}

export interface Transaction {
  txid: string;
  classification: string;
  heuristics: Record<string, HeuristicResult>;
  inputs?: TxInput[];
  outputs?: TxOutput[];
  fee_sats?: number;
  weight?: number;
  is_coinbase?: boolean;
}

export interface FeeRateStats {
  min_sat_vb: number;
  max_sat_vb: number;
  mean_sat_vb: number;
  median_sat_vb: number;
}

export interface AnalysisSummary {
  fee_rate_stats: FeeRateStats;
  flagged_transactions: number;
  heuristics_applied: string[];
  script_type_distribution: Record<string, number>;
  total_transactions_analyzed: number;
}

export interface Block {
  block_hash: string;
  block_height: number;
  tx_count: number;
  transactions: Transaction[];
  analysis_summary: AnalysisSummary;
}

export interface BlockFileData {
  ok: boolean;
  file: string;
  mode: string;
  block_count: number;
  blocks: Block[];
  analysis_summary: AnalysisSummary;
}

// Classification display config
export const CLASSIFICATION_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  coinjoin: {
    label: "CoinJoin",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
  },
  consolidation: {
    label: "Consolidation",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  self_transfer: {
    label: "Self-Transfer",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/20",
  },
  batch_payment: {
    label: "Batch",
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
  },
  simple_payment: {
    label: "Simple",
    color: "text-zinc-400",
    bg: "bg-zinc-500/10 border-zinc-500/20",
  },
  unknown: {
    label: "Unknown",
    color: "text-zinc-600",
    bg: "bg-zinc-800/50 border-zinc-700/20",
  },
};

export const HEURISTIC_LABELS: Record<string, string> = {
  cioh: "Common Input Ownership",
  change_detection: "Change Detection",
  address_reuse: "Address Reuse",
  coinjoin: "CoinJoin Detection",
  consolidation: "Consolidation",
  self_transfer: "Self-Transfer",
  op_return: "OP_RETURN Analysis",
  round_number_payment: "Round Number Payment",
};
