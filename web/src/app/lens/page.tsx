"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, ArrowRight,
  Upload, FileDigit, Activity, Loader2,
  AlertTriangle, Code2, FileJson,
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

type TabId = "upload" | "rawhex" | "json";

const STORY_CARDS = [
  {
    title: "Bitcoin is shared money records",
    description: "Bitcoin is a digital currency that works without any bank or company in charge. Instead, thousands of computers around the world keep a shared record of every transaction ever made.",
    Graphic: AnimatedGlobe,
  },
  {
    title: "Those records are grouped into blocks",
    description: "This shared record is called a blockchain — a giant list of pages (called blocks), each containing hundreds of transactions. Think of it like a public accounting book that anyone can read but nobody can alter.",
    Graphic: AnimatedBlocks,
  },
  {
    title: "Transactions wait in the Mempool",
    description: "When you send Bitcoin, your transaction goes into a waiting room called the Mempool. Miners sweep through this pool and bundle hundreds of waiting transactions together to form a new block.",
    Graphic: AnimatedTransaction,
  },
  {
    title: "Miners secure blocks through proof-of-work",
    description: "Miners race against each other to solve a complex mathematical puzzle to lock in that newly bundled block. The winner gets the block reward, and the bundle is permanently added to the blockchain.",
    Graphic: AnimatedMiners,
  },
  {
    title: "Lens opens the block to explain it",
    description: "Each block contains a header, transactions, inputs, outputs, scripts, and fees. But this data is stored as raw bytes — completely unreadable to humans. That's where Lens comes in.",
    Graphic: AnimatedLens,
  },
];

export default function LensPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("upload");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const handleFileUpload = async () => {
    if (!blkFile || !revFile || !xorFile) return;
    setUploading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("blk", blkFile);
      formData.append("rev", revFile);
      formData.append("xor", xorFile);

      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || data.ok === false || data.error) {
        const msg =
          (typeof data.error === "object" && data.error?.message) ||
          (typeof data.error === "string" && data.error) ||
          data.message ||
          "Analysis failed";
        throw new Error(msg);
      }

      sessionStorage.setItem("lens_result", JSON.stringify(data));
      router.push("/lens/analyze?from=upload");
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
          data?.error?.message || data?.message || "Analysis failed"
        );
      }

      sessionStorage.setItem("lens_result", JSON.stringify(data));
      router.push("/lens/analyze?from=rawhex");
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

      // Validate required fields
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
          data?.error?.message || data?.message || "Analysis failed"
        );
      }

      sessionStorage.setItem("lens_result", JSON.stringify(data));
      router.push("/lens/analyze?from=json");
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setAnalyzingJson(false);
    }
  };

  const allFilesSelected = blkFile && revFile && xorFile;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero section with narrow container */}
      <div className="max-w-4xl mx-auto px-6 pt-24 pb-16 w-full relative z-10">

          {/* Hero */}
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
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center mb-10"
          >
            <div className="inline-flex rounded-2xl bg-stone-950/60 backdrop-blur-xl border border-white/8 p-1 max-w-full overflow-x-auto scrollbar-hide">
              {[
                { id: "upload" as const, icon: Upload, label: "Upload Files" },
                { id: "rawhex" as const, icon: Code2, label: "Raw Hex" },
                { id: "json" as const, icon: FileJson, label: "JSON Fixture" },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setErrorMsg(null); }}
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
          </motion.div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {/* Upload Files Tab */}
            {activeTab === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="max-w-lg mx-auto"
              >
                <div className="rounded-3xl border border-white/8 bg-stone-950/50 backdrop-blur-xl p-8">
                  <div className="text-center mb-6">
                    <FileDigit className="w-10 h-10 text-lens-500 mx-auto mb-3 opacity-80" />
                    <h3 className="text-xl font-bold text-white mb-2">Upload Block Data</h3>
                    <p className="text-sm text-stone-400">
                      Upload raw <code className="text-lens-400">.dat</code> files
                      from your Bitcoin Core <code className="text-lens-400">blocks/</code> directory.
                    </p>
                  </div>

                  <div className="space-y-4 mb-6">
                    {[
                      { label: "BLK File", setter: setBlkFile, file: blkFile },
                      { label: "REV File", setter: setRevFile, file: revFile },
                      { label: "XOR File", setter: setXorFile, file: xorFile },
                    ].map(({ label, setter, file }) => (
                      <div key={label} className="space-y-1">
                        <label className="text-[10px] font-mono text-stone-500 uppercase tracking-widest ml-1">
                          {label} <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="file"
                          accept=".dat"
                          onChange={(e) => setter(e.target.files?.[0] || null)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-stone-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-stone-800 file:text-stone-300 hover:file:bg-stone-700 cursor-pointer transition-colors"
                        />
                        {file && <p className="text-[10px] font-mono text-lens-400/60 ml-1">{file.name}</p>}
                      </div>
                    ))}
                  </div>

                  {errorMsg && activeTab === "upload" && (
                    <div className="mb-4 flex items-center gap-2 text-xs text-red-400">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span className="flex-1">{errorMsg}</span>
                      <button onClick={() => setErrorMsg(null)} className="text-red-400/50 hover:text-red-300">&#x2715;</button>
                    </div>
                  )}

                  {!allFilesSelected && (blkFile || revFile || xorFile) && !errorMsg && (
                    <p className="mb-4 text-[10px] text-amber-400/70 font-mono">
                      All three files (BLK, REV, XOR) are required.
                    </p>
                  )}

                  <button
                    onClick={allFilesSelected ? handleFileUpload : () => router.push("/lens/analyze")}
                    disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 bg-lens-500 text-white font-bold px-6 py-4 rounded-xl hover:bg-lens-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                    ) : allFilesSelected ? (
                      <><Activity className="w-4 h-4" /> Analyze Block</>
                    ) : (
                      <><Upload className="w-4 h-4" /> Open Full Analyzer</>
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
                    <Code2 className="w-10 h-10 text-lens-500 mx-auto mb-3 opacity-80" />
                    <h3 className="text-xl font-bold text-white mb-2">Raw Transaction Hex</h3>
                    <p className="text-sm text-stone-400">
                      Paste raw transaction hex from your node, testnet, or any other source.
                      Note: without prevout data, some analysis may be limited.
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
                      className="w-full h-40 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-stone-300 font-mono placeholder:text-stone-600 focus:outline-none focus:border-lens-500/40 transition-colors resize-none"
                    />
                  </div>

                  {errorMsg && activeTab === "rawhex" && (
                    <div className="mb-4 flex items-center gap-2 text-xs text-red-400">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span className="flex-1">{errorMsg}</span>
                      <button onClick={() => setErrorMsg(null)} className="text-red-400/50 hover:text-red-300">&#x2715;</button>
                    </div>
                  )}

                  <button
                    onClick={handleRawHexSubmit}
                    disabled={analyzingHex || !rawHex.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-lens-500 text-white font-bold px-6 py-4 rounded-xl hover:bg-lens-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {analyzingHex ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                    ) : (
                      <><Activity className="w-4 h-4" /> Analyze Transaction</>
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
                    <FileJson className="w-10 h-10 text-lens-500 mx-auto mb-3 opacity-80" />
                    <h3 className="text-xl font-bold text-white mb-2">JSON Fixture</h3>
                    <p className="text-sm text-stone-400">
                      Paste a complete fixture with <code className="text-lens-400">raw_tx</code> and
                      optional <code className="text-lens-400">prevouts</code> for full analysis.
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
                      className="w-full h-56 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-stone-300 font-mono placeholder:text-stone-600 focus:outline-none focus:border-lens-500/40 transition-colors resize-none"
                    />
                  </div>

                  {errorMsg && activeTab === "json" && (
                    <div className="mb-4 flex items-center gap-2 text-xs text-red-400">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span className="flex-1">{errorMsg}</span>
                      <button onClick={() => setErrorMsg(null)} className="text-red-400/50 hover:text-red-300">&#x2715;</button>
                    </div>
                  )}

                  <button
                    onClick={handleJsonSubmit}
                    disabled={analyzingJson || !jsonFixture.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-lens-500 text-white font-bold px-6 py-4 rounded-xl hover:bg-lens-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {analyzingJson ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                    ) : (
                      <><Activity className="w-4 h-4" /> Analyze Fixture</>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Scroll indicator */}
        <ScrollIndicator theme="lens" />

        {/* Timeline storytelling */}
        <TimelineSection theme="lens" cards={STORY_CARDS} />

        {/* Bottom CTA */}
        <BottomCTA
          theme="lens"
          title="Ready to see what's inside a real block?"
          description="Upload your own Bitcoin Core files or paste raw transaction data."
          buttonLabel="Open Analyzer"
          buttonIcon={<Eye className="w-5 h-5" />}
          onAction={() => router.push("/lens/analyze")}
        />

        <Footer />
      </div>
  );
}
