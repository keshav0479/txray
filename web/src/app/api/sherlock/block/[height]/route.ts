import { NextResponse } from "next/server";
import { mkdtemp, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { parseJsonFromCliOutput, runTxray } from "@/lib/server/txrayCli";

export const runtime = "nodejs";
export const maxDuration = 60; // Blocks can have many transactions

const MEMPOOL_BASE = "https://mempool.space/api";

interface MempoolVin {
  txid: string;
  vout: number;
  prevout?: {
    scriptpubkey: string;
    value: number;
  };
  scriptsig: string;
  witness?: string[];
  is_coinbase: boolean;
  sequence: number;
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
  status: {
    confirmed: boolean;
    block_height?: number;
  };
}

interface BlockPrivacyResult {
  ok: boolean;
  height: number;
  hash: string;
  txCount: number;
  transactions: Array<{
    txid: string;
    isCoinbase: boolean;
    fingerprint: unknown | null;
    advice: unknown | null;
    error?: string;
  }>;
  summary: {
    analyzedCount: number;
    coinbaseCount: number;
    failedCount: number;
  };
}

/**
 * GET /api/sherlock/block/[height]
 *
 * Runs privacy analysis (fingerprint + advise) on all transactions in a block.
 * Fetches block from mempool.space and analyzes each transaction.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ height: string }> },
) {
  const { height } = await params;
  const blockHeight = parseInt(height, 10);

  if (isNaN(blockHeight) || blockHeight < 0) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INVALID_HEIGHT",
          message: "Block height must be a positive number",
        },
      },
      { status: 400 },
    );
  }

  let tmpDir: string | null = null;

  try {
    // Fetch block hash and transactions
    const [hashRes, txsRes] = await Promise.all([
      fetch(`${MEMPOOL_BASE}/block-height/${blockHeight}`),
      fetch(`${MEMPOOL_BASE}/block-height/${blockHeight}`).then(async (res) => {
        if (!res.ok) return null;
        const hash = await res.text();
        return fetch(`${MEMPOOL_BASE}/block/${hash}/txs`);
      }),
    ]);

    if (!hashRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "BLOCK_NOT_FOUND",
            message:
              hashRes.status === 404
                ? "Block not found at this height"
                : `Mempool API returned ${hashRes.status}`,
          },
        },
        { status: hashRes.status === 404 ? 404 : 502 },
      );
    }

    const blockHash = await hashRes.text();

    if (!txsRes || !txsRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "BLOCK_TXS_FAILED",
            message: "Failed to fetch block transactions",
          },
        },
        { status: 502 },
      );
    }

    const transactions = (await txsRes.json()) as MempoolTx[];

    // Create temp directory for fixtures
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "txray-block-"));

    const result: BlockPrivacyResult = {
      ok: true,
      height: blockHeight,
      hash: blockHash,
      txCount: transactions.length,
      transactions: [],
      summary: {
        analyzedCount: 0,
        coinbaseCount: 0,
        failedCount: 0,
      },
    };

    // Analyze each transaction (limit to first 50 for performance)
    const txsToAnalyze = transactions.slice(0, 50);

    for (const tx of txsToAnalyze) {
      const isCoinbase = tx.vin.every((vin) => vin.is_coinbase);

      if (isCoinbase) {
        result.transactions.push({
          txid: tx.txid,
          isCoinbase: true,
          fingerprint: null,
          advice: null,
        });
        result.summary.coinbaseCount++;
        continue;
      }

      try {
        // Fetch transaction hex
        const hexRes = await fetch(`${MEMPOOL_BASE}/tx/${tx.txid}/hex`);
        if (!hexRes.ok) {
          result.transactions.push({
            txid: tx.txid,
            isCoinbase: false,
            fingerprint: null,
            advice: null,
            error: "Failed to fetch transaction hex",
          });
          result.summary.failedCount++;
          continue;
        }

        const txHex = await hexRes.text();

        // Create fixture
        const fixture = {
          network: "mainnet",
          raw_tx: txHex,
          prevouts: tx.vin
            .filter((input) => !input.is_coinbase && input.prevout)
            .map((input) => ({
              txid: input.txid,
              vout: input.vout,
              value_sats: input.prevout!.value,
              script_pubkey_hex: input.prevout!.scriptpubkey,
            })),
        };

        const fixturePath = path.join(tmpDir, `${tx.txid}.json`);
        await writeFile(fixturePath, JSON.stringify(fixture), "utf-8");

        // Run privacy analysis
        const [fingerprintResult, adviseResult] = await Promise.all([
          runTxray(["fingerprint", fixturePath, "--json"]),
          runTxray(["advise", fixturePath, "--json"]),
        ]);

        let fingerprint = null;
        let advice = null;
        let error: string | undefined;

        if (fingerprintResult.code === 0) {
          try {
            fingerprint = parseJsonFromCliOutput(fingerprintResult.stdout);
          } catch (e) {
            error = `Fingerprint parse error: ${e instanceof Error ? e.message : "unknown"}`;
          }
        } else {
          error = `Fingerprint failed: ${fingerprintResult.stderr}`;
        }

        if (adviseResult.code === 0) {
          try {
            advice = parseJsonFromCliOutput(adviseResult.stdout);
          } catch (e) {
            if (!error)
              error = `Advice parse error: ${e instanceof Error ? e.message : "unknown"}`;
          }
        } else {
          if (!error) error = `Advice failed: ${adviseResult.stderr}`;
        }

        result.transactions.push({
          txid: tx.txid,
          isCoinbase: false,
          fingerprint,
          advice,
          error,
        });

        if (fingerprint || advice) {
          result.summary.analyzedCount++;
        } else {
          result.summary.failedCount++;
        }
      } catch (e) {
        result.transactions.push({
          txid: tx.txid,
          isCoinbase: false,
          fingerprint: null,
          advice: null,
          error: e instanceof Error ? e.message : "Unknown error",
        });
        result.summary.failedCount++;
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        ok: false,
        error: { code: "INTERNAL_ERROR", message },
      },
      { status: 500 },
    );
  } finally {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
