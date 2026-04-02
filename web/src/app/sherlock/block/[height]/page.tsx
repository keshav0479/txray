"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Loader2,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Footer } from "@/components/shared/Footer";

interface TransactionPrivacy {
  txid: string;
  isCoinbase: boolean;
  fingerprint: Record<string, unknown> | null;
  advice: Record<string, unknown> | null;
  error?: string;
}

interface BlockPrivacyData {
  ok: boolean;
  height: number;
  hash: string;
  txCount: number;
  transactions: TransactionPrivacy[];
  summary: {
    analyzedCount: number;
    coinbaseCount: number;
    failedCount: number;
  };
}

export default function SherlockBlockPage({
  params,
}: {
  params: Promise<{ height: string }>;
}) {
  const [height, setHeight] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BlockPrivacyData | null>(null);

  useEffect(() => {
    params.then(async (p) => {
      setHeight(p.height);
      try {
        const res = await fetch(`/api/sherlock/block/${p.height}`);
        const json = await res.json();

        if (!json.ok) {
          setError(json.error?.message || "Failed to analyze block");
          setLoading(false);
          return;
        }

        setData(json);
        setLoading(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to analyze block",
        );
        setLoading(false);
      }
    });
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 text-sherlock-400 animate-spin" />
          <p className="text-zinc-400 text-sm">
            Running privacy analysis on block {height}...
          </p>
          <p className="text-zinc-500 text-xs">This may take a moment</p>
        </motion.div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              Analysis Failed
            </h2>
            <p className="text-stone-400 text-sm mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/sherlock"
                className="px-6 py-2 rounded-full bg-sherlock-600 text-white font-semibold text-sm hover:bg-sherlock-500 transition-colors"
              >
                Back to Sherlock
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-stone-950/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Shield className="w-5 h-5 text-sherlock-400" />
                <h1 className="text-xl font-bold text-white">
                  Block Privacy Analysis
                </h1>
              </div>
              <p className="text-sm text-zinc-400">
                Block {data.height} • {data.txCount} transactions
              </p>
            </div>
            <Link
              href="/sherlock"
              className="px-4 py-2 rounded-full bg-sherlock-600 text-white text-sm font-semibold hover:bg-sherlock-500 transition-colors"
            >
              Back to Sherlock
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-stone-900/50 border border-white/10 rounded-xl p-4">
            <div className="text-2xl font-bold text-white mb-1">
              {data.txCount}
            </div>
            <div className="text-sm text-zinc-400">Total Transactions</div>
          </div>
          <div className="bg-stone-900/50 border border-white/10 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-400 mb-1">
              {data.summary.analyzedCount}
            </div>
            <div className="text-sm text-zinc-400">Analyzed</div>
          </div>
          <div className="bg-stone-900/50 border border-white/10 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-400 mb-1">
              {data.summary.coinbaseCount}
            </div>
            <div className="text-sm text-zinc-400">Coinbase</div>
          </div>
          <div className="bg-stone-900/50 border border-white/10 rounded-xl p-4">
            <div className="text-2xl font-bold text-red-400 mb-1">
              {data.summary.failedCount}
            </div>
            <div className="text-sm text-zinc-400">Failed</div>
          </div>
        </div>

        {/* Transaction List */}
        <div className="bg-stone-900/30 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-lg font-bold text-white">
              Transaction Privacy Reports
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              {data.txCount > 50
                ? `Showing first 50 of ${data.txCount} transactions`
                : `All ${data.txCount} transactions`}
            </p>
          </div>
          <div className="divide-y divide-white/10">
            {data.transactions.map((tx) => (
              <div
                key={tx.txid}
                className="px-6 py-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Link
                        href={`/tx/${tx.txid}`}
                        className="font-mono text-sm text-sherlock-400 hover:text-sherlock-300 truncate"
                      >
                        {tx.txid}
                      </Link>
                      {tx.isCoinbase && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          Coinbase
                        </span>
                      )}
                    </div>
                    {tx.error ? (
                      <div className="flex items-center gap-2 text-xs text-red-400">
                        <XCircle className="w-3 h-3" />
                        <span>{tx.error}</span>
                      </div>
                    ) : tx.isCoinbase ? (
                      <div className="text-xs text-zinc-500">
                        Coinbase transactions do not require privacy analysis
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {tx.fingerprint && (
                          <div className="bg-sherlock-500/10 border border-sherlock-500/20 rounded-lg p-3">
                            <div className="font-semibold text-sherlock-400 mb-1">
                              Wallet Fingerprint
                            </div>
                            <div className="text-zinc-400 font-mono text-[11px] line-clamp-2">
                              {JSON.stringify(tx.fingerprint).substring(0, 100)}
                              ...
                            </div>
                          </div>
                        )}
                        {tx.advice && (
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                            <div className="font-semibold text-amber-400 mb-1">
                              Privacy Advice
                            </div>
                            <div className="text-zinc-400 font-mono text-[11px] line-clamp-2">
                              {JSON.stringify(tx.advice).substring(0, 100)}...
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    {!tx.error &&
                      !tx.isCoinbase &&
                      (tx.fingerprint || tx.advice) && (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {data.txCount > 50 && (
          <div className="mt-4 text-center text-sm text-zinc-500">
            Analysis limited to first 50 transactions for performance. Use the
            Upload Files tab to analyze complete block files.
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
