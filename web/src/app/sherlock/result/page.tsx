"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Fingerprint,
  ArrowLeft,
  AlertTriangle,
  Loader2,
} from "lucide-react";

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

interface SherlockResult {
  ok: boolean;
  txid?: string;
  privacy: PrivacyData;
  errors?: string[];
}

function formatHeuristic(id: string): string {
  return id
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-zinc-500 text-sm">{label}</span>
      <span className={`text-sm font-mono ${highlight ? "text-sherlock-400 font-bold" : "text-zinc-300"}`}>
        {value}
      </span>
    </div>
  );
}

export default function SherlockResultPage() {
  const router = useRouter();
  const [data, setData] = useState<SherlockResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("sherlock_result");
      if (!raw) {
        router.replace("/sherlock");
        return;
      }
      const parsed = JSON.parse(raw) as SherlockResult;
      if (!parsed.ok || !parsed.privacy) {
        router.replace("/sherlock");
        return;
      }
      setData(parsed);
    } catch {
      router.replace("/sherlock");
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-sherlock-400 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const privacy = data.privacy;
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
    <div className="min-h-screen flex flex-col">
      <div className="max-w-4xl mx-auto px-6 pt-24 pb-16 w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <button
            onClick={() => router.push("/sherlock")}
            className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-300 transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Sherlock
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sherlock-500/10 border border-sherlock-500/20 text-sherlock-400 text-xs font-mono uppercase tracking-widest">
              <Fingerprint className="w-3.5 h-3.5" />
              Sherlock
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Privacy Analysis
          </h1>
          {data.txid && (
            <p className="text-stone-500 text-sm font-mono mt-1 truncate">
              {data.txid}
            </p>
          )}
        </motion.div>

        {/* Errors */}
        {data.errors && data.errors.length > 0 && (
          <div className="mb-6 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-400 space-y-1">
              {data.errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          </div>
        )}

        {/* Privacy Score */}
        {advice && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border border-white/8 bg-stone-950/60 backdrop-blur-sm p-6 mb-6 ${scoreGlow}`}
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

            <div className="w-full bg-white/5 rounded-full h-1.5 mb-5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${scoreBg}`}
                style={{ width: `${(advice.score / 10) * 100}%` }}
              />
            </div>

            {advice.issues.length > 0 && (
              <div className="mb-5">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-2">Issues</div>
                <div className="flex flex-wrap gap-2">
                  {advice.issues.map((issue) => (
                    <span key={issue} className="px-3 py-1 text-xs font-mono bg-red-500/10 text-red-400 rounded-full border border-red-500/20">
                      {issue}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {advice.recommendations.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-2">Recommendations</div>
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
                  <h4 className="text-sm font-medium text-white">{formatHeuristic(id)}</h4>
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    h.detected ? "bg-sherlock-500/20 text-sherlock-400" : "text-zinc-600"
                  }`}>
                    {h.detected ? "DETECTED" : "clear"}
                  </span>
                </div>
                {h.detected && typeof h.confidence !== "undefined" && (
                  <p className="text-xs text-zinc-500 mt-1.5">Confidence: {String(h.confidence)}</p>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Fingerprint + Entropy + Classification */}
        <div className="grid md:grid-cols-2 gap-4">
          {fingerprint && (
            <div className="rounded-xl border border-white/5 bg-stone-950/50 backdrop-blur-sm p-5">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-4">Wallet Fingerprint</div>
              <div className="space-y-2.5">
                <Row label="BIP69 Compliant" value={fingerprint.bip69_compliant ? "Yes" : "No"} />
                <Row label="Low-R Signatures" value={fingerprint.low_r_signatures === null ? "N/A" : fingerprint.low_r_signatures ? "Yes" : "No"} />
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
            <div className="rounded-xl border border-white/5 bg-stone-950/50 backdrop-blur-sm p-5">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-4">Boltzmann Entropy</div>
              <div className="space-y-2.5">
                <Row label="Entropy" value={`${entropy.entropy_bits.toFixed(2)} bits`} />
                <Row label="Interpretations" value={entropy.interpretations.toString()} />
                <Row label="Privacy Grade" value={entropy.privacy_grade} />
              </div>
            </div>
          )}

          {classification && (
            <div className="rounded-xl border border-white/5 bg-stone-950/50 backdrop-blur-sm p-5">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-4">Classification</div>
              <div className="text-base font-mono text-sherlock-400 capitalize">
                {classification.replace(/_/g, " ")}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
