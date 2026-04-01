"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { AnalysisView } from "@/components/lens/AnalysisView";
import { Footer } from "@/components/shared/Footer";
import { fetchTx, fetchTxHex, MempoolError, type MempoolTx } from "@/lib/mempool";
import type { AnalyzedTx } from "@/lib/layout";

function mapToLensFixture(txHex: string, tx: MempoolTx) {
  return {
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
}

export default function TxExplorePage({
  params,
}: {
  params: Promise<{ txid: string }>;
}) {
  const router = useRouter();
  const [txid, setTxid] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzedTx | null>(null);
  const [fallbackTx, setFallbackTx] = useState<MempoolTx | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    params
      .then(async (p) => {
        if (!mounted) return;
        setTxid(p.txid);

        const tx = await fetchTx(p.txid);
        if (!mounted) return;

        // Coinbase tx has no prevout set; keep simplified fallback view.
        if (tx.vin.every((vin) => vin.is_coinbase)) {
          setFallbackTx(tx);
          setLoading(false);
          return;
        }

        const txHex = await fetchTxHex(p.txid);
        if (!mounted) return;

        const fixture = mapToLensFixture(txHex, tx);
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fixture),
        });
        const data = await res.json();

        if (!mounted) return;
        if (!res.ok || data.ok === false || data.error) {
          throw new Error(
            data?.error?.message ||
              data?.message ||
              "Could not run full Lens analysis for this transaction",
          );
        }

        setAnalysis(data as AnalyzedTx);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        const message =
          err instanceof MempoolError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to fetch transaction";
        setError(message);
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 text-lens-400 animate-spin" />
          <p className="text-zinc-400 text-sm">Preparing full Lens analysis</p>
          <p className="text-zinc-600 text-xs font-mono">{txid.slice(0, 20)}...</p>
        </motion.div>
      </div>
    );
  }

  if (analysis) {
    return (
      <AnalysisView
        data={analysis}
        onReset={() => router.push("/")}
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Transaction Not Found</h2>
          <p className="text-red-400/80 text-sm mb-6">{error}</p>
          <Link
            href="/"
            className="px-6 py-2 rounded-full bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-colors"
          >
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  if (fallbackTx) {
    const feeBtc = (fallbackTx.fee / 100_000_000).toFixed(8);
    const feeRate = ((fallbackTx.fee * 4) / fallbackTx.weight).toFixed(1);
    const totalOut = fallbackTx.vout.reduce((sum, output) => sum + output.value, 0);
    const totalOutBtc = (totalOut / 100_000_000).toFixed(8);

    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 max-w-3xl mx-auto px-6 pt-20 pb-16 w-full">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>

          <div className="rounded-2xl border border-white/8 bg-surface-card/40 p-6">
            <h1 className="text-lg font-bold text-white mb-2 break-all font-mono">{txid}</h1>
            <p className="text-sm text-zinc-400 mb-6">
              This is a coinbase transaction. Full input-side Lens flow is not available because coinbase has no prevout set
            </p>

            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Fee" value={`${fallbackTx.fee.toLocaleString()} sats`} sub={`${feeBtc} BTC`} />
              <StatBox label="Fee Rate" value={`${feeRate} sat/vB`} />
              <StatBox label="Size" value={`${fallbackTx.weight} WU`} sub={`${Math.ceil(fallbackTx.weight / 4)} vB`} />
              <StatBox label="Value Out" value={`${totalOutBtc} BTC`} />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return null;
}

function StatBox({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-surface-card/50 p-4">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-1">
        {label}
      </div>
      <div className="text-sm font-bold text-white font-mono">{value}</div>
      {sub && <div className="text-[10px] text-zinc-600 mt-1 font-mono">{sub}</div>}
    </div>
  );
}
