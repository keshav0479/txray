// mempool.space REST API client
// all endpoints are CORS-enabled, no auth required

const BASE = "https://mempool.space/api";
const IMMUTABLE_TTL_MS = 30 * 60 * 1_000;
const HOT_TTL_MS = 10 * 1_000;
const TIP_TTL_MS = 5 * 1_000;

type CacheEntry = {
  expiresAt: number;
  data: unknown;
};

const responseCache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, Promise<unknown>>();

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
  const key = `json:${path}`;
  const cached = getCached<T>(key);
  if (cached !== undefined) return cached;

  const inflight = inflightRequests.get(key) as Promise<T> | undefined;
  if (inflight) return inflight;

  const request = (async () => {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) {
      if (res.status === 404) {
        throw new MempoolError(
          "Not found. Check the txid or block height.",
          404,
        );
      }
      throw new MempoolError(
        `mempool.space returned ${res.status}`,
        res.status,
      );
    }
    const data = (await res.json()) as T;
    setCached(key, data, ttlForPath(path));
    return data;
  })().finally(() => {
    inflightRequests.delete(key);
  });

  inflightRequests.set(key, request);
  return request;
}

async function fetchText(path: string): Promise<string> {
  const key = `text:${path}`;
  const cached = getCached<string>(key);
  if (cached !== undefined) return cached;

  const inflight = inflightRequests.get(key) as Promise<string> | undefined;
  if (inflight) return inflight;

  const request = (async () => {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) {
      throw new MempoolError(
        `mempool.space returned ${res.status}`,
        res.status,
      );
    }
    const text = await res.text();
    setCached(key, text, ttlForPath(path));
    return text;
  })().finally(() => {
    inflightRequests.delete(key);
  });

  inflightRequests.set(key, request);
  return request;
}

function ttlForPath(path: string): number {
  if (path === "/blocks/tip/height") return TIP_TTL_MS;
  if (path === "/v1/fees/recommended") return HOT_TTL_MS;
  if (path.startsWith("/address/")) return HOT_TTL_MS;
  return IMMUTABLE_TTL_MS;
}

function getCached<T>(key: string): T | undefined {
  const entry = responseCache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    responseCache.delete(key);
    return undefined;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T, ttlMs: number): void {
  responseCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function clearMempoolCache(): void {
  responseCache.clear();
  inflightRequests.clear();
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

export interface MempoolUtxo {
  txid: string;
  vout: number;
  status: { confirmed: boolean; block_height?: number };
  value: number;
}

// fetch unspent outputs for an address
export function fetchAddressUtxos(address: string): Promise<MempoolUtxo[]> {
  return fetchJSON<MempoolUtxo[]>(`/address/${address}/utxo`);
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
