"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, ExternalLink } from "lucide-react";
import { BlockOverview } from "@/components/lens/BlockOverview";
import { AnalysisView } from "@/components/lens/AnalysisView";
import { ContentScanLoader } from "@/components/lens/ContentScanLoader";
import type { BlockAnalysis, AnalyzedTx } from "@/lib/layout";
import { FAMOUS_ENTRIES } from "@/lib/famous";
import { Footer } from "@/components/shared/Footer";

export default function BlockExplorePage({
  params,
}: {
  params: Promise<{ height: string }>;
}) {
  const router = useRouter();
  const [blockData, setBlockData] = useState<BlockAnalysis | null>(null);
  const [selectedTx, setSelectedTx] = useState<AnalyzedTx | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then(async (p) => {
      try {
        const start = Date.now();
        const res = await fetch(`/api/block/${p.height}`);
        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data?.error?.message || "Failed to load block");
        }

        // Ensure scanner animation shows for at least 2.5s for premium feel
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, 2500 - elapsed);

        setTimeout(() => {
          setBlockData(data);
          setLoading(false);
          window.scrollTo({ top: 0, behavior: "instant" });
        }, remaining);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load block");
        setLoading(false);
      }
    });
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ContentScanLoader />
      </div>
    );
  }

  if (error || !blockData) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Block Not Found</h2>
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

  // Check if this is a famous block
  const famousEntry = FAMOUS_ENTRIES.find(
    (e) => e.type === "block" && e.height === blockData.coinbase.bip34_height,
  );

  // If a transaction is selected, show the scrollytelling analysis
  if (selectedTx) {
    return (
      <div className="min-h-screen">
        <AnalysisView
          data={selectedTx}
          onReset={() => router.push("/")}
          onBack={() => setSelectedTx(null)}
        />
        <Footer />
      </div>
    );
  }

  // Otherwise, show the block overview
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        {/* Back button + Famous annotation */}
        <div className="max-w-7xl mx-auto px-6 pt-8 pb-0">
          <div className="flex items-center justify-between mb-6">
            <Link
              href={famousEntry ? "/explore/famous" : "/"}
              className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
            <a
              href={`https://mempool.space/block/${blockData.block_header.block_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-amber-400 transition-colors"
            >
              <span className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/40 inline-block" />
              mempool.space
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {famousEntry && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 p-4 rounded-xl bg-linear-to-br from-amber-950/40 via-stone-900/60 to-stone-950/80 border border-amber-500/20 backdrop-blur-xl"
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
        </div>

        <BlockOverview
          blockData={blockData}
          onSelectTx={(tx) => setSelectedTx(tx)}
          onReset={() => router.push("/")}
          resetLabel="-> Back to Search"
        />
      </div>

      <Footer />
    </div>
  );
}
