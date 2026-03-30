"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { fetchTx, type MempoolTx, MempoolError } from "@/lib/mempool";
import { Footer } from "@/components/shared/Footer";

export default function TxExplorePage({
  params,
}: {
  params: Promise<{ txid: string }>;
}) {
  const [txid, setTxid] = useState<string>("");
  const [tx, setTx] = useState<MempoolTx | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    params.then((p) => {
      setTxid(p.txid);
      fetchTx(p.txid)
        .then((data) => {
          setTx(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(
            err instanceof MempoolError
              ? err.message
              : "Failed to fetch transaction",
          );
          setLoading(false);
        });
    });
  }, [params]);

  const handleCopy = () => {
    navigator.clipboard.writeText(txid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 text-lens-400 animate-spin" />
          <p className="text-zinc-400 text-sm">
            Fetching transaction from mempool.space...
          </p>
          <p className="text-zinc-600 text-xs font-mono">
            {txid.slice(0, 20)}...
          </p>
        </motion.div>
      </div>
    );
  }

  if (error || !tx) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            Transaction Not Found
          </h2>
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

  const feeBtc = (tx.fee / 100_000_000).toFixed(8);
  const feeRate = ((tx.fee * 4) / tx.weight).toFixed(1);
  const totalOut = tx.vout.reduce((s, o) => s + o.value, 0);
  const totalOutBtc = (totalOut / 100_000_000).toFixed(8);
  const isConfirmed = tx.status.confirmed;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 max-w-5xl mx-auto px-6 pt-20 pb-16 w-full">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`text-[10px] uppercase tracking-widest font-mono font-bold px-2 py-0.5 rounded-md border ${isConfirmed ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}
            >
              {isConfirmed ? "Confirmed" : "Unconfirmed"}
            </span>
            {isConfirmed && tx.status.block_height && (
              <Link
                href={`/explore/block/${tx.status.block_height}`}
                className="text-[10px] font-mono text-zinc-500 hover:text-lens-400 transition-colors"
              >
                Block #{tx.status.block_height.toLocaleString()}
              </Link>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-mono break-all mb-2">
            {txid}
          </h1>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
            >
              {copied ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
            <a
              href={`https://mempool.space/tx/${txid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              mempool.space
            </a>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
        >
          <StatBox label="Fee" value={`${tx.fee.toLocaleString()} sats`} sub={`${feeBtc} BTC`} />
          <StatBox label="Fee Rate" value={`${feeRate} sat/vB`} />
          <StatBox label="Size" value={`${tx.weight} WU`} sub={`${Math.ceil(tx.weight / 4)} vB`} />
          <StatBox label="Value Out" value={`${totalOutBtc} BTC`} />
        </motion.div>

        {/* Inputs & Outputs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {/* Inputs */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-white/5 bg-surface-card/50 overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">
                Inputs ({tx.vin.length})
              </h2>
              <span className="text-[10px] font-mono text-zinc-500 uppercase">
                Lens
              </span>
            </div>
            <div className="divide-y divide-white/5">
              {tx.vin.map((input, i) => (
                <div key={i} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-300 truncate max-w-[60%]">
                      {input.is_coinbase
                        ? "Coinbase"
                        : input.prevout?.scriptpubkey_address ||
                          `${input.txid.slice(0, 16)}...:${input.vout}`}
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-semibold shrink-0">
                      {input.prevout
                        ? `${(input.prevout.value / 100_000_000).toFixed(8)} BTC`
                        : "—"}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-600 mt-1 uppercase font-mono">
                    {input.prevout?.scriptpubkey_type || "coinbase"}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Outputs */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-white/5 bg-surface-card/50 overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">
                Outputs ({tx.vout.length})
              </h2>
            </div>
            <div className="divide-y divide-white/5">
              {tx.vout.map((output, i) => (
                <div key={i} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-300 truncate max-w-[60%]">
                      {output.scriptpubkey_address || "Unknown"}
                    </span>
                    <span className="text-xs font-mono text-violet-400 font-semibold shrink-0">
                      {(output.value / 100_000_000).toFixed(8)} BTC
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-600 mt-1 uppercase font-mono">
                    {output.scriptpubkey_type}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Coming soon notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center py-8 border-t border-white/5"
        >
          <p className="text-sm text-zinc-500">
            Full scrollytelling analysis, privacy heuristics, and animated
            flow graphs coming in the next update.
          </p>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
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
      {sub && (
        <div className="text-[10px] text-zinc-600 mt-1 font-mono">{sub}</div>
      )}
    </div>
  );
}
