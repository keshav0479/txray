import { NextResponse } from "next/server";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import {
  parseJsonFromCliOutput,
  runTxray,
} from "@/lib/server/txrayCli";
import { getPrimaryApiBase, getResultsDir } from "@/lib/server/config";
import { checkHeavyLimit } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_TXS = 100;
const BATCH_SIZE = 8;

// ---------------------------------------------------------------------------
// Mempool types (minimal, only what we need)
// ---------------------------------------------------------------------------

interface MempoolVin {
  txid: string;
  vout: number;
  prevout?: { scriptpubkey: string; scriptpubkey_type: string; scriptpubkey_address?: string; value: number };
  is_coinbase: boolean;
}

interface MempoolVout {
  scriptpubkey: string;
  scriptpubkey_type: string;
  scriptpubkey_address?: string;
  value: number;
}

interface MempoolTx {
  txid: string;
  version: number;
  locktime: number;
  vin: MempoolVin[];
  vout: MempoolVout[];
  fee: number;
  weight: number;
}

// ---------------------------------------------------------------------------
// BlockFileData types (must match sherlockTypes.ts)
// ---------------------------------------------------------------------------

interface TxIO { value_sats: number; script_type: string; address: string | null }

interface HeuristicResult { detected: boolean; [key: string]: unknown }

interface Transaction {
  txid: string;
  classification: string;
  heuristics: Record<string, HeuristicResult>;
  inputs: TxIO[];
  outputs: TxIO[];
  fee_sats: number;
  weight: number;
  is_coinbase: boolean;
}

interface FeeRateStats { min_sat_vb: number; max_sat_vb: number; mean_sat_vb: number; median_sat_vb: number }

interface AnalysisSummary {
  fee_rate_stats: FeeRateStats;
  flagged_transactions: number;
  heuristics_applied: string[];
  script_type_distribution: Record<string, number>;
  total_transactions_analyzed: number;
}

interface BlockFileData {
  ok: boolean;
  file: string;
  mode: string;
  block_count: number;
  blocks: Array<{
    block_hash: string;
    block_height: number;
    tx_count: number;
    transactions: Transaction[];
    analysis_summary: AnalysisSummary;
  }>;
  analysis_summary: AnalysisSummary;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_HEURISTIC_IDS = [
  "address_reuse", "change_detection", "cioh", "coinjoin",
  "consolidation", "op_return", "round_number_payment", "self_transfer",
];

const EMPTY_HEURISTICS: Record<string, HeuristicResult> = Object.fromEntries(
  ALL_HEURISTIC_IDS.map((id) => [id, { detected: false }]),
);

/** Map mempool scriptpubkey_type to our canonical short names */
function normalizeScriptType(t: string): string {
  const map: Record<string, string> = {
    v0_p2wpkh: "p2wpkh",
    v0_p2wsh: "p2wsh",
    v1_p2tr: "p2tr",
    p2pkh: "p2pkh",
    p2sh: "p2sh",
    op_return: "op_return",
    "p2sh-p2wpkh": "p2sh",
    "p2sh-p2wsh": "p2sh",
  };
  return map[t] ?? "unknown";
}

function computeFeeRateStats(txs: Transaction[]): FeeRateStats {
  const rates = txs
    .filter((tx) => !tx.is_coinbase && tx.weight > 0)
    .map((tx) => (tx.fee_sats * 4) / tx.weight);

  if (rates.length === 0) {
    return { min_sat_vb: 0, max_sat_vb: 0, mean_sat_vb: 0, median_sat_vb: 0 };
  }

  rates.sort((a, b) => a - b);
  const min = rates[0];
  const max = rates[rates.length - 1];
  const mean = rates.reduce((s, r) => s + r, 0) / rates.length;
  const mid = Math.floor(rates.length / 2);
  const median = rates.length % 2 === 0 ? (rates[mid - 1] + rates[mid]) / 2 : rates[mid];

  return {
    min_sat_vb: Math.round(min * 10) / 10,
    max_sat_vb: Math.round(max * 10) / 10,
    mean_sat_vb: Math.round(mean * 10) / 10,
    median_sat_vb: Math.round(median * 10) / 10,
  };
}

function computeScriptTypeDistribution(txs: Transaction[]): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const tx of txs) {
    for (const out of tx.outputs) {
      dist[out.script_type] = (dist[out.script_type] || 0) + 1;
    }
  }
  // Sort alphabetically for determinism
  return Object.fromEntries(Object.entries(dist).sort(([a], [b]) => a.localeCompare(b)));
}

function buildSummary(txs: Transaction[]): AnalysisSummary {
  const flagged = txs.filter((tx) =>
    Object.values(tx.heuristics).some((h) => h.detected),
  ).length;

  return {
    fee_rate_stats: computeFeeRateStats(txs),
    flagged_transactions: flagged,
    heuristics_applied: [...ALL_HEURISTIC_IDS],
    script_type_distribution: computeScriptTypeDistribution(txs),
    total_transactions_analyzed: txs.length,
  };
}

/** Fetch paginated transactions from mempool.space (up to MAX_TXS) */
async function fetchAllBlockTxs(blockHash: string): Promise<MempoolTx[]> {
  const all: MempoolTx[] = [];
  let startIndex = 0;
  const mempoolBase = getPrimaryApiBase();

  while (all.length < MAX_TXS) {
    const res = await fetch(`${mempoolBase}/block/${blockHash}/txs/${startIndex}`);
    if (!res.ok) break;
    const page = (await res.json()) as MempoolTx[];
    if (page.length === 0) break;
    all.push(...page);
    startIndex += page.length;
    // mempool.space pages at 25
    if (page.length < 25) break;
  }

  return all.slice(0, MAX_TXS);
}

/** Run txray advise on a single fixture and parse the result */
async function analyzeTx(
  tx: MempoolTx,
  tmpDir: string,
): Promise<Transaction> {
  const isCoinbase = tx.vin.every((v) => v.is_coinbase);

  const inputs: TxIO[] = isCoinbase
    ? []
    : tx.vin.map((v) => ({
        value_sats: v.prevout?.value ?? 0,
        script_type: normalizeScriptType(v.prevout?.scriptpubkey_type ?? "unknown"),
        address: v.prevout?.scriptpubkey_address ?? null,
      }));

  const outputs: TxIO[] = tx.vout.map((v) => ({
    value_sats: v.value,
    script_type: normalizeScriptType(v.scriptpubkey_type),
    address: v.scriptpubkey_address ?? null,
  }));

  if (isCoinbase) {
    return {
      txid: tx.txid,
      classification: "unknown",
      heuristics: { ...EMPTY_HEURISTICS },
      inputs,
      outputs,
      fee_sats: 0,
      weight: tx.weight,
      is_coinbase: true,
    };
  }

  // Fetch raw hex
  const hexRes = await fetch(`${getPrimaryApiBase()}/tx/${tx.txid}/hex`);
  if (!hexRes.ok) {
    // If we can't get hex, return with empty heuristics
    return {
      txid: tx.txid,
      classification: "unknown",
      heuristics: { ...EMPTY_HEURISTICS },
      inputs,
      outputs,
      fee_sats: tx.fee,
      weight: tx.weight,
      is_coinbase: false,
    };
  }

  const txHex = await hexRes.text();

  // Build fixture
  const fixture = {
    network: "mainnet",
    raw_tx: txHex,
    prevouts: tx.vin
      .filter((v) => !v.is_coinbase && v.prevout)
      .map((v) => ({
        txid: v.txid,
        vout: v.vout,
        value_sats: v.prevout!.value,
        script_pubkey_hex: v.prevout!.scriptpubkey,
      })),
  };

  const fixturePath = path.join(tmpDir, `${tx.txid}.json`);
  await writeFile(fixturePath, JSON.stringify(fixture), "utf-8");

  // Run full analysis
  const result = await runTxray(["advise", fixturePath, "--json"]);

  if (result.code !== 0) {
    return {
      txid: tx.txid,
      classification: "unknown",
      heuristics: { ...EMPTY_HEURISTICS },
      inputs,
      outputs,
      fee_sats: tx.fee,
      weight: tx.weight,
      is_coinbase: false,
    };
  }

  const parsed = parseJsonFromCliOutput(result.stdout) as {
    heuristics?: Record<string, HeuristicResult>;
    classification?: string;
  };

  // Ensure all 8 heuristics are present
  const heuristics: Record<string, HeuristicResult> = { ...EMPTY_HEURISTICS };
  if (parsed.heuristics) {
    for (const [key, val] of Object.entries(parsed.heuristics)) {
      heuristics[key] = val;
    }
  }

  return {
    txid: tx.txid,
    classification: parsed.classification ?? "unknown",
    heuristics,
    inputs,
    outputs,
    fee_sats: tx.fee,
    weight: tx.weight,
    is_coinbase: false,
  };
}

/** Process transactions in batches to avoid overwhelming the system */
async function analyzeInBatches(
  txs: MempoolTx[],
  tmpDir: string,
): Promise<Transaction[]> {
  const results: Transaction[] = [];

  for (let i = 0; i < txs.length; i += BATCH_SIZE) {
    const batch = txs.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((tx) => analyzeTx(tx, tmpDir)),
    );
    results.push(...batchResults);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(
  req: Request,
  { params }: { params: Promise<{ height: string }> },
) {
  const limited = checkHeavyLimit(req);
  if (limited) return limited;

  const { height } = await params;
  const blockHeight = parseInt(height, 10);

  if (isNaN(blockHeight) || blockHeight < 0) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_HEIGHT", message: "Block height must be a non-negative number" } },
      { status: 400 },
    );
  }

  const outDir = getResultsDir();
  const stem = `online-blk${blockHeight}`;
  const outPath = path.join(outDir, `${stem}.json`);
  const mempoolBase = getPrimaryApiBase();

  // Check if we already have this analysis cached
  try {
    await access(outPath);
    const cached = await readFile(outPath, "utf-8");
    const data = JSON.parse(cached);
    if (data.ok) {
      return NextResponse.json({ ok: true, stem });
    }
  } catch {
    // Not cached, proceed with analysis
  }

  let tmpDir: string | null = null;

  try {
    // Fetch block hash
    const hashRes = await fetch(`${mempoolBase}/block-height/${blockHeight}`);
    if (!hashRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "BLOCK_NOT_FOUND",
            message: hashRes.status === 404
              ? "Block not found at this height"
              : `Mempool API returned ${hashRes.status}`,
          },
        },
        { status: hashRes.status === 404 ? 404 : 502 },
      );
    }
    const blockHash = await hashRes.text();

    // Fetch block metadata for tx_count
    const blockRes = await fetch(`${mempoolBase}/block/${blockHash}`);
    if (!blockRes.ok) {
      return NextResponse.json(
        { ok: false, error: { code: "BLOCK_META_FAILED", message: "Failed to fetch block metadata" } },
        { status: 502 },
      );
    }
    const blockMeta = await blockRes.json();
    const totalTxCount: number = blockMeta.tx_count;

    // Fetch transactions (paginated, up to MAX_TXS)
    const mempoolTxs = await fetchAllBlockTxs(blockHash);

    if (mempoolTxs.length === 0) {
      return NextResponse.json(
        { ok: false, error: { code: "NO_TXS", message: "No transactions found in block" } },
        { status: 502 },
      );
    }

    // Create temp directory and analyze
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "txray-block-"));
    const transactions = await analyzeInBatches(mempoolTxs, tmpDir);

    // Build BlockFileData
    const blockSummary = buildSummary(transactions);

    const blockFileData: BlockFileData = {
      ok: true,
      file: `block-${blockHeight}`,
      mode: "chain_analysis",
      block_count: 1,
      blocks: [
        {
          block_hash: blockHash,
          block_height: blockHeight,
          tx_count: totalTxCount,
          transactions,
          analysis_summary: blockSummary,
        },
      ],
      analysis_summary: blockSummary,
    };

    // Save to out/
    await mkdir(outDir, { recursive: true });
    await writeFile(outPath, JSON.stringify(blockFileData), "utf-8");

    return NextResponse.json({ ok: true, stem });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  } finally {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
