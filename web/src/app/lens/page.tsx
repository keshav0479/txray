"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LensBackground } from "@/components/lens/LensBackground";
import { UploadCard } from "@/components/lens/UploadCard";
import { ContentScanLoader } from "@/components/lens/ContentScanLoader";
import { BlockOverview } from "@/components/lens/BlockOverview";
import { AnalysisView } from "@/components/lens/AnalysisView";
import type { AnalyzedTx } from "@/lib/layout";

// Translate raw API/CLI errors into friendly messages
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractErrorMessage(data: any): string {
  // Try to get the message from nested error object
  const msg = data?.error?.message || data?.message || (typeof data?.error === 'string' ? data.error : null);
  const code = data?.error?.code || data?.code || '';

  // Map known error codes to friendly messages
  const friendlyMessages: Record<string, string> = {
    INVALID_BLOCK: "This file doesn't appear to be a valid Bitcoin block. Please check you're uploading the correct .blk file.",
    MISSING_FILES: "Please upload all required files (blk, rev, and xor).",
    CLI_ERROR: "The parser encountered an error while reading the file. The data may be corrupted or in an unsupported format.",
    PARSE_ERROR: "Unable to parse the output. The file format may not be supported.",
  };

  if (code && friendlyMessages[code]) return friendlyMessages[code];
  if (msg) return msg;
  return "Something went wrong while analyzing the file. Please try again.";
}

export default function LensPage() {
  const [analysisState, setAnalysisState] = useState<"input" | "loading" | "block_overview" | "tx_detail">("input");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [analysisData, setAnalysisData] = useState<any | null>(null);
  const [selectedTx, setSelectedTx] = useState<AnalyzedTx | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleDemoAnalysis = async (fixture: string) => {
    setAnalysisState("loading");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoFixture: fixture }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false || data.error) {
        throw new Error(extractErrorMessage(data));
      }
      setAnalysisData(data);
      setTimeout(() => setAnalysisState(data.is_block ? "block_overview" : "tx_detail"), 2500); 
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setAnalysisState("input");
    }
  };

  const handleFileUpload = async ({ blk, rev, xor }: { blk: File; rev: File; xor: File }) => {
    setUploading(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append("blk", blk);
      if (rev) formData.append("rev", rev);
      if (xor) formData.append("xor", xor);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || data.ok === false || data.error) {
        throw new Error(extractErrorMessage(data));
      }
      setAnalysisData(data);
      setUploading(false);
      setAnalysisState("loading");
      setTimeout(() => setAnalysisState(data.is_block ? "block_overview" : "tx_detail"), 2500); 
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setUploading(false);
    }
  };

  const handleFixtureAnalysis = async (jsonStr: string) => {
    setErrorMsg(null);
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      setErrorMsg("Invalid JSON. Please paste a valid fixture object.");
      return;
    }
    if (!parsed.raw_tx || !parsed.prevouts) {
      setErrorMsg("Fixture must contain \"raw_tx\" and \"prevouts\" fields.");
      return;
    }
    setAnalysisState("loading");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonStr,
      });
      const data = await res.json();
      if (!res.ok || data.ok === false || data.error) {
        throw new Error(extractErrorMessage(data));
      }
      setAnalysisData(data);
      setTimeout(() => setAnalysisState("tx_detail"), 2500);
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setAnalysisState("input");
    }
  };

  return (
    <>
      <LensBackground />
      <div className={`min-h-screen pt-24 pb-12 px-6 flex flex-col items-center justify-center relative z-10 w-full ${analysisState !== "tx_detail" && analysisState !== "block_overview" ? 'max-w-7xl mx-auto' : ''} text-white`}>
        
        <AnimatePresence mode="wait">
          {analysisState === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-20"
            >
              
              {/* LEFT COLUMN: Narrative Guide */}
              <div className="flex-1 text-center lg:text-left flex flex-col items-center lg:items-start">
                
                <h1 className="text-5xl lg:text-6xl font-bold tracking-tight mb-2 text-white">
                  txray Lens
                </h1>
                
                <p className="text-lg text-zinc-400 mb-12 leading-relaxed max-w-md">
                  Feed raw Bitcoin Core files into the lens, and watch it reconstruct the ledger into a pristine visual graph.
                </p>

                <div className="flex flex-col gap-8 w-full max-w-sm text-left relative z-10">
                  <div className="flex items-start gap-5">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-black/40 border border-white/10 shadow-[inner_0_0_10px_rgba(255,255,255,0.05)] flex items-center justify-center text-lens-400 font-bold font-mono text-sm">1</div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">Feed the Machine</h3>
                      <p className="text-sm text-zinc-500">Select a demo block, upload raw .dat files, or paste a fixture JSON.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-5">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-black/40 border border-white/10 shadow-[inner_0_0_10px_rgba(255,255,255,0.05)] flex items-center justify-center text-lens-400 font-bold font-mono text-sm">2</div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">X-Ray Scan</h3>
                      <p className="text-sm text-zinc-500">Wait securely while the Rust engine parses the raw hex data.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-5">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-black/40 border border-white/10 shadow-[inner_0_0_10px_rgba(255,255,255,0.05)] flex items-center justify-center text-lens-400 font-bold font-mono text-sm">3</div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">Read the Ledger</h3>
                      <p className="text-sm text-zinc-400">Explore the beautifully reconstructed block architecture.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: The Input UI */}
              <div className="flex-1 w-full max-w-xl relative">
                <div className="relative">
                  <UploadCard 
                    onAnalyzeDemo={handleDemoAnalysis} 
                    onAnalyzeFiles={handleFileUpload}
                    onAnalyzeFixture={handleFixtureAnalysis}
                    uploading={uploading}
                    errorMsg={errorMsg}
                    onDismissError={() => setErrorMsg(null)}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {analysisState === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full flex-1 flex items-center justify-center"
            >
              <ContentScanLoader />
            </motion.div>
          )}

          {analysisState === "block_overview" && analysisData && (
            <motion.div
              key="block_overview"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-full"
            >
              <BlockOverview 
                blockData={analysisData}
                onSelectTx={(tx) => {
                  setSelectedTx(tx);
                  setAnalysisState("tx_detail");
                }}
                onReset={() => { setAnalysisState("input"); setAnalysisData(null); }}
              />
            </motion.div>
          )}

          {analysisState === "tx_detail" && (analysisData || selectedTx) && (
            <motion.div
              key="tx_detail"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-full"
            >
              <AnalysisView 
                data={selectedTx || analysisData} 
                onReset={() => { setAnalysisState("input"); setAnalysisData(null); setSelectedTx(null); }} 
                onBack={analysisData?.is_block ? () => setAnalysisState("block_overview") : undefined}
              />
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </>
  );
}
