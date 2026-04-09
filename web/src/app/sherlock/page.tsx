"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Loader2,
  AlertTriangle,
  Fingerprint,
  Upload,
  Code2,
  FileJson,
} from "lucide-react";
import { detectSearchType } from "@/lib/mempool";
import { UploadCard } from "@/components/sherlock/UploadCard";
import { TimelineSection } from "@/components/shared/TimelineCard";
import { ScrollIndicator } from "@/components/shared/ScrollIndicator";
import { BottomCTA } from "@/components/shared/BottomCTA";
import { Footer } from "@/components/shared/Footer";
import {
  AnimatedTrail,
  AnimatedCIOH,
  AnimatedChange,
  AnimatedDots,
} from "@/components/sherlock/StoryGraphics";

type TabId = "search" | "rawhex" | "json" | "upload";

const STORY_CARDS = [
  {
    title: "The immutable digital footprint",
    description:
      "Bitcoin operates on a transparent, immutable public ledger. Every transfer, every input, and every output leaves a permanent trace. Sherlock follows these digital footprints, uncovering the truth behind the pseudonyms.",
    Graphic: AnimatedTrail,
  },
  {
    title: "The common input ownership heuristic",
    description:
      "When a transaction spends multiple coins together, Sherlock assumes all those inputs belong to the same entity. This is the Common Input Ownership Heuristic (CIOH), the foundational rule that links isolated addresses into undeniable clusters.",
    Graphic: AnimatedCIOH,
  },
  {
    title: "Change always returns home",
    description:
      "Just like paying with a ₹500 note for a ₹300 item, Bitcoin sends change back to the sender. Sherlock detects this change output using script type matching, round number analysis, and value heuristics.",
    Graphic: AnimatedChange,
  },
  {
    title: "Sherlock connects the dots",
    description:
      "Using 8 independent heuristics, Sherlock classifies every transaction: simple payments, consolidations, CoinJoins, self-transfers, and more. Patterns emerge from the noise.",
    Graphic: AnimatedDots,
  },
];

export default function SherlockPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("search");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // raw hex state
  const [rawHex, setRawHex] = useState("");
  const [analyzingHex, setAnalyzingHex] = useState(false);

  // json fixture state
  const [jsonFixture, setJsonFixture] = useState("");
  const [analyzingJson, setAnalyzingJson] = useState(false);

  const handleSearch = () => {
    if (!query.trim()) return;
    setLoading(true);
    setErrorMsg(null);

    const type = detectSearchType(query.trim());
    if (type === "txid") {
      router.push(`/tx/${query.trim()}?tab=privacy`);
    } else if (type === "block_height" || type === "block_hash") {
      // Fetch block and run Sherlock analysis on all transactions
      router.push(`/sherlock/block/${query.trim()}`);
    } else {
      setErrorMsg(
        "Enter a valid transaction ID (64 hex) or block height/hash.",
      );
      setLoading(false);
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
      // For Sherlock, we run privacy analysis via the sherlock API
      const res = await fetch("/api/sherlock/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_tx: hex, prevouts: [] }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(
          data?.error?.message || data?.message || "Analysis failed",
        );
      }

      const txid = typeof data?.txid === "string" ? data.txid : null;
      sessionStorage.setItem("sherlock_result", JSON.stringify(data));

      if (txid) {
        router.push(`/tx/${txid}?tab=privacy`);
      } else {
        router.push("/sherlock/result?from=rawhex");
      }
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

      const res = await fetch("/api/sherlock/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(
          data?.error?.message || data?.message || "Analysis failed",
        );
      }

      const txid = typeof data?.txid === "string" ? data.txid : null;
      sessionStorage.setItem("sherlock_result", JSON.stringify(data));

      if (txid) {
        router.push(`/tx/${txid}?tab=privacy`);
      } else {
        router.push("/sherlock/result?from=json");
      }
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setAnalyzingJson(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 max-w-4xl mx-auto px-6 pt-24 pb-16 w-full relative z-10">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sherlock-500/10 border border-sherlock-500/20 text-sherlock-400 text-xs font-mono uppercase tracking-widest mb-4">
            <Fingerprint className="w-3.5 h-3.5" />
            Sherlock
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
            Privacy Analysis
          </h1>
          <p className="text-stone-400 text-lg max-w-lg mx-auto">
            Analyze Bitcoin transactions and blocks for privacy leaks using
            wallet fingerprinting, clustering heuristics, and entropy scoring.
          </p>
        </motion.div>

        {/* Tab Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10"
        >
          <div className="flex rounded-2xl bg-stone-950/60 backdrop-blur-xl border border-white/8 p-1">
            {[
              { id: "search" as const, icon: Search, label: "Search Online", shortLabel: "Search" },
              { id: "rawhex" as const, icon: Code2, label: "Paste Hex", shortLabel: "Hex" },
              { id: "json" as const, icon: FileJson, label: "Paste JSON", shortLabel: "JSON" },
              { id: "upload" as const, icon: Upload, label: "Upload Files", shortLabel: "Upload" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setErrorMsg(null);
                }}
                className={`flex flex-1 items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-sherlock-500/15 text-sherlock-400 border border-sherlock-500/20"
                    : "text-stone-500 hover:text-stone-300"
                }`}
              >
                <tab.icon className="w-4 h-4 shrink-0" />
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {/* Search Tab */}
          {activeTab === "search" && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-lg mx-auto"
            >
              <div className="rounded-3xl border border-white/8 bg-stone-950/50 backdrop-blur-xl p-8">
                <div className="text-center mb-8">
                  <Fingerprint className="w-10 h-10 text-sherlock-400 mx-auto mb-3 opacity-80" />
                  <h3 className="text-xl font-bold text-white mb-2">
                    Search Online
                  </h3>
                  <p className="text-sm text-stone-400">
                    Enter a transaction ID or block height to fetch from
                    mempool.space and analyze privacy patterns.
                  </p>
                </div>

                {/* Search input */}
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Transaction ID or block height..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-sm text-white font-mono placeholder:text-stone-600 focus:outline-none focus:border-sherlock-500/40 transition-colors"
                  />
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
                  disabled={loading || !query.trim()}
                  className="group w-full flex items-center justify-center gap-2 font-bold px-6 py-4 rounded-xl transition-all duration-300 border bg-transparent border-sherlock-500/50 text-sherlock-400 hover:bg-sherlock-500/10 hover:border-sherlock-400 hover:text-sherlock-300 hover:shadow-[0_0_20px_rgba(212,165,70,0.3),inset_0_0_10px_rgba(212,165,70,0.1)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-transparent disabled:hover:border-sherlock-500/50 disabled:hover:text-sherlock-400 text-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 opacity-80 group-hover:opacity-100 transition-opacity" />{" "}
                      Analyze
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Raw Hex Tab */}
          {activeTab === "rawhex" && (
            <motion.div
              key="rawhex"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-lg mx-auto"
            >
              <div className="rounded-3xl border border-white/8 bg-stone-950/50 backdrop-blur-xl p-8">
                <div className="text-center mb-6">
                  <Code2 className="w-10 h-10 text-sherlock-500 mx-auto mb-3 opacity-80" />
                  <h3 className="text-xl font-bold text-white mb-2">
                    Paste Raw Hex
                  </h3>
                  <p className="text-sm text-stone-400">
                    Paste raw transaction hex for offline privacy analysis.
                  </p>
                </div>

                <div className="mb-6">
                  <label className="text-[10px] font-mono text-stone-500 uppercase tracking-widest ml-1 mb-1 block">
                    Transaction Hex <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={rawHex}
                    onChange={(e) => setRawHex(e.target.value)}
                    placeholder="0100000001abc123..."
                    className="w-full h-40 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-stone-300 font-mono placeholder:text-stone-600 focus:outline-none focus:border-sherlock-500/40 transition-colors resize-none"
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
                  className="group w-full flex items-center justify-center gap-2 font-bold px-6 py-4 rounded-xl transition-all duration-300 border bg-transparent border-sherlock-500/50 text-sherlock-400 hover:bg-sherlock-500/10 hover:border-sherlock-400 hover:text-sherlock-300 hover:shadow-[0_0_20px_rgba(212,165,70,0.3),inset_0_0_10px_rgba(212,165,70,0.1)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-transparent disabled:hover:border-sherlock-500/50 disabled:hover:text-sherlock-400 text-sm"
                >
                  {analyzingHex ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4 opacity-80 group-hover:opacity-100 transition-opacity" />{" "}
                      Analyze
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* JSON Fixture Tab */}
          {activeTab === "json" && (
            <motion.div
              key="json"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-lg mx-auto"
            >
              <div className="rounded-3xl border border-white/8 bg-stone-950/50 backdrop-blur-xl p-8">
                <div className="text-center mb-6">
                  <FileJson className="w-10 h-10 text-sherlock-500 mx-auto mb-3 opacity-80" />
                  <h3 className="text-xl font-bold text-white mb-2">
                    Paste JSON Fixture
                  </h3>
                  <p className="text-sm text-stone-400">
                    Paste a transaction fixture with prevout data for enhanced
                    analysis.
                  </p>
                </div>

                <div className="mb-4">
                  <label className="text-[10px] font-mono text-stone-500 uppercase tracking-widest ml-1 mb-1 block">
                    JSON Fixture <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={jsonFixture}
                    onChange={(e) => setJsonFixture(e.target.value)}
                    placeholder={`{
  "network": "mainnet",
  "raw_tx": "0100000001...",
  "prevouts": [
    {
      "txid": "abc123...",
      "vout": 0,
      "value_sats": 50000,
      "script_pubkey_hex": "76a914..."
    }
  ]
}`}
                    className="w-full h-56 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-stone-300 font-mono placeholder:text-stone-600 focus:outline-none focus:border-sherlock-500/40 transition-colors resize-none"
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
                  className="group w-full flex items-center justify-center gap-2 font-bold px-6 py-4 rounded-xl transition-all duration-300 border bg-transparent border-sherlock-500/50 text-sherlock-400 hover:bg-sherlock-500/10 hover:border-sherlock-400 hover:text-sherlock-300 hover:shadow-[0_0_20px_rgba(212,165,70,0.3),inset_0_0_10px_rgba(212,165,70,0.1)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-transparent disabled:hover:border-sherlock-500/50 disabled:hover:text-sherlock-400 text-sm"
                >
                  {analyzingJson ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4 opacity-80 group-hover:opacity-100 transition-opacity" />{" "}
                      Analyze
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Upload Block Files Tab */}
          {activeTab === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto"
            >
              <UploadCard />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scroll indicator */}
      <ScrollIndicator theme="sherlock" />

      {/* Story Section */}
      <TimelineSection theme="sherlock" cards={STORY_CARDS} />

      {/* Bottom CTA */}
      <BottomCTA
        theme="sherlock"
        title="Ready to investigate?"
        description="Enter any transaction ID or paste raw hex to reveal the privacy fingerprint hidden in the blockchain."
        buttonLabel="Start Analysis"
        buttonIcon={<Fingerprint className="w-5 h-5" />}
        onAction={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      />

      <Footer />
    </div>
  );
}
