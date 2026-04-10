// Bitcoin address parsing and scriptPubKey derivation
// Supports: P2PKH (1...), P2SH (3...), P2WPKH (bc1q 42-char), P2WSH (bc1q 62-char), P2TR (bc1p)
// Pure TypeScript — no external dependencies

// ─── Bech32 / Bech32m ────────────────────────────────────────────────────────

const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const CHAR_MAP: Record<string, number> = {};
for (let i = 0; i < CHARSET.length; i++) CHAR_MAP[CHARSET[i]] = i;

const BECH32M_CONST = 0x2bc830a3;

function polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((b >> i) & 1) chk ^= GEN[i];
    }
  }
  return chk;
}

function hrpExpand(hrp: string): number[] {
  const r: number[] = [];
  for (let i = 0; i < hrp.length; i++) r.push(hrp.charCodeAt(i) >> 5);
  r.push(0);
  for (let i = 0; i < hrp.length; i++) r.push(hrp.charCodeAt(i) & 31);
  return r;
}

function convertBits(
  data: number[],
  fromBits: number,
  toBits: number,
  pad: boolean,
): number[] | null {
  let acc = 0,
    bits = 0;
  const result: number[] = [];
  const maxv = (1 << toBits) - 1;
  for (const v of data) {
    if (v >> fromBits !== 0) return null;
    acc = (acc << fromBits) | v;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      result.push((acc >> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) result.push((acc << (toBits - bits)) & maxv);
  } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv) !== 0) {
    return null;
  }
  return result;
}

function decodeBech32(
  addr: string,
): { hrp: string; version: number; program: number[] } | null {
  const s = addr.toLowerCase();
  const sep = s.lastIndexOf("1");
  if (sep < 1 || sep + 7 > s.length || s.length > 90) return null;

  const hrp = s.slice(0, sep);
  const dataPart = s.slice(sep + 1);

  const data: number[] = [];
  for (const c of dataPart) {
    if (!(c in CHAR_MAP)) return null;
    data.push(CHAR_MAP[c]);
  }

  const version = data[0];
  const expected = version === 0 ? 1 : BECH32M_CONST;
  if (polymod([...hrpExpand(hrp), ...data]) !== expected) return null;

  const program = convertBits(data.slice(1, -6), 5, 8, false);
  if (!program) return null;
  if (program.length < 2 || program.length > 40) return null;

  return { hrp, version, program };
}

// ─── Base58Check ─────────────────────────────────────────────────────────────

const B58_ALPHA = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const B58_MAP: Record<string, number> = {};
for (let i = 0; i < B58_ALPHA.length; i++) B58_MAP[B58_ALPHA[i]] = i;

function decodeBase58(str: string): Uint8Array | null {
  let n = BigInt(0);
  for (const c of str) {
    if (!(c in B58_MAP)) return null;
    n = n * BigInt(58) + BigInt(B58_MAP[c]);
  }
  const bytes: number[] = [];
  while (n > BigInt(0)) {
    bytes.unshift(Number(n & BigInt(0xff)));
    n >>= BigInt(8);
  }
  let leading = 0;
  for (const c of str) {
    if (c === "1") leading++;
    else break;
  }
  const out = new Uint8Array(leading + bytes.length);
  out.set(bytes, leading);
  return out;
}

// ─── Hex helpers ─────────────────────────────────────────────────────────────

function hex(bytes: number[] | Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ParsedAddress {
  network: "mainnet" | "testnet";
  type: "p2pkh" | "p2sh" | "p2wpkh" | "p2wsh" | "p2tr";
  scriptPubkeyHex: string;
  scriptType: string;
}

/**
 * Parse a Bitcoin address and derive its scriptPubKey hex.
 * Returns null if the address is invalid or unrecognized.
 */
export function parseAddress(addr: string): ParsedAddress | null {
  if (!addr) return null;
  const s = addr.trim();

  // ── Segwit (bech32 / bech32m) ──
  const bech = decodeBech32(s);
  if (bech) {
    const { hrp, version, program } = bech;

    let network: "mainnet" | "testnet";
    if (hrp === "bc") network = "mainnet";
    else if (hrp === "tb" || hrp === "bcrt") network = "testnet";
    else return null;

    if (version === 0 && program.length === 20) {
      return {
        network,
        type: "p2wpkh",
        scriptPubkeyHex: "0014" + hex(program),
        scriptType: "p2wpkh",
      };
    }
    if (version === 0 && program.length === 32) {
      return {
        network,
        type: "p2wsh",
        scriptPubkeyHex: "0020" + hex(program),
        scriptType: "p2wsh",
      };
    }
    if (version === 1 && program.length === 32) {
      return {
        network,
        type: "p2tr",
        scriptPubkeyHex: "5120" + hex(program),
        scriptType: "p2tr",
      };
    }
    return null;
  }

  // ── Legacy (base58check) ──
  const decoded = decodeBase58(s);
  // 25 bytes: 1 version + 20 hash + 4 checksum
  if (!decoded || decoded.length !== 25) return null;

  const ver = decoded[0];
  const hash = decoded.slice(1, 21);

  if (ver === 0x00) {
    return {
      network: "mainnet",
      type: "p2pkh",
      scriptPubkeyHex: "76a914" + hex(hash) + "88ac",
      scriptType: "p2pkh",
    };
  }
  if (ver === 0x05) {
    return {
      network: "mainnet",
      type: "p2sh",
      scriptPubkeyHex: "a914" + hex(hash) + "87",
      scriptType: "p2sh",
    };
  }
  if (ver === 0x6f) {
    return {
      network: "testnet",
      type: "p2pkh",
      scriptPubkeyHex: "76a914" + hex(hash) + "88ac",
      scriptType: "p2pkh",
    };
  }
  if (ver === 0xc4) {
    return {
      network: "testnet",
      type: "p2sh",
      scriptPubkeyHex: "a914" + hex(hash) + "87",
      scriptType: "p2sh",
    };
  }

  return null;
}
