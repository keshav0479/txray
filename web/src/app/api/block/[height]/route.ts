import { NextRequest, NextResponse } from "next/server";
import { checkLightLimit } from "@/lib/server/rateLimit";

const MEMPOOL_BASE = "https://mempool.space/api";

// In-memory LRU cache — blocks are immutable once confirmed
const CACHE_MAX = 25;
const blockCache = new Map<string, object>();

function cacheSet(key: string, value: object) {
  if (blockCache.size >= CACHE_MAX) {
    // Evict oldest entry (Map preserves insertion order)
    blockCache.delete(blockCache.keys().next().value!);
  }
  blockCache.set(key, value);
}

/**
 * Fetch block from mempool.space by height or hash, transform into
 * the BlockAnalysis shape that BlockOverview expects.
 *
 * No CLI needed — we build the analysis JSON directly from mempool REST data.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ height: string }> },
) {
  const limited = checkLightLimit(request);
  if (limited) return limited;

  try {
    const { height: heightOrHash } = await params;

    // Validate: must be a numeric height or a 64-char hex block hash
    if (/^\d+$/.test(heightOrHash)) {
      const h = parseInt(heightOrHash, 10);
      if (h < 0 || h > 1_000_000 || heightOrHash.length > 7) {
        return NextResponse.json(
          { error: { message: "Block height must be between 0 and 1000000" } },
          { status: 400 },
        );
      }
    } else if (!/^[0-9a-fA-F]{64}$/.test(heightOrHash)) {
      return NextResponse.json(
        { error: { message: "Invalid block identifier — must be a height (0–1000000) or 64-char hex hash" } },
        { status: 400 },
      );
    }

    // Serve from cache if available
    if (blockCache.has(heightOrHash)) {
      return NextResponse.json(blockCache.get(heightOrHash));
    }

    // Step 1: Resolve block hash
    let blockHash: string;
    let blockHeight: number | null = null;

    if (/^\d+$/.test(heightOrHash)) {
      blockHeight = parseInt(heightOrHash, 10);
      const hashRes = await fetch(
        `${MEMPOOL_BASE}/block-height/${heightOrHash}`,
      );
      if (!hashRes.ok) {
        return NextResponse.json(
          { error: { message: `Block height ${heightOrHash} not found` } },
          { status: 404 },
        );
      }
      blockHash = await hashRes.text();
    } else {
      blockHash = heightOrHash;
    }

    // Also check by resolved hash (covers hash-keyed lookups)
    if (blockCache.has(blockHash)) {
      return NextResponse.json(blockCache.get(blockHash));
    }

    // Step 2: Fetch block metadata
    const blockRes = await fetch(`${MEMPOOL_BASE}/block/${blockHash}`);
    if (!blockRes.ok) {
      return NextResponse.json(
        { error: { message: `Block ${blockHash} not found` } },
        { status: 404 },
      );
    }
    const block = await blockRes.json();
    if (blockHeight === null) blockHeight = block.height;

    // Step 3: Fetch all transactions (paginated, 25 per page)
    const txids: string[] = await fetch(
      `${MEMPOOL_BASE}/block/${blockHash}/txids`,
    ).then((r) => r.json());

    const allTxs = [];
    for (let i = 0; i < txids.length; i += 25) {
      const batch = await fetch(
        `${MEMPOOL_BASE}/block/${blockHash}/txs/${i}`,
      ).then((r) => r.json());
      allTxs.push(...batch);
    }

    // Step 4: Transform into BlockAnalysis shape
    const coinbaseTx = allTxs[0];
    const coinbaseScript = coinbaseTx?.vin?.[0]?.scriptsig || "";
    const coinbaseTotalOut =
      coinbaseTx?.vout?.reduce(
        (sum: number, o: { value: number }) => sum + o.value,
        0,
      ) ?? 0;

    const transactions = allTxs.map((tx: Record<string, unknown>) =>
      transformTx(tx),
    );

    const totalFees = allTxs.reduce(
      (sum: number, tx: { fee?: number }) => sum + (tx.fee || 0),
      0,
    );
    const totalWeight = allTxs.reduce(
      (sum: number, tx: { weight?: number }) => sum + (tx.weight || 0),
      0,
    );

    // Count script types across all outputs
    const scriptTypeSummary: Record<string, number> = {};
    for (const tx of allTxs) {
      for (const vout of (tx as { vout: Array<{ scriptpubkey_type: string }> })
        .vout) {
        const st = vout.scriptpubkey_type || "unknown";
        scriptTypeSummary[st] = (scriptTypeSummary[st] || 0) + 1;
      }
    }

    const blockAnalysis = {
      ok: true,
      mode: "block" as const,
      block_header: {
        version: block.version,
        prev_block_hash: block.previousblockhash || "",
        merkle_root: block.merkle_root,
        merkle_root_valid: true,
        timestamp: block.timestamp,
        bits: String(block.bits),
        nonce: block.nonce,
        block_hash: blockHash,
      },
      tx_count: allTxs.length,
      coinbase: {
        bip34_height: blockHeight,
        coinbase_script_hex: coinbaseScript,
        total_output_sats: coinbaseTotalOut,
      },
      transactions,
      block_stats: {
        total_fees_sats: totalFees,
        total_weight: totalWeight,
        avg_fee_rate_sat_vb:
          totalWeight > 0 ? totalFees / (totalWeight / 4) : 0,
        script_type_summary: scriptTypeSummary,
      },
    };

    // Cache by both height and hash for instant lookup either way
    cacheSet(heightOrHash, blockAnalysis);
    if (blockHash !== heightOrHash) cacheSet(blockHash, blockAnalysis);

    return NextResponse.json(blockAnalysis);
  } catch (error) {
    console.error("[block API] Error:", error);
    return NextResponse.json(
      {
        error: {
          message:
            error instanceof Error ? error.message : "Block analysis failed",
        },
      },
      { status: 500 },
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformTx(tx: any) {
  const totalIn = tx.vin.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sum: number, v: any) => sum + (v.prevout?.value ?? 0),
    0,
  );
  const totalOut = tx.vout.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sum: number, v: any) => sum + (v.value ?? 0),
    0,
  );
  const fee = tx.fee ?? 0;
  const weight = tx.weight ?? 0;
  const vbytes = Math.ceil(weight / 4);
  const isSegwit = tx.vin.some(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (v: any) => v.witness && v.witness.length > 0,
  );

  return {
    ok: true,
    network: "mainnet",
    segwit: isSegwit,
    txid: tx.txid,
    wtxid: null,
    version: tx.version,
    locktime: tx.locktime,
    size_bytes: tx.size,
    weight,
    vbytes,
    total_input_sats: totalIn,
    total_output_sats: totalOut,
    fee_sats: fee,
    fee_rate_sat_vb: vbytes > 0 ? +(fee / vbytes).toFixed(2) : 0,
    rbf_signaling: tx.vin.some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (v: any) => v.sequence < 0xfffffffe,
    ),
    locktime_type:
      tx.locktime === 0 ? "none" : tx.locktime < 500_000_000 ? "block" : "time",
    locktime_value: tx.locktime,
    segwit_savings: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vin: tx.vin.map((v: any) => ({
      txid: v.txid || "0".repeat(64),
      vout: v.vout ?? 0,
      sequence: v.sequence,
      script_sig_hex: v.scriptsig || "",
      script_asm: v.scriptsig_asm || "",
      witness: v.witness || [],
      script_type:
        v.prevout?.scriptpubkey_type ||
        (v.is_coinbase ? "coinbase" : "unknown"),
      address: v.prevout?.scriptpubkey_address || null,
      prevout: {
        value_sats: v.prevout?.value ?? 0,
        script_pubkey_hex: v.prevout?.scriptpubkey || "",
      },
      relative_timelock: {
        enabled: false,
      },
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vout: tx.vout.map((v: any, i: number) => ({
      n: i,
      value_sats: v.value,
      script_pubkey_hex: v.scriptpubkey || "",
      script_asm: v.scriptpubkey_asm || "",
      script_type: v.scriptpubkey_type || "unknown",
      address: v.scriptpubkey_address || null,
      ...(v.scriptpubkey_type === "op_return"
        ? {
            op_return_data_hex: v.scriptpubkey?.slice(4) || "",
            op_return_data_utf8: null,
          }
        : {}),
    })),
    warnings: [],
  };
}
