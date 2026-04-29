/**
 * Fetches prevout data from a configurable Bitcoin source for a raw
 * transaction hex. Used when the user pastes raw hex without prevout info.
 */

import { getApiSources } from "./config";

interface InputRef {
  txid: string;
  vout: number;
}

interface Prevout {
  txid: string;
  vout: number;
  value_sats: number;
  script_pubkey_hex: string;
}

const MAX_PREVOUT_PARENTS = 100;
const FETCH_CONCURRENCY = 8;
const FETCH_TIMEOUT_MS = 8_000;

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await mapper(items[index]);
      }
    },
  );

  await Promise.all(workers);
  return results;
}

/** Read a little-endian uint32 from a Uint8Array */
function readU32LE(buf: Uint8Array, offset: number): number {
  requireBytes(buf, offset, 4, "uint32");
  return (
    buf[offset] |
    (buf[offset + 1] << 8) |
    (buf[offset + 2] << 16) |
    ((buf[offset + 3] << 24) >>> 0)
  );
}

/** Read a Bitcoin compact-size (varint) and return [value, bytesConsumed] */
function readVarint(buf: Uint8Array, offset: number): [number, number] {
  requireBytes(buf, offset, 1, "compact-size");
  const first = buf[offset];
  if (first < 0xfd) return [first, 1];
  if (first === 0xfd) {
    requireBytes(buf, offset + 1, 2, "compact-size u16");
    return [buf[offset + 1] | (buf[offset + 2] << 8), 3];
  }
  if (first === 0xfe) {
    requireBytes(buf, offset + 1, 4, "compact-size u32");
    return [readU32LE(buf, offset + 1), 5];
  }
  requireBytes(buf, offset + 1, 8, "compact-size u64");
  const low = readU32LE(buf, offset + 1);
  const high = readU32LE(buf, offset + 5);
  if (high > 0) {
    throw new Error("Raw transaction has an oversized compact-size value");
  }
  return [low, 9];
}

/** Convert bytes to hex string */
function toHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function requireBytes(
  buf: Uint8Array,
  offset: number,
  length: number,
  label: string,
): void {
  if (offset < 0 || offset + length > buf.length) {
    throw new Error(`Raw transaction ended while reading ${label}`);
  }
}

function decodeRawHex(rawHex: string): Uint8Array {
  const hex = rawHex.trim();
  if (hex.length === 0) {
    throw new Error("Raw transaction hex is empty");
  }
  if (hex.length % 2 !== 0) {
    throw new Error("Raw transaction hex has odd length");
  }
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error("Raw transaction hex contains non-hex characters");
  }

  return new Uint8Array(hex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
}

/**
 * Minimally decode a raw Bitcoin transaction to extract input txid:vout references.
 * Handles both legacy and segwit transactions.
 */
export function extractInputRefs(rawHex: string): InputRef[] {
  const bytes = decodeRawHex(rawHex);
  requireBytes(bytes, 0, 10, "transaction header");

  let pos = 4; // skip version (4 bytes)

  // Check for segwit marker (0x00 0x01 after version)
  requireBytes(bytes, pos, 1, "input count");
  if (bytes[pos] === 0x00 && bytes[pos + 1] === 0x01) {
    pos += 2; // skip marker + flag
  }

  // Read input count
  const [inputCount, viSize] = readVarint(bytes, pos);
  pos += viSize;

  const inputs: InputRef[] = [];

  for (let i = 0; i < inputCount; i++) {
    // txid: 32 bytes, little-endian (need to reverse for display)
    requireBytes(bytes, pos, 36, `input ${i} outpoint`);
    const txidBytes = bytes.slice(pos, pos + 32);
    const txidReversed = new Uint8Array(32);
    for (let j = 0; j < 32; j++) {
      txidReversed[j] = txidBytes[31 - j];
    }
    const txid = toHex(txidReversed);
    pos += 32;

    // vout: 4 bytes LE
    const vout = readU32LE(bytes, pos);
    pos += 4;

    // scriptsig: varint length + data
    const [sigLen, sigViSize] = readVarint(bytes, pos);
    requireBytes(bytes, pos + sigViSize, sigLen, `input ${i} scriptSig`);
    pos += sigViSize + sigLen;

    // sequence: 4 bytes
    requireBytes(bytes, pos, 4, `input ${i} sequence`);
    pos += 4;

    // Skip coinbase inputs (txid is all zeros)
    if (txid !== "0000000000000000000000000000000000000000000000000000000000000000") {
      inputs.push({ txid, vout });
    }
  }

  return inputs;
}

/**
 * Fetch prevout data for a list of input references from configured Bitcoin APIs.
 * Groups by txid to minimize API calls.
 */
export async function fetchPrevouts(inputs: InputRef[]): Promise<Prevout[]> {
  if (inputs.length === 0) return [];

  // Group inputs by txid to batch fetches
  const txids = Array.from(new Set(inputs.map((i) => i.txid)));
  if (txids.length > MAX_PREVOUT_PARENTS) {
    throw new Error(
      `Too many unique parent transactions (${txids.length}); maximum is ${MAX_PREVOUT_PARENTS}`,
    );
  }

  const txCache = new Map<string, { vout: { scriptpubkey: string; value: number }[] }>();

  // Fetch each unique parent tx, walking the source list on failure.
  await mapWithConcurrency(txids, FETCH_CONCURRENCY, async (txid) => {
    let lastErr: unknown = null;
    for (const base of getApiSources()) {
      try {
        const res = await fetchWithTimeout(`${base}/tx/${txid}`);
        if (!res.ok) {
          lastErr = new Error(`HTTP ${res.status} from ${base}`);
          continue;
        }
        txCache.set(txid, await res.json());
        return;
      } catch (err) {
        lastErr = err;
      }
    }
    throw new Error(
      `Failed to fetch parent tx ${txid.slice(0, 12)}... from all sources: ${String(lastErr)}`,
    );
  });

  // Build prevouts array matching input order
  return inputs.map(({ txid, vout }) => {
    const parentTx = txCache.get(txid);
    if (!parentTx || !parentTx.vout[vout]) {
      throw new Error(`Prevout ${txid.slice(0, 12)}...:${vout} not found upstream`);
    }
    const output = parentTx.vout[vout];
    return {
      txid,
      vout,
      value_sats: output.value,
      script_pubkey_hex: output.scriptpubkey,
    };
  });
}
