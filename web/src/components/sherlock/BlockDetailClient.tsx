"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Activity,
  AlertTriangle,
  Zap,
  Database,
  Link2,
  Coins,
  Repeat,
  Blend,
  Package,
  ArrowLeftRight,
  FileCode,
  Target,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Link from "next/link";
import type { BlockFileData, Transaction } from "@/lib/sherlockTypes";
import { CLASSIFICATION_CONFIG, HEURISTIC_LABELS } from "@/lib/sherlockTypes";
import { ContentScanLoader } from "@/components/sherlock/ContentScanLoader";

const HEURISTIC_DESCRIPTIONS: Record<string, string> = {
  cioh: "If multiple inputs are spent together, they likely belong to the same wallet owner",
  change_detection:
    "Identifies which output is leftover 'change' sent back to the sender",
  address_reuse:
    "Flags when the same address appears multiple times, weakening privacy",
  coinjoin:
    "Spots privacy-mixing transactions where multiple users combine their coins",
  consolidation:
    "Detects when many small coins are merged into one larger coin",
  self_transfer:
    "Identifies transactions where someone sends Bitcoin to themselves",
  op_return:
    "Analyzes embedded data messages stored permanently on the blockchain",
  round_number_payment:
    "Flags round BTC amounts (like 0.1 BTC) which are likely payments, not change",
};

const HEURISTIC_ICONS: Record<string, React.ElementType> = {
  cioh: Link2,
  change_detection: Coins,
  address_reuse: Repeat,
  coinjoin: Blend,
  consolidation: Package,
  self_transfer: ArrowLeftRight,
  op_return: FileCode,
  round_number_payment: Target,
};

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  alert,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ElementType;
  alert?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md p-5 flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-2">
        {Icon && (
          <Icon
            className={`w-4 h-4 ${alert ? "text-amber-500" : "text-zinc-500"}`}
          />
        )}
        <div className="text-xs uppercase tracking-widest text-zinc-500 font-medium">
          {label}
        </div>
      </div>
      <div
        className={`text-2xl font-bold font-mono ${alert ? "text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "text-white"}`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
    </div>
  );
}

function ClassificationPieChart({
  counts,
  total,
}: {
  counts: Record<string, number>;
  total: number;
}) {
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  const colorTailwindMap: Record<string, string> = {
    coinjoin: "bg-purple-500",
    consolidation: "bg-blue-500",
    self_transfer: "bg-cyan-500",
    batch_payment: "bg-orange-500",
    simple_payment: "bg-zinc-500",
    unknown: "bg-zinc-700",
  };

  const colorHexMap: Record<string, string> = {
    coinjoin: "#a855f7",
    consolidation: "#3b82f6",
    self_transfer: "#06b6d4",
    batch_payment: "#f97316",
    simple_payment: "#71717a",
    unknown: "#3f3f46",
  };

  const radius = 35;
  const circumference = 2 * Math.PI * radius;

  // Use reduce for pure calculation of offsets to satisfy React Compiler
  type PieSlice = {
    cls: string;
    count: number;
    percent: number;
    strokeLength: number;
    dashOffset: number;
  };
  const pieData = sorted.reduce<PieSlice[]>((acc, [cls, count]) => {
    const percent = count / total;
    const strokeLength = percent * circumference;
    const lastOffset = acc.length > 0 ? acc[acc.length - 1].dashOffset : 0;
    const lastLength = acc.length > 0 ? acc[acc.length - 1].strokeLength : 0;
    const dashOffset = lastOffset - lastLength;

    acc.push({ cls, count, percent, strokeLength, dashOffset });
    return acc;
  }, []);

  return (
    <div className="rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md p-5 flex items-center h-full">
      <div className="flex-1">
        <div className="text-xs uppercase tracking-widest text-zinc-500 mb-4 font-medium">
          Classification Distribution
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-2.5">
          {sorted.map(([cls, count]) => (
            <div key={cls} className="flex items-center gap-2 text-xs">
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${colorTailwindMap[cls] || "bg-zinc-700"}`}
              />
              <span
                className={`truncate ${CLASSIFICATION_CONFIG[cls]?.color || "text-zinc-500"}`}
                title={CLASSIFICATION_CONFIG[cls]?.label || cls}
              >
                {CLASSIFICATION_CONFIG[cls]?.label || cls}
              </span>
              <span className="text-zinc-600 font-mono text-[11px] ml-auto">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="w-32 h-32 shrink-0 ml-4 relative">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full transform -rotate-90 drop-shadow-md"
        >
          {/* Background Ring */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="12"
          />
          {/* Highlight Slices */}
          {pieData.map(({ cls, count, percent, strokeLength, dashOffset }) => {
            if (count === 0) return null;
            // Gap of 2px between segments (unless it's the only segment)
            const gap = pieData.filter((d) => d.count > 0).length > 1 ? 2 : 0;
            // Ensure tiny slices don't completely disappear due to the gap
            const visualGap = Math.min(gap, strokeLength * 0.5);
            const adjustedLength = Math.max(0.1, strokeLength - visualGap);
            const dashArray = `${adjustedLength} ${circumference}`;

            const pctStr = percent * 100;
            const displayPct =
              pctStr > 0 && pctStr < 0.1 ? "<0.1" : pctStr.toFixed(1);

            return (
              <motion.circle
                key={cls}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={colorHexMap[cls] || "#3f3f46"}
                strokeWidth="12"
                strokeDasharray={dashArray}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: dashOffset }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
                className="hover:stroke-[14px] transition-all duration-300 transform-origin-center cursor-pointer pointer-events-stroke"
              >
                <title>{`${CLASSIFICATION_CONFIG[cls]?.label || cls}: ${count} (${displayPct}%)`}</title>
              </motion.circle>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider translate-y-1">
            Total
          </span>
          <span className="text-xs font-mono text-white/90 translate-y-0.5">
            {total}
          </span>
        </div>
      </div>
    </div>
  );
}

function ScriptTypeChart({
  distribution,
}: {
  distribution: Record<string, number>;
}) {
  const sorted = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;
  return (
    <div className="rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md p-5">
      <div className="text-xs uppercase tracking-widest text-zinc-500 mb-4 font-medium">
        Script Type Distribution
      </div>
      <div className="space-y-3">
        {sorted.map(([type, count]) => (
          <div key={type} className="flex items-center gap-3">
            <div className="w-16 text-[10px] uppercase tracking-wider font-mono text-zinc-400 text-right shrink-0">
              {type}
            </div>
            <div className="flex-1 h-1.5 bg-white/5 rounded-sm overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(count / max) * 100}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-blue-500/80 rounded-sm"
              />
            </div>
            <div className="w-12 text-xs font-mono text-zinc-500 text-right">
              {count.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TxRow({
  tx,
  stem,
  isExpanded,
  onToggle,
}: {
  tx: Transaction;
  stem: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const cfg =
    CLASSIFICATION_CONFIG[tx.classification] || CLASSIFICATION_CONFIG.unknown;
  const detectedHeuristics = Object.entries(tx.heuristics).filter(
    ([, v]) => v.detected,
  );

  return (
    <div className="border-b border-white/5 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <span className="text-sm font-mono text-zinc-300 truncate block">
            {tx.txid.slice(0, 16)}…{tx.txid.slice(-8)}
          </span>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full border font-medium shrink-0 w-24 text-center ${cfg.bg} ${cfg.color}`}
        >
          {cfg.label}
        </span>
        <span className="text-xs text-zinc-600 w-10 shrink-0 flex items-center justify-center">
          {detectedHeuristics.length > 0 ? (
            <span
              className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${detectedHeuristics.length >= 3 ? "bg-red-500/20 text-red-400 border border-red-500/30 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" : detectedHeuristics.length === 2 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-blue-500/20 text-blue-400 border border-blue-500/30"}`}
            >
              {detectedHeuristics.length}
            </span>
          ) : (
            <span className="opacity-30">0</span>
          )}
        </span>
        <span className="w-16 text-right font-mono text-xs text-zinc-500 hidden md:block shrink-0">
          {tx.fee_sats != null ? tx.fee_sats.toLocaleString() : "—"}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-600 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-600 shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 flex items-center justify-between gap-4">
              <div className="flex flex-wrap gap-1.5 flex-1">
                {detectedHeuristics.length > 0 ? (
                  detectedHeuristics.map(([key]) => (
                    <span
                      key={key}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-medium"
                    >
                      {HEURISTIC_LABELS[key] || key}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-zinc-600">
                    No heuristics triggered
                  </span>
                )}
              </div>
              <Link
                href={`/sherlock/${stem}/tx/${tx.txid}`}
                className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors px-3 py-1.5 rounded-lg border border-brand-500/20 hover:bg-brand-500/5"
              >
                Investigate <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const PAGE_SIZE = 30;

type SortKey = "heuristics" | "classification" | "fee" | null;

function getDetectedCount(tx: Transaction): number {
  return Object.values(tx.heuristics).filter((h) => h.detected).length;
}

export default function BlockDetailClient({ stem }: { stem: string }) {
  const [data, setData] = useState<BlockFileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [pageInputValue, setPageInputValue] = useState("1");
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Always start true; hide once the loading experience completes
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    fetch(`/api/results/${stem}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load data");
        setLoading(false);
      });
  }, [stem]);

  // Block 0 has full transactions
  const block0 = data?.blocks?.[0];
  const txs = useMemo(() => block0?.transactions || [], [block0]);
  const summary = data?.analysis_summary;

  // Classification counts from block0 txs
  const classificationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    txs.forEach((tx) => {
      counts[tx.classification] = (counts[tx.classification] || 0) + 1;
    });
    return counts;
  }, [txs]);

  // Filtered + searchable transactions (supports #index search)
  const filteredTxs = useMemo(() => {
    let list = txs;
    if (classFilter)
      list = list.filter((tx) => tx.classification === classFilter);
    if (searchQuery) {
      const q = searchQuery.trim();
      if (q.startsWith("#")) {
        const idx = parseInt(q.slice(1));
        if (!isNaN(idx) && idx >= 0 && idx < list.length) {
          list = [list[idx]];
        } else {
          list = [];
        }
      } else {
        list = list.filter((tx) => tx.txid.includes(q.toLowerCase()));
      }
    }
    return list;
  }, [txs, classFilter, searchQuery]);

  // Sorted transactions
  const sortedTxs = useMemo(() => {
    if (!sortKey) return filteredTxs;
    const sorted = [...filteredTxs].sort((a, b) => {
      let va = 0, vb = 0;
      if (sortKey === "heuristics") {
        va = getDetectedCount(a);
        vb = getDetectedCount(b);
      } else if (sortKey === "classification") {
        va = a.classification.localeCompare(b.classification);
        return sortDir === "asc" ? va : -va;
      } else if (sortKey === "fee") {
        va = a.fee_sats ?? 0;
        vb = b.fee_sats ?? 0;
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return sorted;
  }, [filteredTxs, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedTxs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedTxs = sortedTxs.slice(
    safePage * PAGE_SIZE,
    (safePage + 1) * PAGE_SIZE,
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === "desc") setSortDir("asc");
      else { setSortKey(null); setSortDir("desc"); }
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(0);
    setPageInputValue("1");
  };

  const getSortIcon = (col: SortKey) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "desc"
      ? <ArrowDown className="w-3 h-3 text-brand-400" />
      : <ArrowUp className="w-3 h-3 text-brand-400" />;
  };

  if (showLoader) {
    return (
      <ContentScanLoader
        dataReady={!loading}
        onComplete={() => {
          setShowLoader(false);
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-zinc-500 animate-pulse">
          Loading analysis data…
        </div>
      </div>
    );
  }

  if (error || !data || !block0) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-red-400">{error || "No data available"}</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-6 pt-24 pb-16 z-10 relative">
      {/* Back nav */}
      <Link
        href="/sherlock"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Sherlock
      </Link>

      {/* Title */}
      <div className="mb-8">
        <div className="text-[10px] font-mono uppercase tracking-widest text-blue-400 font-bold mb-2">
          Case File
        </div>
        <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight drop-shadow-md">
          {data.file}
        </h1>
        <p className="text-zinc-500 mt-2 font-mono text-sm">
          {data.block_count} blocks in volume
        </p>
      </div>

      {/* Heuristics Applied */}
      {summary?.heuristics_applied && summary.heuristics_applied.length > 0 && (
        <div className="mb-8">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 mb-3">
            Heuristics Applied
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.heuristics_applied.map((h) => (
              <div key={h} className="group relative">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/15 cursor-default hover:bg-blue-500/20 hover:border-blue-500/30 transition-all">
                  {(() => {
                    const Icon = HEURISTIC_ICONS[h] || Search;
                    return <Icon className="w-3 h-3" />;
                  })()}
                  {HEURISTIC_LABELS[h] || h}
                </span>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-[11px] text-zinc-300 leading-relaxed w-56 text-center opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 shadow-xl">
                  {HEURISTIC_DESCRIPTIONS[h] || "Analyzes transaction patterns"}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-900" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Activity}
          label="Total Txs"
          value={summary?.total_transactions_analyzed.toLocaleString() || "—"}
        />
        <StatCard
          icon={AlertTriangle}
          alert
          label="Flagged"
          value={summary?.flagged_transactions.toLocaleString() || "—"}
          sub={`${summary ? ((summary.flagged_transactions / summary.total_transactions_analyzed) * 100).toFixed(1) : 0}% of total transactions`}
        />
        <StatCard
          icon={Zap}
          label="Median Fee"
          value={`${summary?.fee_rate_stats.median_sat_vb || 0} sat/vB`}
          sub={`${summary?.fee_rate_stats.min_sat_vb}–${summary?.fee_rate_stats.max_sat_vb} range`}
        />
        <StatCard
          icon={Database}
          label="Base Block Height"
          value={block0.block_height.toLocaleString()}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <ClassificationPieChart
          counts={classificationCounts}
          total={txs.length}
        />
        <ScriptTypeChart
          distribution={block0.analysis_summary.script_type_distribution}
        />
      </div>

      {/* Transaction List */}
      <div className="rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-white/5">
          <div className="flex-1 relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input
              type="text"
              placeholder="Search by txid or #index..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
                setPageInputValue("1");
              }}
              className="w-full bg-white/5 border border-white/5 rounded-lg pl-9 pr-4 py-2 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-500/30 focus:ring-1 focus:ring-brand-500/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Filter className="w-4 h-4 text-zinc-600" />
              <select
                value={classFilter || ""}
                onChange={(e) => {
                  setClassFilter(e.target.value || null);
                  setPage(0);
                  setPageInputValue("1");
                }}
                className="bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-sm text-zinc-400 focus:outline-none focus:border-brand-500/30 appearance-none cursor-pointer"
              >
                <option value="">All ({txs.length})</option>
                {Object.entries(classificationCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cls, count]) => (
                    <option key={cls} value={cls}>
                      {CLASSIFICATION_CONFIG[cls]?.label || cls} ({count})
                    </option>
                  ))}
              </select>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const np = Math.max(0, safePage - 1);
                    setPage(np);
                    setPageInputValue(String(np + 1));
                  }}
                  disabled={safePage === 0}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 transition-colors border border-white/10"
                >
                  <ChevronLeft className="w-4 h-4 text-zinc-400" />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  value={pageInputValue}
                  onChange={(e) => setPageInputValue(e.target.value)}
                  onBlur={() => {
                    const val = parseInt(pageInputValue);
                    if (!isNaN(val) && val >= 1 && val <= totalPages) {
                      setPage(val - 1);
                      setPageInputValue(String(val));
                    } else {
                      setPageInputValue(String(safePage + 1));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  className="w-10 text-center text-xs font-mono bg-black/40 border border-white/10 rounded-lg py-1.5 text-white focus:outline-none focus:border-brand-500/50"
                />
                <span className="text-xs text-zinc-500 font-mono">/ {totalPages}</span>
                <button
                  onClick={() => {
                    const np = Math.min(totalPages - 1, safePage + 1);
                    setPage(np);
                    setPageInputValue(String(np + 1));
                  }}
                  disabled={safePage >= totalPages - 1}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 transition-colors border border-white/10"
                >
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Table Header — sortable columns */}
        <div className="flex items-center gap-3 px-4 py-2 text-xs text-zinc-600 uppercase tracking-widest border-b border-white/5 bg-black/30">
          <div className="flex-1">Transaction ID</div>
          <button
            onClick={() => toggleSort("classification")}
            className="w-24 text-center flex items-center justify-center gap-1 hover:text-white transition-colors cursor-pointer"
          >
            Class {getSortIcon("classification")}
          </button>
          <button
            onClick={() => toggleSort("heuristics")}
            className="w-10 text-center flex items-center justify-center gap-1 hover:text-white transition-colors cursor-pointer"
            title="Sort by heuristic trigger count"
          >
            H {getSortIcon("heuristics")}
          </button>
          <button
            onClick={() => toggleSort("fee")}
            className="w-16 text-center hidden md:flex items-center justify-center gap-1 hover:text-white transition-colors cursor-pointer"
            title="Sort by fee"
          >
            Fee {getSortIcon("fee")}
          </button>
          <div className="w-4" />
        </div>

        {/* Transaction Rows — scrollable body */}
        <div className="max-h-[55vh] overflow-y-auto">
          {paginatedTxs.map((tx) => (
            <TxRow
              key={tx.txid}
              tx={tx}
              stem={stem}
              isExpanded={expandedTx === tx.txid}
              onToggle={() =>
                setExpandedTx(expandedTx === tx.txid ? null : tx.txid)
              }
            />
          ))}
        </div>

        {sortedTxs.length === 0 && (
          <div className="px-4 py-12 text-center text-zinc-600 text-sm">
            No transactions match your filter.
          </div>
        )}

        {/* Bottom status bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/5 text-xs text-zinc-600">
          <span>
            {searchQuery
              ? `${sortedTxs.length} match${sortedTxs.length !== 1 ? "es" : ""}`
              : `Showing ${safePage * PAGE_SIZE + 1}–${Math.min((safePage + 1) * PAGE_SIZE, sortedTxs.length)} of ${sortedTxs.length.toLocaleString()}`}
          </span>
          {sortKey && (
            <span className="text-zinc-500">
              Sorted by {sortKey === "heuristics" ? "triggers" : sortKey} {sortDir === "desc" ? "↓" : "↑"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
