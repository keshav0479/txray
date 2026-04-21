"use client";

import { useState, useMemo } from "react";
import {
  ArrowLeftRight,
  Coins,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Zap,
  Fingerprint,
  Blocks,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
} from "lucide-react";
import type { AnalyzedTx, BlockAnalysis } from "@/lib/layout";
import {
  SCRIPT_COLORS,
  SCRIPT_NAMES,
  SCRIPT_DEFINITIONS,
  SCRIPT_ANALOGIES,
} from "@/lib/scriptData";
import { Tooltip } from "@/components/ui/Tooltip";

interface BlockOverviewProps {
  blockData: BlockAnalysis;
  onSelectTx: (tx: AnalyzedTx) => void;
  onReset: () => void;
  resetLabel?: string;
}

export function BlockOverview({
  blockData,
  onSelectTx,
  onReset,
  resetLabel = "-> Analyze Another",
}: BlockOverviewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageInputValue, setPageInputValue] = useState("1");
  const [sortKey, setSortKey] = useState<"inputs" | "outputs" | "fee" | null>(
    null,
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const itemsPerPage = 50;

  const { block_header, block_stats, coinbase, transactions } = blockData;
  const totalTxs = blockData.tx_count;

  // Filter transactions by search query (supports #index and TXID)
  const filteredTxs = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const q = searchQuery.trim();
    // Support #index search
    if (q.startsWith("#")) {
      const idx = parseInt(q.slice(1));
      if (!isNaN(idx) && idx >= 0 && idx < transactions.length) {
        return [transactions[idx]];
      }
      return [];
    }
    return transactions.filter((tx) =>
      tx.txid?.toLowerCase().includes(q.toLowerCase()),
    );
  }, [transactions, searchQuery]);

  // Sort filtered transactions
  const sortedTxs = useMemo(() => {
    if (!sortKey) return filteredTxs;
    const sorted = [...filteredTxs].sort((a, b) => {
      let va = 0,
        vb = 0;
      if (sortKey === "inputs") {
        va = a.vin?.length || 0;
        vb = b.vin?.length || 0;
      } else if (sortKey === "outputs") {
        va = a.vout?.length || 0;
        vb = b.vout?.length || 0;
      } else if (sortKey === "fee") {
        va = a.fee_sats || 0;
        vb = b.fee_sats || 0;
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return sorted;
  }, [filteredTxs, sortKey, sortDir]);

  const effectiveTotalTxs = sortedTxs.length;
  const totalPages = Math.max(1, Math.ceil(effectiveTotalTxs / itemsPerPage));

  // Clamp page when filter changes
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTxs = sortedTxs.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage,
  );

  const toggleSort = (key: "inputs" | "outputs" | "fee") => {
    if (sortKey === key) {
      if (sortDir === "desc") setSortDir("asc");
      else {
        setSortKey(null);
        setSortDir("desc");
      }
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setCurrentPage(1);
    setPageInputValue("1");
  };

  const getSortIcon = (col: "inputs" | "outputs" | "fee") => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "desc" ? (
      <ArrowDown className="w-3 h-3 text-lens-400" />
    ) : (
      <ArrowUp className="w-3 h-3 text-lens-400" />
    );
  };

  const scriptColors = SCRIPT_COLORS;
  const scriptNames = SCRIPT_NAMES;
  const scriptDefinitions = SCRIPT_DEFINITIONS;
  const scriptAnalogies = SCRIPT_ANALOGIES;

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-12 min-h-screen animate-in fade-in duration-1000 text-white relative z-10">
      {/* Top Bar */}
      <div className="mb-8 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-lens-500/10 border border-lens-500/20 text-lens-400">
            <Blocks className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Block Overview
            </h1>
            <p className="text-sm text-zinc-400 font-mono">
              Height: {coinbase.bip34_height.toLocaleString()}
            </p>
          </div>
        </div>
        <button
          onClick={onReset}
          className="text-sm font-medium text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 bg-black/40 backdrop-blur-xl px-4 py-2 rounded-full transition-all"
        >
          {resetLabel}
        </button>
      </div>

      {/* Hero Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <CopyableHash hash={block_header.block_hash} />
        <StatCard
          icon={<ArrowLeftRight />}
          title={
            <Tooltip
              term="Transactions"
              definition="The total number of individual transfers grouped and finalized together in this block."
              analogy="Like the number of letters stuffed into a single mailbag."
            >
              Transactions
            </Tooltip>
          }
          value={totalTxs.toLocaleString()}
        />
        <StatCard
          icon={<Coins />}
          title={
            <Tooltip
              term="Total Fees"
              definition="The combined total that all senders in this block paid to the miner for including their transactions."
              analogy="Like the total postage collected for all the letters in the mailbag."
            >
              Total Fees
            </Tooltip>
          }
          value={
            <span className="text-white">
              {(block_stats.total_fees_sats / 100_000_000).toFixed(4)}{" "}
              <span className="text-sm text-zinc-500">BTC</span>
            </span>
          }
        />
        <StatCard
          icon={<Zap />}
          title={
            <Tooltip
              term="Avg Fee Rate"
              definition="The average 'bidding price' paid for block space. Higher rates get processed faster."
              analogy="Like the average price people paid for priority overnight shipping."
            >
              Avg Fee Rate
            </Tooltip>
          }
          value={
            <span>
              {block_stats.avg_fee_rate_sat_vb.toFixed(1)}{" "}
              <span className="text-sm text-zinc-500">sat/vB</span>
            </span>
          }
        />
      </div>

      {/* Merkle Validation & Weights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-12">
        <div className="p-5 rounded-2xl border border-surface-border bg-surface-card/50 backdrop-blur-xl lg:col-span-2 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-400">
              Script Type Distribution
            </span>
          </div>
          <div className="h-4 w-full rounded-full overflow-hidden flex bg-zinc-800">
            {Object.entries(block_stats.script_type_summary)
              .sort((a, b) => b[1] - a[1]) // Sort by count descending
              .map(([type, count]) => {
                const width = `${(count / Object.values(block_stats.script_type_summary).reduce((a, b) => a + b, 0)) * 100}%`;
                return (
                  <div
                    key={type}
                    style={{ width }}
                    className={`${scriptColors[type] || "bg-zinc-500"} border-r border-black/20 last:border-r-0`}
                    title={`${type.toUpperCase()}: ${count}`}
                  />
                );
              })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-xs font-mono">
            {Object.entries(block_stats.script_type_summary)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div key={type} className="flex items-center gap-1.5 z-50">
                  <div
                    className={`w-2 h-2 rounded-full ${scriptColors[type] || "bg-zinc-500"}`}
                  />
                  <Tooltip
                    term={`${scriptNames[type] || "Unknown"} (${type.toUpperCase()})`}
                    definition={
                      scriptDefinitions[type] || "Cryptographic lock format."
                    }
                    analogy={scriptAnalogies[type] || ""}
                  >
                    {scriptNames[type] || type.toUpperCase()}
                  </Tooltip>
                  <span className="text-zinc-500 ml-1">{count}</span>
                </div>
              ))}
          </div>
        </div>

        <div
          className={`p-5 rounded-2xl border ${block_header.merkle_root_valid ? "border-surface-border bg-surface-card/50" : "border-red-500/30 bg-red-950/80"} backdrop-blur-xl flex flex-col justify-center`}
        >
          <div className="flex items-center gap-2 mb-2">
            {block_header.merkle_root_valid ? (
              <>
                <Tooltip
                  term="Merkle Root"
                  definition="A single master hash that mathematically proves every single transaction in this block is authentic and unaltered."
                  analogy="Like a wax seal on a document that breaks if a single comma is changed inside."
                >
                  <span className="text-sm font-medium text-zinc-400">
                    Merkle Root
                  </span>
                </Tooltip>
                <span className="ml-auto text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="font-semibold text-red-400">
                  <Tooltip
                    term="Merkle Root"
                    definition="A single master hash that mathematically proves every single transaction in this block is authentic and unaltered."
                    analogy="Like a wax seal on a document that breaks if a single comma is changed inside."
                  >
                    Merkle Root
                  </Tooltip>{" "}
                  is Corrupt
                </span>
              </>
            )}
          </div>
          <p className="text-sm text-zinc-500 font-mono break-all line-clamp-2">
            {block_header.merkle_root}
          </p>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <Tooltip
                term="Block Capacity"
                definition="How full this block is. Each block can hold a maximum of 4,000,000 Weight Units (WU) of transaction data."
                analogy="Like how full a shipping container is -- once it's packed, no more packages fit."
              >
                <span className="text-zinc-400">Block Capacity</span>
              </Tooltip>
              <span className="text-zinc-300 font-mono font-semibold">
                {Math.min(
                  100,
                  (block_stats.total_weight / 4_000_000) * 100,
                ).toFixed(1)}
                %
              </span>
            </div>
            <div className="h-2 rounded-full bg-black/40 border border-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min(100, (block_stats.total_weight / 4_000_000) * 100)}%`,
                  background: "linear-gradient(90deg, #22d3ee, #3b82f6)",
                }}
              />
            </div>
            <p className="text-[10px] text-zinc-600 mt-1 font-mono">
              {block_stats.total_weight.toLocaleString()} / 4,000,000 WU
            </p>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
          <h2 className="text-xl font-semibold">
            Transactions{" "}
            <span className="text-zinc-500 text-sm font-normal ml-2">
              {searchQuery
                ? `${effectiveTotalTxs} matches`
                : `Showing ${(safePage - 1) * itemsPerPage + 1} - ${Math.min(safePage * itemsPerPage, effectiveTotalTxs)}`}
            </span>
          </h2>

          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by TXID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-lens-500/50 focus:ring-1 focus:ring-lens-500/20 w-56 transition-all"
              />
            </div>

            {/* Pagination */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setCurrentPage((p) => {
                    const np = Math.max(1, p - 1);
                    setPageInputValue(String(np));
                    return np;
                  });
                }}
                disabled={safePage === 1}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 transition-colors border border-white/10"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <input
                type="text"
                inputMode="numeric"
                value={pageInputValue}
                onChange={(e) => setPageInputValue(e.target.value)}
                onBlur={() => {
                  const val = parseInt(pageInputValue);
                  if (!isNaN(val) && val >= 1 && val <= totalPages) {
                    setCurrentPage(val);
                    setPageInputValue(String(val));
                  } else {
                    setPageInputValue(String(safePage));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="w-12 text-center text-sm font-mono bg-black/40 border border-white/10 rounded-lg py-1.5 text-white focus:outline-none focus:border-lens-500/50"
              />
              <span className="text-sm text-zinc-500 font-mono">
                / {totalPages}
              </span>
              <button
                onClick={() => {
                  setCurrentPage((p) => {
                    const np = Math.min(totalPages, p + 1);
                    setPageInputValue(String(np));
                    return np;
                  });
                }}
                disabled={safePage === totalPages}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 transition-colors border border-white/10"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="w-full rounded-2xl border border-surface-border bg-surface-card/50 overflow-hidden backdrop-blur-sm shadow-xl">
          <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-surface-border bg-black/60 text-xs font-bold tracking-wider text-zinc-500 uppercase">
            <div className="col-span-1 hidden md:block">#</div>
            <div className="col-span-6 md:col-span-4">TXID</div>
            <button
              onClick={() => toggleSort("inputs")}
              className="col-span-2 hidden md:flex items-center justify-end gap-1 hover:text-white transition-colors cursor-pointer"
            >
              Inputs {getSortIcon("inputs")}
            </button>
            <button
              onClick={() => toggleSort("outputs")}
              className="col-span-2 hidden md:flex items-center justify-end gap-1 hover:text-white transition-colors cursor-pointer"
            >
              Outputs {getSortIcon("outputs")}
            </button>
            <button
              onClick={() => toggleSort("fee")}
              className="col-span-6 md:col-span-3 flex items-center justify-end gap-1 hover:text-white transition-colors cursor-pointer"
            >
              Fee (sats) {getSortIcon("fee")}
            </button>
          </div>

          <div className="divide-y divide-surface-border/50 bg-black/20 max-h-[50vh] overflow-y-auto">
            {paginatedTxs.map((tx, idx) => {
              const globalIndex = transactions.indexOf(tx);
              const isCoinbaseTx = globalIndex === 0;
              const hasWarnings = tx.warnings && tx.warnings.length > 0;

              return (
                <button
                  key={tx.txid || idx}
                  onClick={() => onSelectTx(tx)}
                  className={`w-full grid grid-cols-12 gap-4 px-6 py-4 transition-all items-center text-left hover:cursor-pointer
                    ${isCoinbaseTx ? "hover:bg-amber-500/10" : hasWarnings ? "hover:bg-red-500/10" : "hover:bg-lens-500/10"}
                  `}
                >
                  <div className="col-span-1 hidden md:block text-xs font-mono text-zinc-600">
                    #{globalIndex}
                  </div>
                  <div className="col-span-6 md:col-span-4 flex items-center gap-3 truncate pr-4">
                    {isCoinbaseTx && (
                      <span
                        className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-500 border border-amber-500/30"
                        title="The very first transaction in a block where new Bitcoin is minted by the miner. It has no inputs."
                      >
                        Coinbase
                      </span>
                    )}
                    {hasWarnings && !isCoinbaseTx && (
                      <span
                        className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/20 text-red-500 border border-red-500/30 cursor-help"
                        title={`Warnings Detected:\n${tx.warnings?.map((w) => `- ${w.code.replace(/_/g, " ")}`).join("\n")}`}
                      >
                        Warn{" "}
                        <HelpCircle className="inline w-3 h-3 ml-0.5 mb-0.5 opacity-70" />
                      </span>
                    )}
                    <span className="font-mono text-sm text-zinc-300 group-hover:text-white transition-colors truncate">
                      {tx.txid}
                    </span>
                  </div>
                  <div className="col-span-2 hidden md:block text-right font-mono text-sm text-zinc-500">
                    {tx.vin?.length || 0}
                  </div>
                  <div className="col-span-2 hidden md:block text-right font-mono text-sm text-zinc-500">
                    {tx.vout?.length || 0}
                  </div>
                  <div
                    className={`col-span-6 md:col-span-3 text-right font-mono text-sm font-medium ${
                      isCoinbaseTx
                        ? "text-zinc-600"
                        : tx.warnings?.some(
                              (w: { code: string }) => w.code === "HIGH_FEE",
                            )
                          ? "text-amber-400"
                          : "text-zinc-300"
                    }`}
                  >
                    {isCoinbaseTx ? "0" : tx.fee_sats?.toLocaleString() || 0}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function CopyableHash({ hash }: { hash: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div
      className="p-5 rounded-2xl border border-surface-border bg-surface-card/50 backdrop-blur-xl cursor-pointer group hover:border-lens-500/30 transition-all"
      onClick={handleCopy}
    >
      <div className="flex items-center gap-2 mb-2 text-zinc-400 text-sm font-medium">
        <div className="text-lens-500">
          <Fingerprint />
        </div>
        <Tooltip
          term="Block Hash"
          definition="The unique digital fingerprint of this entire block of transactions."
          analogy="Like a seal on a tamper-proof shipping container."
        >
          Block Hash
        </Tooltip>
        <div className="ml-auto">
          {copied ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Copy className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
          )}
        </div>
      </div>
      <div className="text-sm font-mono font-semibold text-white truncate">
        {copied ? (
          <span className="text-emerald-400">Copied!</span>
        ) : (
          <span className="group-hover:text-lens-400 transition-colors">
            {hash.slice(0, 20)}...
          </span>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="p-5 rounded-2xl border border-surface-border bg-surface-card/50 backdrop-blur-xl">
      <div className="flex items-center gap-2 mb-2 text-zinc-400 text-sm font-medium">
        <div className="text-lens-500">{icon}</div>
        {title}
      </div>
      <div className="text-2xl font-mono font-semibold text-white truncate">
        {value}
      </div>
    </div>
  );
}
