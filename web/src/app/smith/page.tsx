"use client";

import { motion } from "framer-motion";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Hammer, Zap, Package, Shuffle, SendHorizontal, Blocks,
  ChevronDown, FileJson, AlertCircle, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SmithBackground } from "@/components/smith/SmithBackground";

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

export default function SmithPage() {
  const router = useRouter();
  const [isBuilding, setIsBuilding] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [pasteContent, setPasteContent] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const customRef = useRef<HTMLDivElement>(null);
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
      const res = await fetch(`/api/demo?fixture=${fixtureId}`);
      if (!res.ok) throw new Error("Could not load fixture");
      const jsonStr = await res.text();
      sessionStorage.setItem("coinsmith_fixture", jsonStr);
      navigateTo("/smith/build");
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
      if (!parsed.fee_rate_sat_vb || !parsed.utxos) {
        throw new Error("Invalid fixture: missing fee_rate_sat_vb or utxos");
      }
      sessionStorage.setItem("coinsmith_fixture", pasteContent);
      navigateTo("/smith/build");
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
        if (!parsed.fee_rate_sat_vb || !parsed.utxos) throw new Error("Invalid fixture");
        sessionStorage.setItem("coinsmith_fixture", text);
        navigateTo("/smith/build");
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
    <>
      <SmithBackground />
      <div className={`w-full min-h-screen flex flex-col items-center pt-24 pb-12 px-6 transition-all duration-500 ease-out ${navigating ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100'}`}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl text-center mb-12 z-10"
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
            Load the Forge
          </h1>
          <p className="text-zinc-400 text-lg max-w-md mx-auto">
            Choose your raw materials — a wallet of coins and a list of payments. Pick a preset or supply your own fixture.
          </p>
        </motion.div>

        {/* Preset Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 z-10 mb-6"
        >
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
                className={cn(
                  "group relative p-5 rounded-2xl border text-left transition-all duration-300",
                  "bg-zinc-900/80 backdrop-blur-md border-white/10 hover:border-white/20 hover:bg-zinc-900/90",
                  "disabled:opacity-50 disabled:cursor-wait",
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 group-hover:bg-brand-500/10 group-hover:border-brand-500/20 transition-colors">
                  {loading ? (
                    <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
                  ) : (
                    <Icon className="w-5 h-5 text-zinc-400 group-hover:text-brand-400 transition-colors" />
                  )}
                </div>
                <h3 className="text-sm font-bold text-white mb-1">{preset.label}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{preset.desc}</p>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Error */}
        {errorMsg && (
          <div className="w-full max-w-2xl mb-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-3 text-red-400 items-start relative z-10">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium leading-relaxed">{errorMsg}</p>
            <button onClick={() => setErrorMsg(null)} className="absolute top-3 right-3 p-1 text-red-400/50 hover:text-red-400 transition-colors">
              &times;
            </button>
          </div>
        )}

        {/* Custom Fixture Collapsible */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-2xl z-10"
        >
          <button
            onClick={() => {
              const willOpen = !showCustom;
              setShowCustom(willOpen);
              if (willOpen) {
                setTimeout(() => customRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 300);
              }
            }}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-surface-card border border-surface-border text-sm font-medium text-zinc-400 hover:text-white hover:border-white/20 transition-all"
          >
            <span className="flex items-center gap-3">
              <FileJson className="w-4 h-4" />
              Custom Fixture
            </span>
            <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", showCustom && "rotate-180")} />
          </button>

          {showCustom && (
            <motion.div
              ref={customRef}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-2 bg-surface-card border border-surface-border rounded-2xl overflow-hidden"
            >
              <div className="p-5">
                <div
                  className={cn(
                    "border-2 border-dashed rounded-xl transition-all relative",
                    dragActive ? "border-brand-500 bg-brand-500/5" : "border-surface-border hover:border-brand-500/30",
                    isBuilding && "opacity-50 pointer-events-none"
                  )}
                  onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
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

                  <textarea
                    value={pasteContent}
                    onChange={(e) => setPasteContent(e.target.value)}
                    placeholder="Paste or type JSON here, or drag a .json file..."
                    className="w-full h-40 bg-transparent p-4 text-sm text-white font-mono resize-none focus:outline-none placeholder:text-zinc-600 overflow-y-auto"
                    disabled={isBuilding}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="text-xs text-zinc-500 hover:text-white transition-colors underline underline-offset-2"
                  >
                    Browse file...
                  </button>
                  <button
                    onClick={handleCustomSubmit}
                    disabled={!pasteContent.trim() || isBuilding}
                    className="bg-white text-black font-bold px-6 py-2.5 rounded-full text-sm disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"
                  >
                    Build Transaction
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </>
  );
}
