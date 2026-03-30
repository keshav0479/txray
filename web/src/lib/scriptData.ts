/**
 * Centralised script-type metadata.
 * Used by BlockOverview (distribution bar) and AnimatedTransactionFlow (SVG nodes).
 */

export const SCRIPT_NAMES: Record<string, string> = {
  p2wpkh: "Native SegWit",
  p2tr: "Taproot",
  p2sh: "Nested SegWit / Multi-sig",
  p2pkh: "Legacy",
  p2wsh: "Advanced SegWit",
  op_return: "Data Payload",
  unknown: "Unknown Script",
};

export const SCRIPT_DEFINITIONS: Record<string, string> = {
  p2wpkh: "A modern, highly efficient address format starting with 'bc1q'. It separates signature data to save space.",
  p2tr: "The newest privacy-focused format ('bc1p'). It bundles complex multi-sig conditions into what looks like a single signature.",
  p2sh: "Often used for multi-signature wallets (starting with '3'). It hashes the script requirements to keep the address size small.",
  p2pkh: "The original Bitcoin address format (starting with '1'). It is heavier and costs more in fees.",
  p2wsh: "A larger, complex smart-contract format optimized for the SegWit upgrade.",
  op_return: "A provably unspendable output used to etch arbitrary data (like text or rules) permanently into the blockchain.",
  unknown: "A non-standard or unrecognized cryptographic locking script.",
};

export const SCRIPT_ANALOGIES: Record<string, string> = {
  p2wpkh: "Like upgrading your shipping boxes to be lighter and cheaper to send.",
  p2tr: "Like a smart contract that looks exactly like a normal transaction to outsiders.",
  p2sh: "Like requiring multiple keys to open a safety deposit box.",
  p2pkh: "The original, heavier way Bitcoin was sent in the early days.",
  p2wsh: "A cheaper way to do complex smart contracts.",
  op_return: "Like writing a permanent message on the memo line of a check.",
  unknown: "A custom or unrecognized lock format.",
};

export const SCRIPT_COLORS: Record<string, string> = {
  p2wpkh: "bg-cyan-400",
  p2tr: "bg-blue-500",
  p2sh: "bg-violet-500",
  p2pkh: "bg-indigo-500",
  p2wsh: "bg-purple-600",
  op_return: "bg-zinc-600",
  unknown: "bg-zinc-500",
};

/** Available demo fixture IDs -- single source of truth for UI + API */
export const DEMO_FIXTURES = [
  { id: "04330", label: "Block 04330", description: "Very early format (Pre-SegWit)" },
  { id: "05051", label: "Block 05051", description: "Includes SegWit transactions" },
] as const;

export type DemoFixtureId = typeof DEMO_FIXTURES[number]["id"];

/** Translate a raw script type to a friendly name */
export function translateScript(type?: string): string {
  if (!type) return "Unknown Script";
  return SCRIPT_NAMES[type] || type.toUpperCase();
}

/** Get the definition for a script type */
export function getScriptDefinition(type?: string): string {
  if (!type) return SCRIPT_DEFINITIONS.unknown;
  return SCRIPT_DEFINITIONS[type] || "Cryptographic lock format securing the output.";
}
