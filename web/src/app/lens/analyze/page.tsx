"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { UploadCard } from "@/components/lens/UploadCard";
import { ContentScanLoader } from "@/components/lens/ContentScanLoader";
import { BlockOverview } from "@/components/lens/BlockOverview";
import { AnalysisView } from "@/components/lens/AnalysisView";
import { Footer } from "@/components/shared/Footer";
import type { AnalyzedTx, BlockAnalysis } from "@/lib/layout";

function extractErrorMessage(data: unknown): string {
  const record = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  const error = typeof record.error === "object" && record.error !== null
    ? (record.error as Record<string, unknown>)
    : {};
  const code = typeof error.code === "string" ? error.code : "";
  const message =
    (typeof error.message === "string" && error.message) ||
    (typeof record.message === "string" && record.message) ||
    (typeof record.error === "string" && record.error) ||
    "";

  const friendly: Record<string, string> = {
    INVALID_BLOCK:
      "This file doesn't appear to be a valid Bitcoin block. Please check you're uploading the correct .blk file.",
    MISSING_FILES: "Please upload all required files: blk, rev, and xor.",
    CLI_ERROR: "The parser hit an error while reading the file data.",
    PARSE_ERROR: "Could not parse parser output. Please try another input.",
    DEMO_NOT_FOUND: "Demo fixture is not available in this environment.",
  };

  if (code && friendly[code]) return friendly[code];
  if (message) return message;
  return "Something went wrong while analyzing the input";
}

function LensAnalyzeContent() {
  const searchParams = useSearchParams();
  const [analysisState, setAnalysisState] = useState<
    "input" | "loading" | "block_overview" | "tx_detail"
  >("input");
  const [analysisData, setAnalysisData] = useState<AnalyzedTx | BlockAnalysis | null>(null);
  const [selectedTx, setSelectedTx] = useState<AnalyzedTx | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const runDemoAnalysis = async (fixture: string) => {
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
      setTimeout(() => {
        setAnalysisState(data.is_block ? "block_overview" : "tx_detail");
      }, 2500);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Analysis failed");
      setAnalysisState("input");
    }
  };

  const runFileAnalysis = async (files: { blk: File; rev: File; xor: File }) => {
    setUploading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("blk", files.blk);
      formData.append("rev", files.rev);
      formData.append("xor", files.xor);

      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || data.ok === false || data.error) {
        throw new Error(extractErrorMessage(data));
      }

      setAnalysisData(data);
      setUploading(false);
      setAnalysisState("loading");
      setTimeout(() => {
        setAnalysisState(data.is_block ? "block_overview" : "tx_detail");
      }, 2500);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Analysis failed");
      setUploading(false);
    }
  };

  const runFixtureAnalysis = async (jsonStr: string) => {
    setErrorMsg(null);
    let parsedFixture: Record<string, unknown>;

    try {
      parsedFixture = JSON.parse(jsonStr) as Record<string, unknown>;
    } catch {
      setErrorMsg("Invalid JSON: provide a valid fixture object");
      return;
    }

    if (!parsedFixture.raw_tx || !parsedFixture.prevouts) {
      setErrorMsg('Fixture must include "raw_tx" (or raw_hex) and "prevouts"');
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
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Analysis failed");
      setAnalysisState("input");
    }
  };

  useEffect(() => {
    if (analysisState !== "input") return;

    // Handle result passed from Lens launcher upload
    const from = searchParams.get("from");
    if (from === "upload") {
      const cached = sessionStorage.getItem("lens_result");
      if (cached) {
        sessionStorage.removeItem("lens_result");
        try {
          const data = JSON.parse(cached);
          setAnalysisData(data);
          setAnalysisState("loading");
          setTimeout(() => {
            setAnalysisState(data.is_block ? "block_overview" : "tx_detail");
          }, 2500);
          return;
        } catch { /* fall through to input */ }
      }
    }

    const demo = searchParams.get("demo");
    if (!demo) return;
    void runDemoAnalysis(demo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, analysisState]);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 pt-24 pb-12 px-6 flex flex-col items-center justify-center relative z-10 w-full text-white">
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
              <div className="flex-1 text-center lg:text-left flex flex-col items-center lg:items-start">
                <h1 className="text-5xl lg:text-6xl font-bold tracking-tight mb-2 text-white">
                  txray Lens
                </h1>
                <p className="text-lg text-zinc-400 mb-12 leading-relaxed max-w-md">
                  Feed raw Bitcoin Core files into the lens, then inspect every
                  transaction through interactive visual scrollytelling
                </p>
              </div>

              <div className="flex-1 w-full max-w-xl relative">
                <UploadCard
                  onAnalyzeDemo={runDemoAnalysis}
                  onAnalyzeFiles={runFileAnalysis}
                  onAnalyzeFixture={runFixtureAnalysis}
                  uploading={uploading}
                  errorMsg={errorMsg}
                  onDismissError={() => setErrorMsg(null)}
                />
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

          {analysisState === "block_overview" && analysisData && "transactions" in analysisData && (
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
                onReset={() => {
                  setAnalysisState("input");
                  setAnalysisData(null);
                  setSelectedTx(null);
                }}
              />
            </motion.div>
          )}

          {analysisState === "tx_detail" && (selectedTx || analysisData) && (
            <motion.div
              key="tx_detail"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-full"
            >
              <AnalysisView
                data={selectedTx || (analysisData as AnalyzedTx)}
                onReset={() => {
                  setAnalysisState("input");
                  setAnalysisData(null);
                  setSelectedTx(null);
                }}
                onBack={
                  analysisData && "transactions" in analysisData
                    ? () => setAnalysisState("block_overview")
                    : undefined
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-lens-400 animate-spin" />
        <p className="text-zinc-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}

export default function LensAnalyzePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LensAnalyzeContent />
    </Suspense>
  );
}
