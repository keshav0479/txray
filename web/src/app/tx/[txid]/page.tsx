"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Code2,
  Shield,
  Layers,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { HexTerminal } from "@/components/lens/HexTerminal";
import { AnalysisView } from "@/components/lens/AnalysisView";
import { ContentScanLoader } from "@/components/lens/ContentScanLoader";
import { Footer } from "@/components/shared/Footer";
import type { AnalyzedTx } from "@/lib/layout";

type TabId = "structure" | "privacy" | "raw";

interface PrivacyData {
  fingerprint: {
    bip69_compliant: boolean;
    low_r_signatures: boolean | null;
    anti_fee_sniping: boolean;
    rbf_signaling: boolean;
    change_position: string;
    input_type_consistency: boolean;
    likely_wallet: string | null;
    confidence: string;
  } | null;
  advice: {
    advice: {
      score: number;
      grade: string;
      issues: string[];
      recommendations: string[];
    };
    classification: string;
    entropy: {
      entropy_bits: number;
      privacy_grade: string;
      interpretations: number;
    } | null;
    fingerprint: unknown;
    heuristics: Record<string, { detected: boolean; [key: string]: unknown }>;
  } | null;
}

interface MempoolTx {
  txid: string;
  version: number;
  locktime: number;
  vin: Array<{
    txid: string;
    vout: number;
    prevout: {
      scriptpubkey: string;
      scriptpubkey_type: string;
      scriptpubkey_address?: string;
      value: number;
    };
    is_coinbase: boolean;
  }>;
  vout: Array<{
    scriptpubkey: string;
    scriptpubkey_type: string;
    scriptpubkey_address?: string;
    value: number;
  }>;
  size: number;
  weight: number;
  fee: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
}

interface ApiResponse {
  ok: boolean;
  txid: string;
  mempool: MempoolTx;
  structure: AnalyzedTx | null;
  privacy: PrivacyData;
  isCoinbase: boolean;
  errors: string[];
}

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "structure", label: "Structure", icon: <Layers className="w-4 h-4" /> },
  { id: "privacy", label: "Privacy", icon: <Shield className="w-4 h-4" /> },
  { id: "raw", label: "Raw", icon: <Code2 className="w-4 h-4" /> },
];

export default function UnifiedTxPage({
  params,
}: {
  params: Promise<{ txid: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [txid, setTxid] = useState("");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Initialize tab from URL params
  const tabParam = searchParams.get("tab");
  const initialTab: TabId =
    tabParam === "structure" || tabParam === "privacy" || tabParam === "raw"
      ? tabParam
      : "structure";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  useEffect(() => {
    let mounted = true;

    params
      .then(async (p) => {
        if (!mounted) return;
        setTxid(p.txid);

        const start = Date.now();
        const res = await fetch(`/api/tx/${p.txid}`);
        const json = await res.json();

        if (!mounted) return;

        if (!res.ok || !json.ok) {
          throw new Error(
            json?.error?.message || "Failed to fetch transaction",
          );
        }

        // Ensure scanner animation shows for at least 2.5s for premium feel
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, 2500 - elapsed);

        setTimeout(() => {
          if (!mounted) return;
          setData(json as ApiResponse);
          setLoading(false);
        }, remaining);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        const message =
          err instanceof Error ? err.message : "Failed to fetch transaction";
        setError(message);
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [params]);

  const copyTxid = () => {
    navigator.clipboard.writeText(txid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ContentScanLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            Transaction Not Found
          </h2>
          <p className="text-red-400/80 text-sm mb-6">{error}</p>
          <Link
            href="/"
            className="px-6 py-2 rounded-full bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-colors"
          >
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { mempool, structure, privacy, isCoinbase } = data;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky nav — identity + tabs + external link, nothing else */}
      <div className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            {/* Left: back + identity */}
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/"
                className="text-zinc-500 hover:text-white transition-colors shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-medium text-white">Transaction</h1>
                  {isCoinbase && (
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 rounded shrink-0">
                      Coinbase
                    </span>
                  )}
                </div>
                <button
                  onClick={copyTxid}
                  className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1 group"
                >
                  <span className="truncate max-w-[260px]">{txid}</span>
                  {copied ? (
                    <Check className="w-3 h-3 text-green-400 shrink-0" />
                  ) : (
                    <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  )}
                </button>
              </div>
            </div>

            {/* Center: tabs — truly centered via grid */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); window.scrollTo({ top: 0, behavior: "instant" }); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-white text-black"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Right: external link */}
            <div className="flex justify-end">
              <a
                href={`https://mempool.space/tx/${txid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                mempool.space
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats strip — non-sticky, scrolls with page */}
      <div className="border-b border-white/5 bg-black/10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4 overflow-x-auto scrollbar-none">
          <TxStat value={mempool.vin.length.toString()} label="inputs" />
          <TxStatDivider />
          <TxStat value={mempool.vout.length.toString()} label="outputs" />
          <TxStatDivider />
          <TxStat value={mempool.fee.toLocaleString()} label="sats fee" />
          <TxStatDivider />
          <TxStat value={((mempool.fee * 4) / mempool.weight).toFixed(1)} label="sat/vB" />
          <TxStatDivider />
          <TxStat value={Math.ceil(mempool.weight / 4).toLocaleString()} label="vB" />
          <TxStatDivider />
          {mempool.status.confirmed ? (
            <span className="text-xs font-mono text-green-400/80 shrink-0">
              confirmed #{mempool.status.block_height?.toLocaleString()}
            </span>
          ) : (
            <span className="text-xs font-mono text-yellow-400/70 shrink-0">unconfirmed</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {activeTab === "structure" && structure && (
          <AnalysisView data={structure} hideTerminal />
        )}

        {activeTab === "structure" && !structure && (
          <div className="max-w-3xl mx-auto px-6 py-16 text-center">
            <Layers className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-white mb-2">
              Structure Analysis Unavailable
            </h2>
            <p className="text-zinc-500 text-sm">
              {isCoinbase
                ? "Coinbase transactions have no input scripts to analyze."
                : "Could not run structure analysis for this transaction."}
            </p>
          </div>
        )}

        {activeTab === "privacy" && <PrivacyTab privacy={privacy} />}

        {activeTab === "raw" && <RawTab mempool={mempool} structure={structure} />}
      </div>

      <Footer />
    </div>
  );
}

const HEURISTIC_LABELS: Record<string, string> = {
  cioh: "CIOH",
  coinjoin: "CoinJoin",
  address_reuse: "Address Reuse",
  change_detection: "Change Detection",
  consolidation: "Consolidation",
  op_return: "OP_RETURN",
};
function formatHeuristic(id: string): string {
  return (
    HEURISTIC_LABELS[id] ??
    id
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

function PrivacyTab({ privacy }: { privacy: PrivacyData }) {
  const advice = privacy.advice?.advice;
  const fingerprint =
    privacy.fingerprint ||
    (privacy.advice?.fingerprint as typeof privacy.fingerprint);
  const heuristics = privacy.advice?.heuristics;
  const entropy = privacy.advice?.entropy;
  const classification = privacy.advice?.classification;

  const score = advice?.score ?? 0;
  const scoreColor =
    score >= 7 ? "text-green-400" : score >= 5 ? "text-yellow-400" : "text-red-400";
  const scoreBg =
    score >= 7 ? "bg-green-500" : score >= 5 ? "bg-yellow-500" : "bg-red-500";
  const scoreGlow =
    score >= 7
      ? "shadow-[0_0_20px_rgba(74,222,128,0.25)]"
      : score >= 5
        ? "shadow-[0_0_20px_rgba(234,179,8,0.25)]"
        : "shadow-[0_0_20px_rgba(248,113,113,0.25)]";

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Privacy Score Card */}
      {advice && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border border-white/8 bg-surface-card/60 backdrop-blur-sm p-6 mb-6 ${scoreGlow}`}
        >
          <div className="flex items-start justify-between gap-6 mb-5">
            <div>
              <h2 className="text-base font-bold text-white">Privacy Score</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Heuristic analysis · entropy · fingerprinting
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-4xl font-bold tabular-nums ${scoreColor}`}>
                {advice.score}
                <span className="text-xl text-zinc-600">/10</span>
              </div>
              <div className="text-xs text-zinc-400 mt-0.5 uppercase tracking-widest font-mono">
                {advice.grade}
              </div>
            </div>
          </div>

          {/* Score bar */}
          <div className="w-full bg-white/5 rounded-full h-1.5 mb-5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${scoreBg}`}
              style={{ width: `${(advice.score / 10) * 100}%` }}
            />
          </div>

          {advice.issues.length > 0 && (
            <div className="mb-5">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-2">
                Issues
              </div>
              <div className="flex flex-wrap gap-2">
                {advice.issues.map((issue) => (
                  <span
                    key={issue}
                    className="px-3 py-1 text-xs font-mono bg-red-500/10 text-red-400 rounded-full border border-red-500/20"
                  >
                    {issue}
                  </span>
                ))}
              </div>
            </div>
          )}

          {advice.recommendations.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-2">
                Recommendations
              </div>
              <ul className="space-y-1.5">
                {advice.recommendations.map((rec, i) => (
                  <li key={i} className="text-sm text-zinc-400 flex gap-2 leading-relaxed">
                    <span className="text-sherlock-400 shrink-0">→</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}

      {/* Heuristics Grid */}
      {heuristics && (
        <div className="grid md:grid-cols-2 gap-3 mb-6">
          {Object.entries(heuristics).map(([id, h], i) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-xl border p-4 backdrop-blur-sm ${
                h.detected
                  ? "border-sherlock-500/30 bg-sherlock-500/8"
                  : "border-white/5 bg-white/2"
              }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-white">
                  {formatHeuristic(id)}
                </h4>
                <span
                  className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    h.detected
                      ? "bg-sherlock-500/20 text-sherlock-400"
                      : "text-zinc-600"
                  }`}
                >
                  {h.detected ? "DETECTED" : "clear"}
                </span>
              </div>
              {h.detected && typeof h.confidence !== "undefined" && (
                <p className="text-xs text-zinc-500 mt-1.5">
                  Confidence: {String(h.confidence)}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Fingerprint & Entropy */}
      <div className="grid md:grid-cols-2 gap-4">
        {fingerprint && (
          <div className="rounded-xl border border-white/5 bg-surface-card/50 backdrop-blur-sm p-5">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-4">
              Wallet Fingerprint
            </div>
            <div className="space-y-2.5 text-sm">
              <Row label="BIP69 Compliant" value={fingerprint.bip69_compliant ? "Yes" : "No"} />
              <Row
                label="Low-R Signatures"
                value={
                  fingerprint.low_r_signatures === null
                    ? "N/A"
                    : fingerprint.low_r_signatures
                      ? "Yes"
                      : "No"
                }
              />
              <Row label="Anti-Fee-Sniping" value={fingerprint.anti_fee_sniping ? "Yes" : "No"} />
              <Row label="RBF Signaling" value={fingerprint.rbf_signaling ? "Yes" : "No"} />
              <Row label="Change Position" value={fingerprint.change_position} />
              {fingerprint.likely_wallet && (
                <Row label="Likely Wallet" value={fingerprint.likely_wallet} highlight />
              )}
            </div>
          </div>
        )}

        {entropy && (
          <div className="rounded-xl border border-white/5 bg-surface-card/50 backdrop-blur-sm p-5">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-4">
              Boltzmann Entropy
            </div>
            <div className="space-y-2.5 text-sm">
              <Row label="Entropy" value={`${entropy.entropy_bits.toFixed(2)} bits`} />
              <Row label="Interpretations" value={entropy.interpretations.toString()} />
              <Row label="Privacy Grade" value={entropy.privacy_grade} />
            </div>
          </div>
        )}

        {classification && (
          <div className="rounded-xl border border-white/5 bg-surface-card/50 backdrop-blur-sm p-5">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-4">
              Classification
            </div>
            <div className="text-base font-mono text-sherlock-400 capitalize">
              {classification.replace(/_/g, " ")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{label}</span>
      <span
        className={highlight ? "text-sherlock-400 font-medium" : "text-white"}
      >
        {value}
      </span>
    </div>
  );
}

function RawTab({ mempool, structure }: { mempool: MempoolTx; structure: AnalyzedTx | null }) {
  const feeBtc = (mempool.fee / 100_000_000).toFixed(8);
  const feeRate = ((mempool.fee * 4) / mempool.weight).toFixed(1);
  const totalOut = mempool.vout.reduce((sum, o) => sum + o.value, 0);
  const totalOutBtc = (totalOut / 100_000_000).toFixed(8);

  return (
    <div className="pb-12">
      <div className="max-w-4xl mx-auto px-6 pt-10">
        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatBox label="Inputs" value={mempool.vin.length.toString()} />
          <StatBox label="Outputs" value={mempool.vout.length.toString()} />
          <StatBox label="Fee" value={`${mempool.fee.toLocaleString()} sats`} sub={`${feeBtc} BTC`} />
          <StatBox label="Fee Rate" value={`${feeRate} sat/vB`} />
          <StatBox label="Size" value={`${mempool.weight} WU`} sub={`${Math.ceil(mempool.weight / 4)} vB`} />
          <StatBox label="Value Out" value={`${totalOutBtc} BTC`} />
          <StatBox label="Version" value={mempool.version.toString()} />
          <StatBox label="Locktime" value={mempool.locktime.toString()} />
        </div>

        {/* Confirmation status */}
        <div className="rounded-xl border border-white/5 bg-surface-card/50 backdrop-blur-sm p-5 mb-6">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-3">
            Status
          </div>
          {mempool.status.confirmed ? (
            <div className="space-y-2.5 text-sm">
              <Row label="Confirmed" value="Yes" highlight />
              <Row label="Block Height" value={mempool.status.block_height?.toLocaleString() || ""} />
              <Row
                label="Block Time"
                value={
                  mempool.status.block_time
                    ? new Date(mempool.status.block_time * 1000).toLocaleString("en-GB")
                    : ""
                }
              />
            </div>
          ) : (
            <div className="text-yellow-400 text-sm">Unconfirmed — pending in mempool</div>
          )}
        </div>
      </div>

      {/* HexTerminal — txray lens output if available, else mempool JSON */}
      <HexTerminal rawJsonData={structure ?? mempool} />
    </div>
  );
}

function TxStat({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex items-baseline gap-1 shrink-0">
      <span className="text-sm font-mono font-semibold text-white">{value}</span>
      <span className="text-[11px] text-zinc-500">{label}</span>
    </span>
  );
}

function TxStatDivider() {
  return <span className="text-zinc-700 shrink-0 select-none">·</span>;
}

function StatBox({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-surface-card/60 backdrop-blur-sm p-4">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-1">
        {label}
      </div>
      <div className="text-sm font-bold text-white font-mono">{value}</div>
      {sub && (
        <div className="text-[10px] text-zinc-600 mt-1 font-mono">{sub}</div>
      )}
    </div>
  );
}
