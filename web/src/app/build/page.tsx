"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Hammer,
  Zap,
  Package,
  Shuffle,
  SendHorizontal,
  Blocks,
  AlertCircle,
  Loader2,
  Grid3x3,
  FileJson,
  Upload,
  Code2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TimelineSection } from "@/components/shared/TimelineCard";
import { ScrollIndicator } from "@/components/shared/ScrollIndicator";
import { BottomCTA } from "@/components/shared/BottomCTA";
import {
  AnimatedWallet,
  AnimatedChange,
  AnimatedFee,
  AnimatedDust,
  AnimatedForge,
} from "@/components/smith/StoryGraphics";
import { Footer } from "@/components/shared/Footer";

type TabId = "templates" | "paste" | "import";

const STORY_CARDS = [
  {
    title: "Your wallet holds coins, not a balance",
    description:
      "Bitcoin doesn't track a single 'balance' like a bank account. Your wallet actually holds individual digital coins called UTXOs, just like having specific ₹500, ₹200, and ₹100 bills in a physical leather wallet.",
    Graphic: AnimatedWallet,
  },
  {
    title: "You can't split a coin, you spend it whole",
    description:
      "Want to pay ₹300? You hand over your ₹500 bill and get ₹200 back as 'change.' Bitcoin works exactly the same: you must put the whole coin into the transaction, sending the leftover back to yourself.",
    Graphic: AnimatedChange,
  },
  {
    title: "The miner's fee depends on transaction size",
    description:
      "Every transaction requires a fee to get confirmed by miners. But the fee isn't based on how much money you send, it's based on data size (vBytes). More input coins equal a physically larger transaction, requiring a higher fee.",
    Graphic: AnimatedFee,
  },
  {
    title: "Tiny amounts become 'dust', unusable forever",
    description:
      "If your change output is too small, it will cost more in miner fees to spend than it's actually worth. These tiny 'dust' amounts get permanently stuck in your wallet. Smart wallets avoid creating them.",
    Graphic: AnimatedDust,
  },
  {
    title: "Smith handles the complexity automatically",
    description:
      "Smith handles all of this automatically. Choose a template to see how different transaction types work, or build your own with full control over inputs, outputs, scripts, and fees.",
    Graphic: AnimatedForge,
  },
];

const PRESETS = [
  {
    id: "basic_change_p2wpkh",
    icon: Hammer,
    label: "Simple Payment",
    desc: "Single input, one payment + change",
  },
  {
    id: "rbf_with_locktime",
    icon: Zap,
    label: "RBF + Locktime",
    desc: "Fee-bumpable with a timelock",
  },
  {
    id: "small_utxos_consolidation",
    icon: Package,
    label: "Consolidation",
    desc: "Merge many tiny coins into one",
  },
  {
    id: "large_mixed_script_types",
    icon: Shuffle,
    label: "Mixed Scripts",
    desc: "Legacy, SegWit & Taproot together",
  },
  {
    id: "rbf_send_all",
    icon: SendHorizontal,
    label: "Send All",
    desc: "Sweep everything, no change",
  },
  {
    id: "many_inputs_many_outputs",
    icon: Blocks,
    label: "Many I/O",
    desc: "Large transaction with 100+ nodes",
  },
];

export default function BuildPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("templates");
  const [isBuilding, setIsBuilding] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [pasteContent, setPasteContent] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [navigating, setNavigating] = useState(false);

  const navigateTo = (path: string) => {
    setNavigating(true);
    setTimeout(() => router.push(path), 400);
  };

  const handlePreset = async (fixtureId: string) => {
    setIsBuilding(true);
    setActivePreset(fixtureId);
    setErrorMsg(null);
    try {
      const res = await fetch(`/fixtures/${fixtureId}.json`);
      if (!res.ok) throw new Error("Could not load fixture");
      const jsonStr = await res.text();
      sessionStorage.setItem("coinsmith_fixture", jsonStr);
      navigateTo("/build/result");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error loading fixture");
      setIsBuilding(false);
      setActivePreset(null);
    }
  };

  const handleCustomSubmit = () => {
    if (!pasteContent.trim()) return;
    setIsBuilding(true);
    setErrorMsg(null);
    try {
      const parsed = JSON.parse(pasteContent);
      if (typeof parsed.fee_rate_sat_vb !== "number" || parsed.fee_rate_sat_vb <= 0 || !Array.isArray(parsed.utxos) || parsed.utxos.length === 0) {
        throw new Error("Invalid fixture: fee_rate_sat_vb must be a positive number and utxos must be a non-empty array");
      }
      sessionStorage.setItem("coinsmith_fixture", pasteContent);
      navigateTo("/build/result");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Invalid JSON");
      setIsBuilding(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]?.name.endsWith(".json")) {
      const text = await e.dataTransfer.files[0].text();
      setPasteContent(text);
      setIsBuilding(true);
      setErrorMsg(null);
      try {
        const parsed = JSON.parse(text);
        if (typeof parsed.fee_rate_sat_vb !== "number" || parsed.fee_rate_sat_vb <= 0 || !Array.isArray(parsed.utxos) || parsed.utxos.length === 0)
          throw new Error("Invalid fixture: fee_rate_sat_vb must be a positive number and utxos must be a non-empty array");
        sessionStorage.setItem("coinsmith_fixture", text);
        navigateTo("/build/result");
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Invalid JSON");
        setIsBuilding(false);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const text = await e.target.files[0].text();
      setPasteContent(text);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div
        className={`flex-1 max-w-4xl mx-auto px-6 pt-24 pb-16 w-full relative z-10 transition-all duration-500 ${navigating ? "opacity-0 scale-95 blur-sm" : "opacity-100 scale-100"}`}
      >
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-smith-500/10 border border-smith-500/20 text-smith-400 text-xs font-mono uppercase tracking-widest mb-4">
            <Hammer className="w-3.5 h-3.5" />
            Smith
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
            Transaction Builder
          </h1>
          <p className="text-stone-400 text-lg max-w-lg mx-auto">
            Build Bitcoin transactions with full control over inputs, outputs,
            scripts, and fees. Choose a template or craft your own.
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
              { id: "templates" as const, icon: Grid3x3, label: "Use Template", shortLabel: "Template" },
              { id: "paste" as const, icon: Code2, label: "Paste JSON", shortLabel: "JSON" },
              { id: "import" as const, icon: Upload, label: "Upload Files", shortLabel: "Upload" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setErrorMsg(null);
                }}
                className={`flex flex-1 items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-smith-500/15 text-smith-400 border border-smith-500/20"
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

        {/* Error Message */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 text-red-400 items-start relative max-w-2xl mx-auto"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium leading-relaxed flex-1">
              {errorMsg}
            </p>
            <button
              onClick={() => setErrorMsg(null)}
              className="p-1 text-red-400/50 hover:text-red-400 transition-colors"
            >
              &times;
            </button>
          </motion.div>
        )}

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {/* Templates Tab */}
          {activeTab === "templates" && (
            <motion.div
              key="templates"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-8">
                <Grid3x3 className="w-10 h-10 text-smith-500 mx-auto mb-3 opacity-80" />
                <h3 className="text-xl font-bold text-white mb-2">
                  Transaction Templates
                </h3>
                <p className="text-sm text-stone-400">
                  Pre-built examples showing different transaction types and
                  patterns.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {PRESETS.map((preset, i) => {
                  const Icon = preset.icon;
                  const loading = isBuilding && activePreset === preset.id;
                  return (
                    <motion.button
                      key={preset.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * i }}
                      disabled={isBuilding}
                      onClick={() => handlePreset(preset.id)}
                      className="group relative p-5 rounded-2xl border text-left transition-all bg-stone-900/80 backdrop-blur-md border-white/10 hover:border-smith-500/30 hover:bg-stone-900/90 disabled:opacity-50 disabled:cursor-wait"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 group-hover:bg-smith-500/10 group-hover:border-smith-500/20 transition-colors">
                        {loading ? (
                          <Loader2 className="w-5 h-5 text-smith-400 animate-spin" />
                        ) : (
                          <Icon className="w-5 h-5 text-zinc-400 group-hover:text-smith-400 transition-colors" />
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white mb-1">
                        {preset.label}
                      </h3>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        {preset.desc}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Paste JSON Tab */}
          {activeTab === "paste" && (
            <motion.div
              key="paste"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-lg mx-auto"
            >
              <div className="rounded-3xl border border-white/8 bg-stone-950/50 backdrop-blur-xl p-8">
                <div className="text-center mb-6">
                  <FileJson className="w-10 h-10 text-smith-500 mx-auto mb-3 opacity-80" />
                  <h3 className="text-xl font-bold text-white mb-2">
                    Paste JSON Fixture
                  </h3>
                  <p className="text-sm text-stone-400">
                    Paste a transaction fixture with UTXOs and payment
                    instructions.
                  </p>
                </div>

                <div className="mb-4">
                  <label className="text-[10px] font-mono text-stone-500 uppercase tracking-widest ml-1 mb-1 block">
                    JSON Fixture <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={pasteContent}
                    onChange={(e) => setPasteContent(e.target.value)}
                    placeholder={`{
  "fee_rate_sat_vb": 10,
  "utxos": [
    {
      "txid": "abc123...",
      "vout": 0,
      "value_sats": 50000,
      "script_pubkey_hex": "76a914..."
    }
  ],
  "payments": [
    {
      "address": "bc1q...",
      "value_sats": 30000
    }
  ]
}`}
                    className="w-full h-56 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-stone-300 font-mono placeholder:text-stone-600 focus:outline-none focus:border-smith-500/40 transition-colors resize-none"
                  />
                </div>

                <button
                  onClick={handleCustomSubmit}
                  disabled={!pasteContent.trim() || isBuilding}
                  className="group w-full flex items-center justify-center gap-2 font-bold px-6 py-4 rounded-xl transition-all duration-300 border bg-transparent border-smith-500/50 text-smith-400 hover:bg-smith-500/10 hover:border-smith-400 hover:text-smith-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.3),inset_0_0_10px_rgba(16,185,129,0.1)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-transparent disabled:hover:border-smith-500/50 disabled:hover:text-smith-400 text-sm"
                >
                  {isBuilding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Building...
                    </>
                  ) : (
                    <>
                      <Hammer className="w-4 h-4 opacity-80 group-hover:opacity-100 transition-opacity" />{" "}
                      Build Transaction
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Import File Tab */}
          {activeTab === "import" && (
            <motion.div
              key="import"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-lg mx-auto"
            >
              <div className="rounded-3xl border border-white/8 bg-stone-950/50 backdrop-blur-xl p-8">
                <div className="text-center mb-6">
                  <Upload className="w-10 h-10 text-smith-500 mx-auto mb-3 opacity-80" />
                  <h3 className="text-xl font-bold text-white mb-2">
                    Upload JSON File
                  </h3>
                  <p className="text-sm text-stone-400">
                    Upload a .json file containing transaction fixture data.
                  </p>
                </div>

                <div
                  className={cn(
                    "border-2 border-dashed rounded-xl transition-all relative min-h-[200px] flex items-center justify-center",
                    dragActive
                      ? "border-smith-500 bg-smith-500/5"
                      : "border-white/10 hover:border-smith-500/30",
                    isBuilding && "opacity-50 pointer-events-none",
                  )}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isBuilding}
                  />

                  <div className="text-center p-6">
                    <FileJson className="w-12 h-12 text-stone-600 mx-auto mb-3" />
                    <p className="text-sm text-stone-400 mb-3">
                      Drag and drop a .json file here
                    </p>
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="text-sm text-smith-400 hover:text-smith-300 transition-colors font-medium"
                    >
                      or click to browse
                    </button>
                  </div>
                </div>

                {pasteContent && (
                  <div className="mt-4">
                    <p className="text-xs text-stone-500 mb-2">
                      File loaded. Preview:
                    </p>
                    <pre className="text-[10px] text-stone-400 bg-black/40 border border-white/5 rounded-lg p-3 max-h-32 overflow-auto font-mono">
                      {pasteContent.slice(0, 200)}...
                    </pre>
                    <button
                      onClick={handleCustomSubmit}
                      disabled={isBuilding}
                      className="mt-4 group w-full flex items-center justify-center gap-2 font-bold px-6 py-4 rounded-xl transition-all duration-300 border bg-transparent border-smith-500/50 text-smith-400 hover:bg-smith-500/10 hover:border-smith-400 hover:text-smith-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.3),inset_0_0_10px_rgba(16,185,129,0.1)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-transparent disabled:hover:border-smith-500/50 disabled:hover:text-smith-400 text-sm"
                    >
                      {isBuilding ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />{" "}
                          Building...
                        </>
                      ) : (
                        <>
                          <Hammer className="w-4 h-4 opacity-80 group-hover:opacity-100 transition-opacity" />{" "}
                          Build Transaction
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scroll indicator */}
      <ScrollIndicator theme="smith" />

      {/* Story Section */}
      <TimelineSection theme="smith" cards={STORY_CARDS} />

      {/* Bottom CTA */}
      <BottomCTA
        theme="smith"
        title="Ready to build better transactions?"
        description="Choose a template to learn how different transaction types work, or build your own with full control."
        buttonLabel="Start Building"
        buttonIcon={<Hammer className="w-5 h-5" />}
        onAction={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      />

      <Footer />
    </div>
  );
}
