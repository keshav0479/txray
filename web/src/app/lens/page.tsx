"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, ArrowRight, Sparkles, Clock,
  Upload, Play, FileDigit, Activity,
  Loader2, AlertTriangle, ChevronRight, Database,
} from "lucide-react";
import { FAMOUS_ENTRIES, type FamousEntry } from "@/lib/famous";
import { DEMO_FIXTURES } from "@/lib/scriptData";
import { LensBackground } from "@/components/lens/LensBackground";
import { TiltCard } from "@/components/shared/TiltCard";
import { Footer } from "@/components/shared/Footer";

const CATEGORY_STYLE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  genesis:   { label: "Genesis",   color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20" },
  milestone: { label: "Milestone", color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20" },
  privacy:   { label: "Privacy",   color: "text-purple-400", bg: "bg-purple-500/10",  border: "border-purple-500/20" },
  technical: { label: "Technical", color: "text-cyan-400",   bg: "bg-cyan-500/10",    border: "border-cyan-500/20" },
  cultural:  { label: "Cultural",  color: "text-rose-400",   bg: "bg-rose-500/10",    border: "border-rose-500/20" },
};

// only show blocks in Lens since it's the structural analysis tool
const LENS_ENTRIES = FAMOUS_ENTRIES.filter(e => e.type === "block");

export default function LensPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"famous" | "demo" | "upload">("famous");
  const [selectedFixture, setSelectedFixture] = useState("04330");
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // file upload state
  const [blkFile, setBlkFile] = useState<File | null>(null);
  const [revFile, setRevFile] = useState<File | null>(null);
  const [xorFile, setXorFile] = useState<File | null>(null);

  const handleDemo = (fixtureId: string) => {
    setUploading(true);
    // in a real implementation this would run the WASM parser
    // for now, navigate to the block explorer
    const fixture = DEMO_FIXTURES.find(f => f.id === fixtureId);
    if (fixture) {
      router.push(`/explore/block/${fixture.id}`);
    }
  };

  const handleFamousClick = (entry: FamousEntry) => {
    if (entry.type === "block") {
      router.push(`/explore/block/${entry.height}`);
    } else {
      router.push(`/explore/tx/${entry.txid}`);
    }
  };

  const allFilesSelected = blkFile && revFile && xorFile;

  return (
    <>
      <LensBackground />
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 max-w-4xl mx-auto px-6 pt-24 pb-16 w-full relative z-10">

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
              Pick a famous block, run a demo dataset, or upload your own
              Bitcoin Core block files for full structural breakdown.
            </p>
          </motion.div>

          {/* Tab Bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center mb-10"
          >
            <div className="inline-flex rounded-2xl bg-stone-950/60 backdrop-blur-xl border border-white/8 p-1">
              {[
                { id: "famous" as const, icon: Sparkles, label: "Famous Blocks" },
                { id: "demo" as const, icon: Play, label: "Demo Mode" },
                { id: "upload" as const, icon: Upload, label: "Upload Files" },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-lens-500/15 text-lens-400 border border-lens-500/20"
                      : "text-stone-500 hover:text-stone-300"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {/* Famous Blocks Tab */}
            {activeTab === "famous" && (
              <motion.div
                key="famous"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {LENS_ENTRIES.map((entry, i) => {
                    const cat = CATEGORY_STYLE[entry.category] || CATEGORY_STYLE.technical;
                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <TiltCard className="h-full" maxTilt={6} glareIntensity={0.08}>
                          <button
                            onClick={() => handleFamousClick(entry)}
                            className="group flex flex-col h-full text-left rounded-3xl border border-white/8 bg-stone-950/50 backdrop-blur-xl hover:border-lens-500/30 transition-all p-6"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <span className={`text-[10px] uppercase tracking-widest font-mono font-semibold px-2 py-0.5 rounded-md ${cat.bg} ${cat.color} ${cat.border} border`}>
                                {cat.label}
                              </span>
                              <span className="text-[11px] text-stone-600 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {entry.date}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2 tracking-tight group-hover:text-lens-300 transition-colors">
                              {entry.name}
                            </h3>
                            <p className="text-sm text-stone-400 mb-4 leading-relaxed flex-1">
                              {entry.tagline}
                            </p>
                            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                              <span className="text-[10px] font-mono text-stone-600 uppercase">
                                Block #{entry.height?.toLocaleString()}
                              </span>
                              <span className="text-xs text-stone-500 group-hover:text-lens-400 transition-colors flex items-center gap-1">
                                Analyze
                                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                              </span>
                            </div>
                          </button>
                        </TiltCard>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Demo Mode Tab */}
            {activeTab === "demo" && (
              <motion.div
                key="demo"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="max-w-lg mx-auto"
              >
                <div className="rounded-3xl border border-white/8 bg-stone-950/50 backdrop-blur-xl p-8">
                  <div className="text-center mb-6">
                    <Database className="w-10 h-10 text-lens-500 mx-auto mb-3 opacity-80" />
                    <h3 className="text-xl font-bold text-white mb-2">Select a Block</h3>
                    <p className="text-sm text-stone-400">
                      Run a live analysis on a pre-loaded Bitcoin block to see
                      how Lens decodes every byte.
                    </p>
                  </div>

                  <div className="space-y-3 mb-6">
                    {DEMO_FIXTURES.map((fixture) => (
                      <button
                        key={fixture.id}
                        onClick={() => setSelectedFixture(fixture.id)}
                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                          selectedFixture === fixture.id
                            ? "border-lens-500/40 bg-lens-500/10"
                            : "border-white/5 bg-black/20 hover:border-white/15"
                        }`}
                      >
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-mono text-white text-lg">{fixture.label}</span>
                          <span className="text-xs text-stone-500">{fixture.description}</span>
                        </div>
                        {selectedFixture === fixture.id && (
                          <div className="w-3 h-3 rounded-full bg-lens-500 animate-pulse" />
                        )}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => handleDemo(selectedFixture)}
                    disabled={uploading}
                    className="w-full group flex items-center justify-center gap-2 bg-lens-500 text-white font-bold px-6 py-4 rounded-xl hover:bg-lens-400 transition-colors disabled:opacity-50"
                  >
                    {uploading ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</>
                    ) : (
                      <>
                        <Activity className="w-5 h-5" />
                        Run Demo Analysis
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

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

                  {errorMsg && (
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
                    disabled={!allFilesSelected || uploading}
                    className="w-full flex items-center justify-center gap-2 bg-lens-500 text-white font-bold px-6 py-4 rounded-xl hover:bg-lens-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                    ) : (
                      <><Upload className="w-4 h-4" /> Run Analysis</>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Footer />
      </div>
    </>
  );
}
