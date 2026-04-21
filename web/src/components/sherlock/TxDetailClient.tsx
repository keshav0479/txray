"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Link2,
  ArrowLeftRight,
  Users,
  Layers,
  Home,
  Hash,
  Code,
  Repeat,
} from "lucide-react";
import Link from "next/link";
import type {
  BlockFileData,
  Transaction,
  HeuristicResult,
} from "@/lib/sherlockTypes";
import { CLASSIFICATION_CONFIG } from "@/lib/sherlockTypes";
import { TransactionFlowGraph } from "@/components/sherlock/TransactionFlowGraph";
import { useScrollSpy } from "@/hooks/useScrollSpy";

/* ------ Heuristic card content config ------ */
interface CardConfig {
  id: string;
  icon: React.ReactNode;
  title: string;
  getBody: (h: HeuristicResult, tx: Transaction) => React.ReactNode;
}

const HEURISTIC_CARDS: CardConfig[] = [
  {
    id: "cioh",
    icon: <Link2 className="w-5 h-5" />,
    title: "Common Input Ownership",
    getBody: (h, tx) =>
      h.detected ? (
        <p>
          This transaction has{" "}
          <strong className="text-white">
            {tx.inputs?.length || 0} inputs
          </strong>{" "}
          - and since they&apos;re all being spent together in a single
          transaction, they are almost certainly controlled by the{" "}
          <strong className="text-brand-400">same wallet</strong>. Watch the
          inputs on the left - Sherlock groups them together.
        </p>
      ) : (
        <p>
          This is a single-input transaction, so CIOH does not apply.
          There&apos;s only one coin being spent.
        </p>
      ),
  },
  {
    id: "change_detection",
    icon: <ArrowLeftRight className="w-5 h-5" />,
    title: "Change Detection",
    getBody: (h) => {
      if (!h.detected)
        return (
          <p>
            Could not determine which output is change - the outputs may be
            ambiguous.
          </p>
        );
      const idx = h.likely_change_index as number | undefined;
      const method = h.method as string | undefined;
      const conf = h.confidence as string | undefined;
      return (
        <div>
          <p className="mb-3">
            Sherlock identified{" "}
            <strong className="text-brand-400">Output #{idx}</strong> as the
            likely <strong className="text-white">change output</strong> - the
            leftover coins returning to the sender.
          </p>
          {method && (
            <p className="text-sm text-zinc-400 mb-1">
              Detection method:{" "}
              <span className="text-zinc-300 font-mono">{method}</span>
            </p>
          )}
          {conf && (
            <p className="text-sm text-zinc-400">
              Confidence:{" "}
              <span className="text-zinc-300 font-mono">{conf}</span>
            </p>
          )}
          <p className="text-sm text-zinc-500 mt-3">
            Look at the graph - the highlighted output is where the
            sender&apos;s change goes. The other outputs are payments to
            recipients.
          </p>
        </div>
      );
    },
  },
  {
    id: "address_reuse",
    icon: <Repeat className="w-5 h-5" />,
    title: "Address Reuse",
    getBody: (h) =>
      h.detected ? (
        <p>
          An address from the inputs was{" "}
          <strong className="text-red-400">reused in the outputs</strong> - this
          is a significant privacy leak. It links the sender directly to a
          receiving output, making it trivial to trace funds.
        </p>
      ) : (
        <p>
          No address reuse detected - the sender uses fresh addresses, which is
          good for privacy.
        </p>
      ),
  },
  {
    id: "coinjoin",
    icon: <Users className="w-5 h-5" />,
    title: "CoinJoin Detection",
    getBody: (h) =>
      h.detected ? (
        <p>
          This transaction matches the{" "}
          <strong className="text-purple-400">CoinJoin pattern</strong>:
          multiple inputs from different owners, and multiple outputs of{" "}
          <strong className="text-white">equal value</strong>. This is a privacy
          technique that mixes coins together, making tracing very difficult.
          The equal-value outputs are highlighted in the graph.
        </p>
      ) : (
        <p>
          No CoinJoin pattern detected. The output values are not uniform enough
          to suggest coin mixing.
        </p>
      ),
  },
  {
    id: "consolidation",
    icon: <Layers className="w-5 h-5" />,
    title: "Consolidation",
    getBody: (h, tx) =>
      h.detected ? (
        <p>
          This looks like a{" "}
          <strong className="text-blue-400">consolidation transaction</strong>:
          <strong className="text-white"> {tx.inputs?.length} inputs</strong>{" "}
          are being combined into just{" "}
          <strong className="text-white">
            {tx.outputs?.length} output
            {(tx.outputs?.length || 0) > 1 ? "s" : ""}
          </strong>
          . Like exchanging a jar of loose coins for a single clean bill - fewer
          UTXOs to manage.
        </p>
      ) : (
        <p>
          Transaction does not match the consolidation pattern (many inputs {"->"}
          few outputs).
        </p>
      ),
  },
  {
    id: "self_transfer",
    icon: <Home className="w-5 h-5" />,
    title: "Self-Transfer",
    getBody: (h) =>
      h.detected ? (
        <p>
          All outputs match the input script type - this strongly suggests the
          funds are
          <strong className="text-cyan-400">
            {" "}
            moving within the same wallet
          </strong>
          . The sender is simply reorganizing their own coins, not paying anyone
          else.
        </p>
      ) : (
        <p>
          Outputs suggest different recipients - this transaction appears to
          involve external payments.
        </p>
      ),
  },
  {
    id: "round_number_payment",
    icon: <Hash className="w-5 h-5" />,
    title: "Round Number Payment",
    getBody: (h) =>
      h.detected ? (
        <p>
          One or more outputs have{" "}
          <strong className="text-brand-400">round BTC values</strong> (like
          0.1, 0.5, 1.0 BTC). Humans tend to send round amounts when making
          payments. The round-value outputs are highlighted in the graph - these
          are likely the actual payments, and the non-round outputs are likely
          change.
        </p>
      ) : (
        <p>
          No round-number outputs detected - values appear to be algorithmic
          rather than human-chosen.
        </p>
      ),
  },
  {
    id: "op_return",
    icon: <Code className="w-5 h-5" />,
    title: "OP_RETURN Analysis",
    getBody: (h) =>
      h.detected ? (
        <p>
          This transaction includes an{" "}
          <strong className="text-cyan-400">OP_RETURN output</strong> - data
          permanently embedded in the blockchain. This is often used for
          timestamping, anchoring protocols (like Omni Layer), or storing
          arbitrary messages. The data output is highlighted in the graph.
        </p>
      ) : (
        <p>
          No OP_RETURN outputs found - this transaction doesn&apos;t embed any
          external data.
        </p>
      ),
  },
];

export default function TxDetailClient({
  stem,
  txid,
}: {
  stem: string;
  txid: string;
}) {
  const [data, setData] = useState<BlockFileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/results/${stem}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [stem]);

  const tx: Transaction | undefined = data?.blocks?.[0]?.transactions?.find(
    (t) => t.txid === txid,
  );

  // Build card IDs from triggered + clear heuristics
  const cardIds = useMemo(() => {
    if (!tx) return ["overview"];
    const triggered = Object.entries(tx.heuristics)
      .filter(([, v]) => v.detected)
      .map(([k]) => k);
    const clear = Object.entries(tx.heuristics)
      .filter(([, v]) => !v.detected)
      .map(([k]) => k);
    return ["overview", ...triggered, ...clear, "classification"];
  }, [tx]);

  const activeCardId = useScrollSpy(cardIds, "-40% 0px -55% 0px");

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-zinc-500 animate-pulse">Loading transaction...</div>
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center gap-3">
        <div className="text-red-400">Transaction not found</div>
        <Link
          href={`/sherlock/${stem}`}
          className="text-sm text-brand-400 hover:text-brand-300"
        >
          {"->"} Back to block
        </Link>
      </div>
    );
  }

  const cfg =
    CLASSIFICATION_CONFIG[tx.classification] || CLASSIFICATION_CONFIG.unknown;
  const triggeredKeys = Object.entries(tx.heuristics)
    .filter(([, v]) => v.detected)
    .map(([k]) => k);
  const clearKeys = Object.entries(tx.heuristics)
    .filter(([, v]) => !v.detected)
    .map(([k]) => k);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 pt-20 pb-16 z-10 relative">
      {/* Back */}
      <Link
        href={`/sherlock/${stem}`}
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Block
      </Link>

      {/* Tx Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs uppercase tracking-widest text-brand-400 font-medium">
            Investigation
          </span>
          <span
            className={`text-xs px-2.5 py-1 rounded-full border font-medium ${cfg.bg} ${cfg.color}`}
          >
            {cfg.label}
          </span>
        </div>
        <h1 className="text-sm md:text-base font-mono text-zinc-400 break-all leading-relaxed">
          {tx.txid}
        </h1>
        {tx.weight && tx.fee_sats !== undefined && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-xs text-zinc-500">
            <span>
              Weight:{" "}
              <span className="text-zinc-300 font-mono">
                {tx.weight.toLocaleString()} WU
              </span>
            </span>
            <span>
              Fee:{" "}
              <span className="text-zinc-300 font-mono">
                {(tx.fee_sats / 100_000_000).toFixed(8)} BTC
              </span>
            </span>
            <span>
              Rate:{" "}
              <span className="text-zinc-300 font-mono">
                {Math.round(tx.fee_sats / Math.ceil(tx.weight / 4))} sat/vB
              </span>
            </span>
          </div>
        )}
      </motion.div>

      {/* === SCROLLYTELLING LAYOUT === */}
      {tx.inputs && tx.outputs ? (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT: Sticky Graph - fixed viewport height like week 1 */}
          <div className="lg:w-3/5">
            <div className="lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)] flex flex-col gap-2">
              <div className="flex-1 min-h-0 overflow-hidden">
                <TransactionFlowGraph
                  inputs={tx.inputs}
                  outputs={tx.outputs}
                  feeSats={tx.fee_sats || 0}
                  isCoinbase={tx.is_coinbase || false}
                  activeCard={activeCardId}
                  heuristics={tx.heuristics}
                />
              </div>
              {/* Legend */}
              <div className="flex items-center justify-between px-1 text-[10px] text-zinc-600 shrink-0">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{" "}
                  {tx.inputs.length} input{tx.inputs.length !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />{" "}
                  {tx.outputs.length} output{tx.outputs.length !== 1 ? "s" : ""}
                </span>
                {!tx.is_coinbase && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />{" "}
                    {((tx.fee_sats || 0) / 100_000_000).toFixed(8)} fee
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Scrollable Story Cards */}
          <div className="lg:w-2/5 space-y-6">
            {/* Overview card */}
            <div id="overview">
              <StoryCard
                title="Transaction Overview"
                icon={<Layers className="w-5 h-5" />}
                isActive={activeCardId === "overview"}
                accent="brand"
              >
                <p className="mb-3">
                  This transaction takes{" "}
                  <strong className="text-white">
                    {tx.inputs.length} input{tx.inputs.length !== 1 ? "s" : ""}
                  </strong>{" "}
                  and creates{" "}
                  <strong className="text-white">
                    {tx.outputs.length} output
                    {tx.outputs.length !== 1 ? "s" : ""}
                  </strong>
                  . Sherlock ran{" "}
                  <strong className="text-white">8 heuristics</strong> -{" "}
                  {triggeredKeys.length} triggered, {clearKeys.length} clear.
                </p>
                <p className="text-sm text-zinc-500">
                  Scroll down to see what each heuristic found. The graph on the
                  left will highlight the relevant parts as you read.
                </p>
              </StoryCard>
            </div>

            {/* Triggered heuristic cards */}
            {triggeredKeys.length > 0 && (
              <div className="text-[10px] uppercase tracking-widest text-brand-400 font-bold px-1">
                Warning: Triggered Heuristics
              </div>
            )}
            {triggeredKeys.map((key) => {
              const card = HEURISTIC_CARDS.find((c) => c.id === key);
              if (!card) return null;
              const h = tx.heuristics[key];
              return (
                <div key={key} id={key}>
                  <StoryCard
                    title={card.title}
                    icon={card.icon}
                    isActive={activeCardId === key}
                    accent="amber"
                  >
                    {card.getBody(h, tx)}
                  </StoryCard>
                </div>
              );
            })}

            {/* Clear heuristic cards */}
            {clearKeys.length > 0 && (
              <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold px-1">
                OK Clear Heuristics
              </div>
            )}
            {clearKeys.map((key) => {
              const card = HEURISTIC_CARDS.find((c) => c.id === key);
              if (!card) return null;
              const h = tx.heuristics[key];
              return (
                <div key={key} id={key}>
                  <StoryCard
                    title={card.title}
                    icon={card.icon}
                    isActive={activeCardId === key}
                    accent="dim"
                  >
                    {card.getBody(h, tx)}
                  </StoryCard>
                </div>
              );
            })}

            {/* Classification card */}
            <div id="classification">
              <StoryCard
                title="Final Classification"
                icon={<span className="text-lg">Class</span>}
                isActive={activeCardId === "classification"}
                accent="brand"
              >
                <p className="mb-3">
                  After running all 8 heuristics, Sherlock classifies this
                  transaction as:
                </p>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm px-4 py-2 rounded-full border font-bold ${cfg.bg} ${cfg.color}`}
                  >
                    {cfg.label}
                  </span>
                </div>
                <p className="text-sm text-zinc-500 mt-3">
                  TXID:{" "}
                  <span className="font-mono text-zinc-400">
                    {tx.txid.slice(0, 24)}...
                  </span>
                </p>
              </StoryCard>
            </div>

            {/* Bottom spacer - large enough for last card to reach viewport center */}
            <div className="h-[50vh]" />
          </div>
        </div>
      ) : (
        /* Fallback if no input/output data */
        <div className="text-zinc-500 text-sm">
          No input/output data available for this transaction.
        </div>
      )}
    </div>
  );
}

/* ------ Story Card Component ------ */
function StoryCard({
  title,
  icon,
  isActive,
  accent,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  isActive: boolean;
  accent: "brand" | "amber" | "dim";
  children: React.ReactNode;
}) {
  const borderColor = {
    brand: isActive ? "border-brand-500/40" : "border-white/5",
    amber: isActive ? "border-amber-500/40" : "border-white/5",
    dim: isActive ? "border-zinc-600/40" : "border-white/5",
  }[accent];

  const iconColor = {
    brand: "text-brand-400",
    amber: "text-amber-400",
    dim: "text-zinc-500",
  }[accent];

  return (
    <motion.div
      animate={{ opacity: isActive ? 1 : 0.4, scale: isActive ? 1 : 0.98 }}
      transition={{ duration: 0.3 }}
      className={`rounded-xl border ${borderColor} bg-surface-card p-5 transition-colors duration-300`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={iconColor}>{icon}</span>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="text-sm text-zinc-400 leading-relaxed">{children}</div>
    </motion.div>
  );
}
