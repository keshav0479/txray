"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  Upload,
  Loader2,
  AlertTriangle,
  Code2,
  FileJson,
  Search,
} from "lucide-react";
import { TimelineSection } from "@/components/shared/TimelineCard";
import { ScrollIndicator } from "@/components/shared/ScrollIndicator";
import { BottomCTA } from "@/components/shared/BottomCTA";
import {
  AnimatedGlobe,
  AnimatedBlocks,
  AnimatedMiners,
  AnimatedTransaction,
  AnimatedLens,
} from "@/components/lens/AnimatedGraphics";
import { Footer } from "@/components/shared/Footer";
import { ContentScanLoader } from "@/components/lens/ContentScanLoader";
import { BlockOverview } from "@/components/lens/BlockOverview";
import { AnalysisView } from "@/components/lens/AnalysisView";
import type { AnalyzedTx, BlockAnalysis } from "@/lib/layout";
import { detectSearchType } from "@/lib/mempool";

type TabId = "search" | "upload" | "rawhex" | "json";
type ViewState = "input" | "loading" | "results";

const STORY_CARDS = [
  {
    title: "Bitcoin is shared money records",
    description:
      "Bitcoin is a digital currency that works without any bank or company in charge. Instead, thousands of computers around the world keep a shared record of every transaction ever made.",
    Graphic: AnimatedGlobe,
  },
  {
    title: "Those records are grouped into blocks",
    description:
      "This shared record is called a blockchain, a giant list of pages (called blocks), each containing hundreds of transactions. Think of it like a public accounting book that anyone can read but nobody can alter.",
    Graphic: AnimatedBlocks,
  },
  {
    title: "Transactions wait in the mempool",
    description:
      "When you send Bitcoin, your transaction goes into a waiting room called the mempool. Miners sweep through this pool and bundle hundreds of waiting transactions together to form a new block.",
    Graphic: AnimatedTransaction,
  },
  {
    title: "Miners secure blocks through proof-of-work",
    description:
      "Miners race against each other to solve a complex mathematical puzzle to lock in that newly bundled block. The winner gets the block reward, and the bundle is permanently added to the blockchain.",
    Graphic: AnimatedMiners,
  },
  {
    title: "Lens opens the block to explain it",
    description:
      "Each block contains a header, transactions, inputs, outputs, scripts, and fees. But this data is stored as raw bytes, making it completely unreadable to humans. That's where Lens comes in.",
    Graphic: AnimatedLens,
  },
];

export default function LensPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("search");
  const [viewState, setViewState] = useState<ViewState>("input");
  const [analysisData, setAnalysisData] = useState<
    AnalyzedTx | BlockAnalysis | null
  >(null);
  const [selectedTx, setSelectedTx] = useState<AnalyzedTx | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  // file upload state
  const [blkFile, setBlkFile] = useState<File | null>(null);
  const [revFile, setRevFile] = useState<File | null>(null);
  const [xorFile, setXorFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // raw hex state
  const [rawHex, setRawHex] = useState("");
  const [analyzingHex, setAnalyzingHex] = useState(false);

  // json fixture state
  const [jsonFixture, setJsonFixture] = useState("");
  const [analyzingJson, setAnalyzingJson] = useState(false);

  const startAnalysis = (data: unknown) => {
    setViewState("loading");
    setAnalysisData(data as AnalyzedTx | BlockAnalysis);
    setErrorMsg(null);

    // Smooth transition to results after scanner effect
    setTimeout(() => {
      setViewState("results");
    }, 2800);
  };

  const handleFileUpload = async () => {
    if (!blkFile || !revFile || !xorFile) return;
    setUploading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("blk", blkFile);
      formData.append("rev", revFile);
      formData.append("xor", xorFile);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || data.ok === false || data.error) {
        throw new Error(
          data?.error?.message || data?.message || "Analysis failed",
        );
      }

      startAnalysis(data);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRawHexSubmit = async () => {
    const hex = rawHex.trim().replace(/\s/g, "");
    if (!hex) {
      setErrorMsg("Please enter raw transaction hex");
      return;
    }
    if (!/^[0-9a-fA-F]+$/.test(hex)) {
      setErrorMsg("Invalid hex: must contain only 0-9 and a-f characters");
      return;
    }

    setAnalyzingHex(true);
    setErrorMsg(null);

    try {
      const fixture = {
        network: "mainnet",
        raw_tx: hex,
        prevouts: [],
      };

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fixture),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false || data.error) {
        throw new Error(
          data?.error?.message || data?.message || "Analysis failed",
        );
      }

      startAnalysis(data);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setAnalyzingHex(false);
    }
  };

  const handleJsonSubmit = async () => {
    const json = jsonFixture.trim();
    if (!json) {
      setErrorMsg("Please enter a JSON fixture");
      return;
    }

    setAnalyzingJson(true);
    setErrorMsg(null);

    try {
      let parsed;
      try {
        parsed = JSON.parse(json);
      } catch {
        throw new Error("Invalid JSON syntax");
      }

      if (!parsed.raw_tx || typeof parsed.raw_tx !== "string") {
        throw new Error("JSON must include a 'raw_tx' field with hex string");
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false || data.error) {
        throw new Error(
          data?.error?.message || data?.message || "Analysis failed",
        );
      }

      startAnalysis(data);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setAnalyzingJson(false);
    }
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) {
      setErrorMsg("Enter a transaction ID or block height");
      return;
    }

    setSearching(true);
    setErrorMsg(null);

    const type = detectSearchType(query);
    if (type === "block_height") {
      router.push(`/explore/block/${query}`);
    } else if (type === "txid" || type === "block_hash") {
      router.push(`/tx/${query}`);
    } else {
      setErrorMsg("Enter a valid transaction ID (64 hex) or block height.");
      setSearching(false);
    }
  };

  const reset = () => {
    setViewState("input");
    setAnalysisData(null);
    setSelectedTx(null);
    setErrorMsg(null);
  };

  const allFilesSelected = blkFile && revFile && xorFile;

  return (
    <div className="min-h-screen flex flex-col">
      <AnimatePresence mode="wait">
        {viewState === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1"
          >
            {/* Hero section */}
            <div className="max-w-4xl mx-auto px-6 pt-24 pb-16 w-full relative z-10">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lens-500/10 border border-lens-500/20 text-lens-400 text-xs font-mono uppercase tracking-widest mb-4">
                  <Eye className="w-3.5 h-3.5" />
                  Lens
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
                  Structural Analysis
                </h1>
                <p className="text-stone-400 text-lg max-w-lg mx-auto">
                  Upload Bitcoin Core block files, paste raw transaction hex, or
                  provide a JSON fixture for full structural breakdown.
                </p>
              </motion.div>

              {/* Tab Bar */}
              <div className="flex justify-center mb-10">
                <div className="inline-flex rounded-2xl bg-stone-950/60 backdrop-blur-xl border border-white/8 p-1 max-w-full overflow-x-auto scrollbar-hide">
                  {[
                    {
                      id: "search" as const,
                      icon: Search,
                      label: "Search Online",
                    },
                    { id: "rawhex" as const, icon: Code2, label: "Paste Hex" },
                    {
                      id: "json" as const,
                      icon: FileJson,
                      label: "Paste JSON",
                    },
                    {
                      id: "upload" as const,
                      icon: Upload,
                      label: "Upload Files",
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setErrorMsg(null);
                      }}
                      className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                        activeTab === tab.id
                          ? "bg-lens-500/15 text-lens-400 border border-lens-500/20"
                          : "text-stone-500 hover:text-stone-300"
                      }`}
                    >
                      <tab.icon className="w-4 h-4 shrink-0" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Cards */}
              <div className="max-w-lg mx-auto">
                <AnimatePresence mode="wait">
                  {activeTab === "search" && (
                    <motion.div
                      key="search"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="rounded-3xl border border-white/8 bg-stone-950/50 backdrop-blur-xl p-8"
                    >
                      <div className="text-center mb-6">
                        <Search className="w-10 h-10 text-lens-500 mx-auto mb-3 opacity-80" />
                        <h3 className="text-xl font-bold text-white mb-2">
                          Search Online
                        </h3>
                        <p className="text-sm text-stone-400">
                          Enter a transaction ID or block height to fetch and
                          analyze from mempool.space
                        </p>
                      </div>
                      <div className="space-y-4 mb-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-mono text-stone-500 uppercase tracking-widest ml-1">
                            Transaction ID or Block Height
                          </label>
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleSearch()
                            }
                            placeholder="txid or block height..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-600 focus:outline-none focus:border-lens-500/30 transition-colors font-mono"
                          />
                          <div className="flex flex-wrap items-center gap-2 mt-2 ml-1">
                            <span className="text-[10px] text-stone-500 uppercase tracking-widest mr-1">
                              Famous:
                            </span>
                            {[
                              { value: "0", label: "Genesis" },
                              { value: "170", label: "First Tx" },
                              { value: "57043", label: "Pizza Day" },
                            ].map((b) => (
                              <button
                                key={b.value}
                                type="button"
                                onClick={() => setSearchQuery(b.value)}
                                className="text-xs px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-stone-400 hover:text-white hover:border-lens-500/50 hover:bg-lens-500/10 transition-all flex items-center gap-1.5"
                              >
                                <span className="font-mono text-lens-400 opacity-80">
                                  {b.value}
                                </span>
                                <span>{b.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      {errorMsg && activeTab === "search" && (
                        <div className="mb-4 flex items-center gap-2 text-xs text-red-400">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span className="flex-1">{errorMsg}</span>
                          <button
                            onClick={() => setErrorMsg(null)}
                            className="text-red-400/50 hover:text-red-300"
                          >
                            &#x2715;
                          </button>
                        </div>
                      )}
                      <button
                        onClick={handleSearch}
                        disabled={searching || !searchQuery.trim()}
                        className="group w-full flex items-center justify-center gap-2 font-bold px-6 py-4 rounded-xl transition-all duration-300 border bg-transparent border-lens-500/50 text-lens-400 hover:bg-lens-500/10 hover:border-lens-400 hover:text-lens-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.3),inset_0_0_10px_rgba(59,130,246,0.1)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-transparent disabled:hover:border-lens-500/50 disabled:hover:text-lens-400 text-sm"
                      >
                        {searching ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />{" "}
                            Searching...
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 opacity-80 group-hover:opacity-100 transition-opacity" />{" "}
                            Analyze
                          </>
                        )}
                      </button>
                    </motion.div>
                  )}

                  {activeTab === "upload" && (
                    <motion.div
                      key="upload"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="rounded-3xl border border-white/8 bg-stone-950/50 backdrop-blur-xl p-8"
                    >
                      <div className="text-center mb-6">
                        <Upload className="w-10 h-10 text-lens-500 mx-auto mb-3 opacity-80" />
                        <h3 className="text-xl font-bold text-white mb-2">
                          Upload Block Data
                        </h3>
                        <p className="text-sm text-stone-400">
                          Upload raw <code className="text-lens-400">.dat</code>{" "}
                          files from your Bitcoin Core{" "}
                          <code className="text-lens-400">blocks/</code>{" "}
                          directory.
                        </p>
                      </div>
                      <div className="space-y-4 mb-6">
                        {[
                          {
                            label: "BLK File",
                            setter: setBlkFile,
                            file: blkFile,
                          },
                          {
                            label: "REV File",
                            setter: setRevFile,
                            file: revFile,
                          },
                          {
                            label: "XOR File",
                            setter: setXorFile,
                            file: xorFile,
                          },
                        ].map(({ label, setter, file }) => (
                          <div key={label} className="space-y-1">
                            <label className="text-[10px] font-mono text-stone-500 uppercase tracking-widest ml-1">
                              {label} <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="file"
                              accept=".dat"
                              onChange={(e) =>
                                setter(e.target.files?.[0] || null)
                              }
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-stone-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-stone-800 file:text-stone-300 hover:file:bg-stone-700 cursor-pointer transition-colors"
                            />
                            {file && (
                              <p className="text-[10px] font-mono text-lens-400/60 ml-1">
                                {file.name}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                      {errorMsg && activeTab === "upload" && (
                        <div className="mb-4 flex items-center gap-2 text-xs text-red-400">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span className="flex-1">{errorMsg}</span>
                          <button
                            onClick={() => setErrorMsg(null)}
                            className="text-red-400/50 hover:text-red-300"
                          >
                            &#x2715;
                          </button>
                        </div>
                      )}
                      <button
                        onClick={handleFileUpload}
                        disabled={uploading || !allFilesSelected}
                        className="group w-full flex items-center justify-center gap-2 font-bold px-6 py-4 rounded-xl transition-all duration-300 border bg-transparent border-lens-500/50 text-lens-400 hover:bg-lens-500/10 hover:border-lens-400 hover:text-lens-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.3),inset_0_0_10px_rgba(59,130,246,0.1)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-transparent disabled:hover:border-lens-500/50 disabled:hover:text-lens-400 text-sm"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />{" "}
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 opacity-80 group-hover:opacity-100 transition-opacity" />{" "}
                            Analyze
                          </>
                        )}
                      </button>
                    </motion.div>
                  )}

                  {activeTab === "rawhex" && (
                    <motion.div
                      key="rawhex"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="rounded-3xl border border-white/8 bg-stone-950/50 backdrop-blur-xl p-8"
                    >
                      <div className="text-center mb-6">
                        <Code2 className="w-10 h-10 text-lens-500 mx-auto mb-3 opacity-80" />
                        <h3 className="text-xl font-bold text-white mb-2">
                          Raw Transaction Hex
                        </h3>
                        <p className="text-sm text-stone-400">
                          Paste raw transaction hex from your node or testnet.
                        </p>
                      </div>
                      <div className="mb-6">
                        <label className="text-[10px] font-mono text-stone-500 uppercase tracking-widest ml-1 mb-1 block">
                          Transaction Hex{" "}
                          <span className="text-red-400">*</span>
                        </label>
                        <textarea
                          value={rawHex}
                          onChange={(e) => setRawHex(e.target.value)}
                          placeholder="0100000001abc123..."
                          className="w-full h-40 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-stone-300 font-mono placeholder:text-stone-600 focus:outline-none focus:border-lens-500/40 transition-colors resize-none"
                        />
                      </div>
                      {errorMsg && activeTab === "rawhex" && (
                        <div className="mb-4 flex items-center gap-2 text-xs text-red-400">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span className="flex-1">{errorMsg}</span>
                          <button
                            onClick={() => setErrorMsg(null)}
                            className="text-red-400/50 hover:text-red-300"
                          >
                            &#x2715;
                          </button>
                        </div>
                      )}
                      <button
                        onClick={handleRawHexSubmit}
                        disabled={analyzingHex || !rawHex.trim()}
                        className="group w-full flex items-center justify-center gap-2 font-bold px-6 py-4 rounded-xl transition-all duration-300 border bg-transparent border-lens-500/50 text-lens-400 hover:bg-lens-500/10 hover:border-lens-400 hover:text-lens-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.3),inset_0_0_10px_rgba(59,130,246,0.1)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-transparent disabled:hover:border-lens-500/50 disabled:hover:text-lens-400 text-sm"
                      >
                        {analyzingHex ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />{" "}
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 opacity-80 group-hover:opacity-100 transition-opacity" />{" "}
                            Analyze
                          </>
                        )}
                      </button>
                    </motion.div>
                  )}

                  {activeTab === "json" && (
                    <motion.div
                      key="json"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="rounded-3xl border border-white/8 bg-stone-950/50 backdrop-blur-xl p-8"
                    >
                      <div className="text-center mb-6">
                        <FileJson className="w-10 h-10 text-lens-500 mx-auto mb-3 opacity-80" />
                        <h3 className="text-xl font-bold text-white mb-2">
                          JSON Fixture
                        </h3>
                        <p className="text-sm text-stone-400">
                          Paste a complete fixture with{" "}
                          <code className="text-lens-400">raw_tx</code> and{" "}
                          <code className="text-lens-400">prevouts</code>.
                        </p>
                      </div>
                      <div className="mb-4">
                        <label className="text-[10px] font-mono text-stone-500 uppercase tracking-widest ml-1 mb-1 block">
                          JSON Fixture <span className="text-red-400">*</span>
                        </label>
                        <textarea
                          value={jsonFixture}
                          onChange={(e) => setJsonFixture(e.target.value)}
                          placeholder={`{\n  "network": "mainnet",\n  "raw_tx": "0100...",\n  "prevouts": [...]\n}`}
                          className="w-full h-56 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-stone-300 font-mono placeholder:text-stone-600 focus:outline-none focus:border-lens-500/40 transition-colors resize-none"
                        />
                      </div>
                      {errorMsg && activeTab === "json" && (
                        <div className="mb-4 flex items-center gap-2 text-xs text-red-400">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span className="flex-1">{errorMsg}</span>
                          <button
                            onClick={() => setErrorMsg(null)}
                            className="text-red-400/50 hover:text-red-300"
                          >
                            &#x2715;
                          </button>
                        </div>
                      )}
                      <button
                        onClick={handleJsonSubmit}
                        disabled={analyzingJson || !jsonFixture.trim()}
                        className="group w-full flex items-center justify-center gap-2 font-bold px-6 py-4 rounded-xl transition-all duration-300 border bg-transparent border-lens-500/50 text-lens-400 hover:bg-lens-500/10 hover:border-lens-400 hover:text-lens-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.3),inset_0_0_10px_rgba(59,130,246,0.1)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-transparent disabled:hover:border-lens-500/50 disabled:hover:text-lens-400 text-sm"
                      >
                        {analyzingJson ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />{" "}
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 opacity-80 group-hover:opacity-100 transition-opacity" />{" "}
                            Analyze
                          </>
                        )}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <ScrollIndicator theme="lens" />
            <TimelineSection theme="lens" cards={STORY_CARDS} />
            <div className="max-w-4xl mx-auto w-full px-6">
              <BottomCTA
                theme="lens"
                title="Ready to see what's inside a real block?"
                description="Upload your own Bitcoin Core files or paste raw transaction data."
                buttonLabel="Open Analyzer"
                buttonIcon={<Eye className="w-5 h-5" />}
                onAction={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              />
            </div>
          </motion.div>
        )}

        {viewState === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center min-h-screen"
          >
            <ContentScanLoader />
          </motion.div>
        )}

        {viewState === "results" && analysisData && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col"
          >
            {selectedTx ? (
              <AnalysisView
                data={selectedTx}
                onReset={reset}
                onBack={() => setSelectedTx(null)}
              />
            ) : "transactions" in analysisData ? (
              <BlockOverview
                blockData={analysisData as BlockAnalysis}
                onSelectTx={(tx) => setSelectedTx(tx)}
                onReset={reset}
              />
            ) : (
              <AnalysisView data={analysisData as AnalyzedTx} onReset={reset} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <Footer />
    </div>
  );
}
