import { NextResponse } from "next/server";
import { mkdtemp, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { parseJsonFromCliOutput, runTxray } from "@/lib/server/txrayCli";

export const runtime = "nodejs";

const MEMPOOL_BASE = "https://mempool.space/api";

interface MempoolVin {
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

interface MempoolVout {
  scriptpubkey: string;
  scriptpubkey_asm: string;
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

interface AnalysisResult {
  ok: boolean;
  txid: string;
  mempool: MempoolTx;
  structure: unknown | null;
  privacy: {
    fingerprint: unknown | null;
    advice: unknown | null;
  };
  isCoinbase: boolean;
  errors: string[];
}

/**
 * GET /api/tx/[txid]
 *
 * Unified transaction analysis endpoint that:
 * 1. Fetches tx data and hex from mempool.space
 * 2. Runs Lens structure analysis (parse tx)
 * 3. Runs Sherlock privacy analysis (fingerprint + advise)
 *
 * Returns combined analysis result for use by unified /tx/[txid] page.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ txid: string }> },
) {
  const { txid } = await params;

  // Validate txid format (64 hex characters)
  if (!/^[0-9a-fA-F]{64}$/.test(txid)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INVALID_TXID",
          message: "Transaction ID must be 64 hexadecimal characters",
        },
      },
      { status: 400 },
    );
  }

  const errors: string[] = [];
  let tmpDir: string | null = null;

  try {
    // Fetch tx data and hex from mempool.space in parallel
    const [txRes, hexRes] = await Promise.all([
      fetch(`${MEMPOOL_BASE}/tx/${txid}`),
      fetch(`${MEMPOOL_BASE}/tx/${txid}/hex`),
    ]);

    if (!txRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "TX_NOT_FOUND",
            message:
              txRes.status === 404
                ? "Transaction not found. It may not exist or hasn't been broadcast yet."
                : `Mempool API returned ${txRes.status}`,
          },
        },
        { status: txRes.status === 404 ? 404 : 502 },
      );
    }

    const tx = (await txRes.json()) as MempoolTx;
    const txHex = hexRes.ok ? await hexRes.text() : null;

    // Check if coinbase transaction
    const isCoinbase = tx.vin.every((vin) => vin.is_coinbase);

    const result: AnalysisResult = {
      ok: true,
      txid,
      mempool: tx,
      structure: null,
      privacy: {
        fingerprint: null,
        advice: null,
      },
      isCoinbase,
      errors: [],
    };

    // Skip CLI analysis for coinbase transactions (no prevouts)
    if (isCoinbase) {
      return NextResponse.json(result);
    }

    // Skip CLI analysis if we couldn't fetch the hex
    if (!txHex) {
      errors.push("Could not fetch transaction hex for CLI analysis");
      result.errors = errors;
      return NextResponse.json(result);
    }

    // Create fixture for CLI
    const fixture = {
      network: "mainnet",
      raw_tx: txHex,
      prevouts: tx.vin
        .filter((input) => !input.is_coinbase && input.prevout)
        .map((input) => ({
          txid: input.txid,
          vout: input.vout,
          value_sats: input.prevout.value,
          script_pubkey_hex: input.prevout.scriptpubkey,
        })),
    };

    // Create temp directory and write fixture
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "txray-tx-"));
    const fixturePath = path.join(tmpDir, "fixture.json");
    await writeFile(fixturePath, JSON.stringify(fixture), "utf-8");

    // Run all CLI analyses in parallel (using --json flag for structured output)
    const [parseResult, fingerprintResult, adviseResult] = await Promise.all([
      runTxray(["parse", "tx", fixturePath]),
      runTxray(["fingerprint", fixturePath, "--json"]),
      runTxray(["advise", fixturePath, "--json"]),
    ]);

    // Parse structure analysis (Lens)
    if (parseResult.code === 0) {
      try {
        result.structure = parseJsonFromCliOutput(parseResult.stdout);
      } catch (e) {
        errors.push(
          `Structure analysis parse error: ${e instanceof Error ? e.message : "unknown"}`,
        );
      }
    } else {
      errors.push(
        `Structure analysis failed: ${parseResult.stderr || "unknown error"}`,
      );
    }

    // Parse fingerprint analysis (Sherlock)
    if (fingerprintResult.code === 0) {
      try {
        result.privacy.fingerprint = parseJsonFromCliOutput(
          fingerprintResult.stdout,
        );
      } catch (e) {
        errors.push(
          `Fingerprint analysis parse error: ${e instanceof Error ? e.message : "unknown"}`,
        );
      }
    } else {
      errors.push(
        `Fingerprint analysis failed: ${fingerprintResult.stderr || "unknown error"}`,
      );
    }

    // Parse privacy advice (Sherlock)
    if (adviseResult.code === 0) {
      try {
        result.privacy.advice = parseJsonFromCliOutput(adviseResult.stdout);
      } catch (e) {
        errors.push(
          `Privacy advice parse error: ${e instanceof Error ? e.message : "unknown"}`,
        );
      }
    } else {
      errors.push(
        `Privacy advice failed: ${adviseResult.stderr || "unknown error"}`,
      );
    }

    result.errors = errors;
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
