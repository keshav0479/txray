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
  ArrowRight,
} from "lucide-react";
import {
  fetchBlockByHeight,
  fetchBlock,
  fetchBlockTxs,
  type MempoolBlock,
  type MempoolTx,
  MempoolError,
} from "@/lib/mempool";
import { FAMOUS_ENTRIES } from "@/lib/famous";
import { Footer } from "@/components/shared/Footer";

export default function BlockExplorePage({
  params,
}: {
  params: Promise<{ height: string }>;
}) {

  const [block, setBlock] = useState<MempoolBlock | null>(null);
  const [txs, setTxs] = useState<MempoolTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // check if this is a famous block
  const famousEntry = block
    ? FAMOUS_ENTRIES.find(
        (e) => e.type === "block" && e.height === block.height,
      )
    : null;

  useEffect(() => {
    params.then(async (p) => {
      try {
        let blockData: MempoolBlock;

        if (/^\d+$/.test(p.height)) {
          blockData = await fetchBlockByHeight(parseInt(p.height, 10));
        } else {
          blockData = await fetchBlock(p.height);
        }

        setBlock(blockData);

        // fetch first page of transactions
        const blockTxs = await fetchBlockTxs(blockData.id);
        setTxs(blockTxs);
        setLoading(false);
      } catch (err) {
        setError(
          err instanceof MempoolError
            ? err.message
            : "Failed to fetch block",
        );
        setLoading(false);
      }
    });
  }, [params]);

  const handleCopy = () => {
    if (block) {
      navigator.clipboard.writeText(block.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
              Fetching block from mempool.space...
            </p>
          </motion.div>
        </div>
    );
  }

  if (error || !block) {
    return (
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              Block Not Found
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

  const blockTime = new Date(block.timestamp * 1000);

  return (
      <div className="min-h-screen flex flex-col">
      <div className="flex-1 max-w-5xl mx-auto px-6 pt-20 pb-16 w-full">
        {/* Back */}
        <Link
          href={famousEntry ? "/explore/famous" : "/"}
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        {/* Famous block annotation */}
        {famousEntry && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/15"
          >
            <div className="text-[10px] uppercase tracking-widest text-amber-400 font-mono font-bold mb-1">
              Famous Block
            </div>
            <h2 className="text-lg font-bold text-white mb-1">
              {famousEntry.name}
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {famousEntry.story}
            </p>
            <p className="text-xs text-amber-400/60 mt-2 leading-relaxed">
              {famousEntry.whyInteresting}
            </p>
          </motion.div>
        )}

        {/* Block header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2">
            Block #{block.height.toLocaleString()}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-mono text-zinc-500 truncate max-w-75">
              {block.id}
            </span>
            <button
              onClick={handleCopy}
              className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
            >
              {copied ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
            <a
              href={`https://mempool.space/block/${block.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              mempool.space
            </a>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
        >
          <StatBox
            label="Transactions"
            value={block.tx_count.toLocaleString()}
          />
          <StatBox
            label="Size"
            value={`${(block.size / 1_000_000).toFixed(2)} MB`}
          />
          <StatBox
            label="Weight"
            value={`${(block.weight / 1_000_000).toFixed(2)} MWU`}
          />
          <StatBox
            label="Timestamp"
            value={blockTime.toLocaleDateString()}
            sub={blockTime.toLocaleTimeString()}
          />
        </motion.div>

        {/* Transaction list */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/5 bg-surface-card/50 overflow-hidden"
        >
          <div className="px-5 py-3 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">
              Transactions (showing first {txs.length} of{" "}
              {block.tx_count.toLocaleString()})
            </h2>
          </div>
          <div className="divide-y divide-white/5">
            {txs.map((tx) => (
              <Link
                key={tx.txid}
                href={`/explore/tx/${tx.txid}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-white/2 transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-mono text-zinc-300 truncate block">
                    {tx.txid.slice(0, 24)}...
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-zinc-600 font-mono">
                      {tx.vin.length} in → {tx.vout.length} out
                    </span>
                    <span className="text-[10px] text-zinc-600 font-mono">
                      {tx.fee.toLocaleString()} sats fee
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-lens-400 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Analysis handoff */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center py-8 border-t border-white/5 mt-8"
        >
          <p className="text-sm text-zinc-500">
            Click any transaction above to open full Lens scrollytelling analysis for that tx.
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
