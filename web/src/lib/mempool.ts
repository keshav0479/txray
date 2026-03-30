// mempool.space REST API client
// all endpoints are CORS-enabled, no auth required

const BASE = "https://mempool.space/api";

export interface MempoolVin {
  txid: string;
  vout: number;
  prevout: {
    scriptpubkey: string;
    scriptpubkey_asm: string;
    scriptpubkey_type: string;
    scriptpubkey_address?: string;
    value: number;
  };
  scriptsig: string;
  scriptsig_asm: string;
  witness?: string[];
  is_coinbase: boolean;
  sequence: number;
}

export interface MempoolVout {
  scriptpubkey: string;
  scriptpubkey_asm: string;
  scriptpubkey_type: string;
  scriptpubkey_address?: string;
  value: number;
}

export interface MempoolTx {
  txid: string;
  version: number;
  locktime: number;
  vin: MempoolVin[];
  vout: MempoolVout[];
  size: number;
  weight: number;
  sigops: number;
  fee: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
}

export interface MempoolBlock {
  id: string;
  height: number;
  version: number;
  timestamp: number;
  tx_count: number;
  size: number;
  weight: number;
  merkle_root: string;
  previousblockhash: string;
  mediantime: number;
  nonce: number;
  bits: number;
  difficulty: number;
}

export interface MempoolFees {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

export class MempoolError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "MempoolError";
  }
}

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    if (res.status === 404) {
      throw new MempoolError("Not found. Check the txid or block height.", 404);
    }
    throw new MempoolError(`mempool.space returned ${res.status}`, res.status);
  }
  return res.json();
}

async function fetchText(path: string): Promise<string> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new MempoolError(`mempool.space returned ${res.status}`, res.status);
  }
  return res.text();
}

// fetch a decoded transaction by txid
export function fetchTx(txid: string): Promise<MempoolTx> {
  return fetchJSON<MempoolTx>(`/tx/${txid}`);
}

// fetch raw hex of a transaction
export function fetchTxHex(txid: string): Promise<string> {
  return fetchText(`/tx/${txid}/hex`);
}

// fetch block metadata by hash
export function fetchBlock(hash: string): Promise<MempoolBlock> {
  return fetchJSON<MempoolBlock>(`/block/${hash}`);
}

// convert block height to hash
export function fetchBlockHash(height: number): Promise<string> {
  return fetchText(`/block-height/${height}`);
}

// fetch block metadata by height (two-step: height → hash → block)
export async function fetchBlockByHeight(
  height: number,
): Promise<MempoolBlock> {
  const hash = await fetchBlockHash(height);
  return fetchBlock(hash);
}

// fetch txids in a block
export function fetchBlockTxids(hash: string): Promise<string[]> {
  return fetchJSON<string[]>(`/block/${hash}/txids`);
}

// fetch decoded txs in a block (paginated, 25 per page)
export function fetchBlockTxs(
  hash: string,
  startIndex = 0,
): Promise<MempoolTx[]> {
  return fetchJSON<MempoolTx[]>(`/block/${hash}/txs/${startIndex}`);
}

// fetch current recommended fee rates
export function fetchFees(): Promise<MempoolFees> {
  return fetchJSON<MempoolFees>("/v1/fees/recommended");
}

// fetch current blockchain tip height
export async function fetchTipHeight(): Promise<number> {
  const text = await fetchText("/blocks/tip/height");
  return parseInt(text, 10);
}

// detect whether a search query is a txid, block height, or block hash
export function detectSearchType(
  query: string,
): "txid" | "block_height" | "block_hash" | "unknown" {
  const trimmed = query.trim();

  // block height: numeric, reasonable range
  if (/^\d+$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    if (n >= 0 && n < 10_000_000) return "block_height";
  }

  // 64-char hex: could be txid or block hash
  // block hashes start with many leading zeros
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    if (trimmed.startsWith("0000000")) return "block_hash";
    return "txid";
  }

  return "unknown";
}
