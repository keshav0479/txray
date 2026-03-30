"use client";

import { useState } from "react";
import { Upload, Play, Database, FileDigit, ChevronRight, Activity, Loader2, AlertTriangle, Code } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DEMO_FIXTURES } from "@/lib/scriptData";

interface UploadCardProps {
  onAnalyzeDemo: (fixtureName: string) => void;
  onAnalyzeFiles: (files: { blk: File; rev: File; xor: File }) => void;
  onAnalyzeFixture: (json: string) => void;
  uploading?: boolean;
  errorMsg?: string | null;
  onDismissError?: () => void;
}

export function UploadCard({ onAnalyzeDemo, onAnalyzeFiles, onAnalyzeFixture, uploading, errorMsg, onDismissError }: UploadCardProps) {
  const [activeTab, setActiveTab] = useState<"demo" | "upload" | "paste">("demo");
  const [selectedFixture, setSelectedFixture] = useState<string>("04330");
  
  // File state
  const [blkFile, setBlkFile] = useState<File | null>(null);
  const [revFile, setRevFile] = useState<File | null>(null);
  const [xorFile, setXorFile] = useState<File | null>(null);

  // Paste fixture state
  const [fixtureJson, setFixtureJson] = useState<string>("");

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-xl mx-auto rounded-3xl overflow-hidden border border-white/10 bg-zinc-900/60 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_40px_rgba(0,0,0,0.8)]"
    >
      {/* Header Tabs */}
      <div className="flex border-b border-white/10 bg-black/40">
        <button
          onClick={() => setActiveTab("demo")}
          className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
            activeTab === "demo" ? "text-lens-400 bg-white/5" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Play className="w-4 h-4" />
          Demo Mode
        </button>
        <button
          onClick={() => setActiveTab("upload")}
          className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
            activeTab === "upload" ? "text-lens-400 bg-white/5" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Upload className="w-4 h-4" />
          Upload Files
        </button>
        <button
          onClick={() => setActiveTab("paste")}
          className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
            activeTab === "paste" ? "text-lens-400 bg-white/5" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Code className="w-4 h-4" />
          Paste JSON
        </button>
      </div>

      <div className="p-8 h-135 flex flex-col justify-between">
        <AnimatePresence mode="wait">
          {activeTab === "demo" && (
            <motion.div 
              key="demo"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-6"
            >
              <div className="text-center space-y-2">
                <Database className="w-12 h-12 text-lens-500 mx-auto mb-4 opacity-80" />
                <h3 className="text-xl font-semibold text-white">Select a Block</h3>
                <p className="text-zinc-400 text-sm">
                  Run a live analysis on a pre-loaded Bitcoin block to see how txray Lens decodes the raw bytes.
                </p>
              </div>

              <div className="space-y-3 mt-4">
                {DEMO_FIXTURES.map((fixture) => (
                  <button
                    key={fixture.id}
                    onClick={() => setSelectedFixture(fixture.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                      selectedFixture === fixture.id
                        ? "border-lens-500 bg-lens-500/10"
                        : "border-white/5 bg-black/20 hover:border-white/20"
                    }`}
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-mono text-white text-lg">{fixture.label}</span>
                      <span className="text-xs text-zinc-500">{fixture.description}</span>
                    </div>
                    {selectedFixture === fixture.id && <div className="w-3 h-3 rounded-full bg-lens-500 animate-pulse" />}
                  </button>
                ))}
              </div>

              <button
                onClick={() => onAnalyzeDemo(selectedFixture)}
                className="mt-6 w-full group relative inline-flex items-center justify-center gap-2 bg-lens-500 text-white font-bold px-6 py-4 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.2)] hover:bg-lens-400 transition-colors"
              >
                <Activity className="w-5 h-5" />
                Run Demo Analysis
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform absolute right-6" />
              </button>
            </motion.div>
          )}

          {activeTab === "upload" && (

            <motion.div 
              key="upload"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-6"
            >
              <div className="text-center space-y-2">
                <FileDigit className="w-12 h-12 text-lens-500 mx-auto mb-4 opacity-80" />
                <h3 className="text-xl font-semibold text-white">Upload Block Data</h3>
                <p className="text-zinc-400 text-sm">
                  Upload raw `.dat` files directly from your Bitcoin Core `blocks/` directory.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">
                    BLK File <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".dat"
                    onChange={(e) => setBlkFile(e.target.files?.[0] || null)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 cursor-pointer"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">REV File <span className="text-red-400">*</span></label>
                    <input
                      type="file"
                      accept=".dat"
                      onChange={(e) => setRevFile(e.target.files?.[0] || null)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-zinc-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-400 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">XOR File <span className="text-red-400">*</span></label>
                    <input
                      type="file"
                      accept=".dat"
                      onChange={(e) => setXorFile(e.target.files?.[0] || null)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-zinc-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-400 cursor-pointer"
                    />
                  </div>
                </div>
                {/* Fixed-height message slot -- error or validation, never both */}
                <div className="min-h-10 mt-1">
                  {errorMsg ? (
                    <p className="text-xs text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span className="flex-1">{errorMsg}</span>
                      {onDismissError && <button onClick={onDismissError} className="text-red-400/50 hover:text-red-300 transition-colors">&#x2715;</button>}
                    </p>
                  ) : (!blkFile || !revFile || !xorFile) && (blkFile || revFile || xorFile) ? (
                    <p className="text-xs text-amber-400">All three files (BLK, REV, XOR) are required by the CLI.</p>
                  ) : null}
                </div>
              </div>

              <button
                onClick={() => {
                  if (blkFile && revFile && xorFile) onAnalyzeFiles({ blk: blkFile, rev: revFile, xor: xorFile });
                }}
                disabled={!blkFile || !revFile || !xorFile || uploading}
                className="mt-6 w-full flex items-center justify-center gap-2 bg-lens-500 text-white font-bold px-6 py-4 rounded-xl hover:bg-lens-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze Files'
                )}
              </button>
            </motion.div>
          )}

          {activeTab === "paste" && (
            <motion.div
              key="paste"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4 h-full"
            >
              <div className="text-center space-y-2">
                <Code className="w-12 h-12 text-lens-500 mx-auto mb-4 opacity-80" />
                <h3 className="text-xl font-semibold text-white">Paste Transaction Fixture</h3>
                <p className="text-zinc-400 text-sm">
                  Paste a JSON fixture with <code className="text-lens-400">raw_tx</code> and <code className="text-lens-400">prevouts</code> to analyze a single transaction.
                </p>
              </div>

              <textarea
                value={fixtureJson}
                onChange={(e) => setFixtureJson(e.target.value)}
                placeholder={'{\n  "network": "mainnet",\n  "raw_tx": "0200...",\n  "prevouts": [...]\n}'}
                className="flex-1 min-h-35 w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-300 font-mono resize-none placeholder:text-zinc-600 focus:outline-none focus:border-lens-500/50 transition-colors"
              />

              <div className="min-h-10">
                {errorMsg && (
                  <p className="text-xs text-red-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span className="flex-1">{errorMsg}</span>
                    {onDismissError && <button onClick={onDismissError} className="text-red-400/50 hover:text-red-300 transition-colors">&#x2715;</button>}
                  </p>
                )}
              </div>

              <button
                onClick={() => { if (fixtureJson.trim()) onAnalyzeFixture(fixtureJson.trim()); }}
                disabled={!fixtureJson.trim() || uploading}
                className="w-full group relative inline-flex items-center justify-center gap-2 bg-lens-500 text-white font-bold px-6 py-4 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.2)] hover:bg-lens-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</>
                ) : (
                  <><Activity className="w-5 h-5" /> Analyze Transaction<ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform absolute right-6" /></>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
