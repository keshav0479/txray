/**
 * Fetches prevout data from mempool.space for a raw transaction hex.
 * Used when the user pastes raw hex without prevout information.
 */

const MEMPOOL_API = "https://mempool.space/api";

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

/** Read a little-endian uint32 from a Uint8Array */
function readU32LE(buf: Uint8Array, offset: number): number {
  return (
    buf[offset] |
    (buf[offset + 1] << 8) |
    (buf[offset + 2] << 16) |
    ((buf[offset + 3] << 24) >>> 0)
  );
}

/** Read a Bitcoin compact-size (varint) and return [value, bytesConsumed] */
function readVarint(buf: Uint8Array, offset: number): [number, number] {
  const first = buf[offset];
  if (first < 0xfd) return [first, 1];
  if (first === 0xfd) {
    return [buf[offset + 1] | (buf[offset + 2] << 8), 3];
  }
  if (first === 0xfe) {
    return [readU32LE(buf, offset + 1), 5];
  }
  // 0xff — 8-byte, but tx inputs won't exceed 32-bit count
  return [readU32LE(buf, offset + 1), 9];
}

/** Convert bytes to hex string */
function toHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Minimally decode a raw Bitcoin transaction to extract input txid:vout references.
 * Handles both legacy and segwit transactions.
 */
export function extractInputRefs(rawHex: string): InputRef[] {
  const bytes = new Uint8Array(
    rawHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)),
  );

  let pos = 4; // skip version (4 bytes)

  // Check for segwit marker
  let isSegwit = false;
  if (bytes[pos] === 0x00 && bytes[pos + 1] === 0x01) {
    isSegwit = true;
    pos += 2; // skip marker + flag
  }

  // Read input count
  const [inputCount, viSize] = readVarint(bytes, pos);
  pos += viSize;

  const inputs: InputRef[] = [];

  for (let i = 0; i < inputCount; i++) {
    // txid: 32 bytes, little-endian (need to reverse for display)
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
    pos += sigViSize + sigLen;

    // sequence: 4 bytes
    pos += 4;

    // Skip coinbase inputs (txid is all zeros)
    if (txid !== "0000000000000000000000000000000000000000000000000000000000000000") {
      inputs.push({ txid, vout });
    }
  }

  return inputs;
}

/**
 * Fetch prevout data for a list of input references from mempool.space.
 * Groups by txid to minimize API calls.
 */
export async function fetchPrevouts(inputs: InputRef[]): Promise<Prevout[]> {
  if (inputs.length === 0) return [];

  // Group inputs by txid to batch fetches
  const txidSet = new Set(inputs.map((i) => i.txid));
  const txCache = new Map<string, { vout: { scriptpubkey: string; value: number }[] }>();

  // Fetch each unique parent tx
  const fetchPromises = Array.from(txidSet).map(async (txid) => {
    const res = await fetch(`${MEMPOOL_API}/tx/${txid}`);
    if (!res.ok) {
      throw new Error(
        `Failed to fetch parent tx ${txid.slice(0, 12)}... from mempool.space (${res.status})`,
      );
    }
    const data = await res.json();
    txCache.set(txid, data);
  });

  await Promise.all(fetchPromises);

  // Build prevouts array matching input order
  return inputs.map(({ txid, vout }) => {
    const parentTx = txCache.get(txid);
    if (!parentTx || !parentTx.vout[vout]) {
      throw new Error(`Prevout ${txid.slice(0, 12)}...:${vout} not found on mempool.space`);
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
