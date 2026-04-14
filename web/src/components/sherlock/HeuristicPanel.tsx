"use client";

import { motion } from "framer-motion";
import {
  Link2,
  ArrowLeftRight,
  RefreshCw,
  Users,
  Package,
  Home,
  FileText,
  Target,
  Shield,
  AlertTriangle,
  Info,
} from "lucide-react";
import type { HeuristicResult } from "@/lib/sherlockTypes";

const HEURISTIC_META: Record<
  string,
  {
    icon: typeof Link2;
    label: string;
    description: string;
    detectedExplanation: string;
    notDetectedExplanation: string;
  }
> = {
  cioh: {
    icon: Link2,
    label: "Common Input Ownership",
    description:
      "If a transaction spends multiple inputs, they likely belong to the same entity.",
    detectedExplanation:
      "This transaction has multiple inputs - they are all likely controlled by the same wallet.",
    notDetectedExplanation: "Single-input transaction - CIOH does not apply.",
  },
  change_detection: {
    icon: ArrowLeftRight,
    label: "Change Detection",
    description:
      "Identifies which output is likely the change returning to the sender.",
    detectedExplanation:
      "A likely change output was identified, revealing the sender's payment pattern.",
    notDetectedExplanation:
      "Could not determine which output is change - outputs may be ambiguous.",
  },
  address_reuse: {
    icon: RefreshCw,
    label: "Address Reuse",
    description:
      "Detects when the same address appears in both inputs and outputs.",
    detectedExplanation:
      "An address from the inputs was reused in the outputs - a significant privacy leak.",
    notDetectedExplanation:
      "No address reuse detected - sender uses fresh addresses.",
  },
  coinjoin: {
    icon: Users,
    label: "CoinJoin Detection",
    description:
      "Identifies mixing transactions with multiple parties and equal-value outputs.",
    detectedExplanation:
      "This transaction has characteristics of a CoinJoin: many inputs, distinct addresses, and equal-value outputs.",
    notDetectedExplanation: "No CoinJoin pattern detected.",
  },
  consolidation: {
    icon: Package,
    label: "Consolidation",
    description:
      "Many inputs combined into few outputs of the same script type.",
    detectedExplanation:
      "Multiple inputs were merged into 1-2 outputs - a wallet maintenance operation.",
    notDetectedExplanation: "Transaction does not match consolidation pattern.",
  },
  self_transfer: {
    icon: Home,
    label: "Self-Transfer",
    description:
      "All outputs appear to belong to the same entity as the inputs.",
    detectedExplanation:
      "All outputs match the input script type - funds are moving within the same wallet.",
    notDetectedExplanation: "Outputs suggest different recipients.",
  },
  op_return: {
    icon: FileText,
    label: "OP_RETURN Analysis",
    description:
      "Detects data embedded in OP_RETURN outputs (Omni, OpenTimestamps, etc.).",
    detectedExplanation: "This transaction embeds data in an OP_RETURN output.",
    notDetectedExplanation: "No OP_RETURN outputs found.",
  },
  round_number_payment: {
    icon: Target,
    label: "Round Number Payment",
    description:
      "Outputs divisible by 100,000 sats suggest human-chosen payment amounts.",
    detectedExplanation:
      "A round-number output was found - likely a human-chosen payment amount, not algorithmic change.",
    notDetectedExplanation:
      "No round-number outputs - values appear to be algorithmic.",
  },
};

interface HeuristicCardProps {
  heuristicKey: string;
  result: HeuristicResult;
  index: number;
}

function HeuristicCard({ heuristicKey, result, index }: HeuristicCardProps) {
  const meta = HEURISTIC_META[heuristicKey];
  if (!meta) return null;

  const Icon = meta.icon;
  const detected = result.detected;

  // Extract extra info from certain heuristics
  const extraInfo: string[] = [];
  if (heuristicKey === "change_detection" && detected) {
    if (result.method) extraInfo.push(`Method: ${result.method}`);
    if (result.confidence) extraInfo.push(`Confidence: ${result.confidence}`);
    if (result.likely_change_index !== undefined)
      extraInfo.push(`Change index: ${result.likely_change_index}`);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`rounded-xl border p-4 transition-all ${
        detected
          ? "bg-brand-500/5 border-brand-500/20"
          : "bg-white/[0.02] border-white/5"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            detected ? "bg-brand-500/10" : "bg-white/5"
          }`}
        >
          {detected ? (
            <AlertTriangle className="w-4 h-4 text-brand-400" />
          ) : (
            <Shield className="w-4 h-4 text-zinc-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon
              className={`w-3.5 h-3.5 ${detected ? "text-brand-400" : "text-zinc-600"}`}
            />
            <span
              className={`text-sm font-semibold ${detected ? "text-white" : "text-zinc-500"}`}
            >
              {meta.label}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider ${
                detected
                  ? "bg-brand-500/20 text-brand-400"
                  : "bg-zinc-800 text-zinc-600"
              }`}
            >
              {detected ? "Triggered" : "Clear"}
            </span>
          </div>
          <p
            className={`text-xs leading-relaxed ${detected ? "text-zinc-400" : "text-zinc-600"}`}
          >
            {detected ? meta.detectedExplanation : meta.notDetectedExplanation}
          </p>
          {extraInfo.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {extraInfo.map((info, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-300 font-mono"
                >
                  {info}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface HeuristicPanelProps {
  txid: string;
  classification: string;
  heuristics: Record<string, HeuristicResult>;
}

export function HeuristicPanel({
  txid,
  classification,
  heuristics,
}: HeuristicPanelProps) {
  const entries = Object.entries(heuristics);
  const detected = entries.filter(([, v]) => v.detected);
  const clear = entries.filter(([, v]) => !v.detected);

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-brand-400" />
          <span className="text-brand-400 font-medium">
            {detected.length} triggered
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-zinc-600" />
          <span className="text-zinc-500">{clear.length} clear</span>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs text-zinc-500">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>
          Each heuristic runs independently. Triggered heuristics contribute to
          the final{" "}
          <span className="text-white font-medium">{classification}</span>{" "}
          classification.
        </span>
      </div>

      {/* Triggered heuristics first */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {detected.map(([key, result], i) => (
          <HeuristicCard
            key={key}
            heuristicKey={key}
            result={result}
            index={i}
          />
        ))}
        {clear.map(([key, result], i) => (
          <HeuristicCard
            key={key}
            heuristicKey={key}
            result={result}
            index={detected.length + i}
          />
        ))}
      </div>

      {/* Full TXID */}
      <div className="text-xs text-zinc-600 pt-2 border-t border-white/5">
        TXID:{" "}
        <span className="font-mono text-zinc-400 select-all break-all">
          {txid}
        </span>
      </div>
    </div>
  );
}
