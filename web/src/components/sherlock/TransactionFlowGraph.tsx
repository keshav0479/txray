"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { TxInput, TxOutput, HeuristicResult } from "@/lib/sherlockTypes";

/**
 * activeCard values:
 *   "overview"          → full graph, all particles
 *   "cioh"              → highlight all inputs (same owner bracket)
 *   "change_detection"  → highlight likely change output, dim others
 *   "address_reuse"     → highlight matching address nodes
 *   "coinjoin"          → highlight equal-value outputs
 *   "consolidation"     → highlight many inputs, few outputs
 *   "self_transfer"     → highlight all nodes with matching script type
 *   "round_number_payment" → highlight round-number output
 *   "op_return"         → highlight OP_RETURN output
 *   "classification"    → pulse central engine with classification color
 */

interface Props {
  inputs: TxInput[];
  outputs: TxOutput[];
  feeSats: number;
  isCoinbase: boolean;
  activeCard: string;
  heuristics?: Record<string, HeuristicResult>;
}

export function TransactionFlowGraph({
  inputs,
  outputs,
  feeSats,
  isCoinbase,
  activeCard,
  heuristics,
}: Props) {
  const MAX_VISIBLE = 5;
  const visibleInputs = inputs.slice(0, MAX_VISIBLE);
  const visibleOutputs = outputs.slice(0, MAX_VISIBLE);

  const showInputMore = inputs.length > MAX_VISIBLE;
  const showOutputMore = outputs.length > MAX_VISIBLE;

  const nodeW = 195;
  const nodeH = 56;
  const gap = 18;

  const visInCount = (showInputMore ? MAX_VISIBLE + 1 : inputs.length) || 1;
  const visOutCount =
    (showOutputMore ? MAX_VISIBLE + 1 : outputs.length) +
      (isCoinbase ? 0 : 1) || 1;
  const maxNodes = Math.max(visInCount, visOutCount, 2);

  const svgH = maxNodes * (nodeH + gap) + gap * 2;
  const svgW = 800;
  const leftX = 16;
  const rightX = svgW - nodeW - 16;
  const cx = svgW / 2;
  const cy = svgH / 2;
  const coreR = 38;

  const leftH = visInCount * (nodeH + gap) - gap;
  const leftY0 = (svgH - leftH) / 2;
  const rightH = visOutCount * (nodeH + gap) - gap;
  const rightY0 = (svgH - rightH) / 2;

  const drawPath = (x1: number, y1: number, x2: number, y2: number) => {
    const cp = 55;
    return `M ${x1},${y1} C ${x1 + cp},${y1} ${x2 - cp},${y2} ${x2},${y2}`;
  };

  const fmt = (sats: number) => {
    if (sats >= 100_000_000) return (sats / 100_000_000).toFixed(4);
    if (sats >= 1_000_000) return (sats / 100_000_000).toFixed(6);
    return (sats / 100_000_000).toFixed(8);
  };

  const trunc = (addr: string | null) => {
    if (!addr) return "Unknown";
    return addr.length <= 14 ? addr : addr.slice(0, 8) + "…" + addr.slice(-5);
  };

  // Heuristic-specific data
  const changeIdx = useMemo(() => {
    const cd = heuristics?.change_detection;
    if (cd?.detected && cd.likely_change_index !== undefined)
      return cd.likely_change_index as number;
    return -1;
  }, [heuristics]);

  const roundOutputIdxs = useMemo(() => {
    return outputs
      .map((o, i) => ({
        i,
        round: o.value_sats % 100_000 === 0 && o.value_sats > 0,
      }))
      .filter((x) => x.round)
      .map((x) => x.i);
  }, [outputs]);

  const opReturnIdxs = useMemo(() => {
    return outputs
      .map((o, i) => ({ i, isOp: o.script_type === "op_return" }))
      .filter((x) => x.isOp)
      .map((x) => x.i);
  }, [outputs]);

  // Reused address detection (input addr appears in outputs)
  const reusedAddresses = useMemo(() => {
    const inputAddrs = new Set(
      inputs.filter((i) => i.address).map((i) => i.address!),
    );
    return outputs
      .map((o, i) => ({ i, reused: !!o.address && inputAddrs.has(o.address) }))
      .filter((x) => x.reused)
      .map((x) => x.i);
  }, [inputs, outputs]);

  // Equal value outputs (for coinjoin)
  const equalValueIdxs = useMemo(() => {
    const valCounts: Record<number, number[]> = {};
    outputs.forEach((o, i) => {
      if (o.value_sats > 0) {
        (valCounts[o.value_sats] ||= []).push(i);
      }
    });
    const eqs = Object.values(valCounts)
      .filter((arr) => arr.length >= 2)
      .flat();
    return eqs;
  }, [outputs]);

  // --- Highlight logic per card ---
  const getInputOpacity = (idx: number) => {
    if (activeCard === "overview" || activeCard === "classification") return 1;
    if (activeCard === "cioh") return 1; // all inputs highlighted
    if (activeCard === "consolidation") return 1;
    if (activeCard === "self_transfer") return 1;
    if (activeCard === "address_reuse") return 1;
    // dim inputs for output-focused cards
    if (
      [
        "change_detection",
        "round_number_payment",
        "op_return",
        "coinjoin",
      ].includes(activeCard)
    )
      return 0.25;
    return idx < 0 ? 0 : 1; // fallback
  };

  const getOutputOpacity = (idx: number) => {
    if (activeCard === "overview" || activeCard === "classification") return 1;
    if (activeCard === "change_detection") return idx === changeIdx ? 1 : 0.2;
    if (activeCard === "round_number_payment")
      return roundOutputIdxs.includes(idx) ? 1 : 0.25;
    if (activeCard === "op_return")
      return opReturnIdxs.includes(idx) ? 1 : 0.25;
    if (activeCard === "address_reuse")
      return reusedAddresses.includes(idx) ? 1 : 0.25;
    if (activeCard === "coinjoin")
      return equalValueIdxs.includes(idx) ? 1 : 0.25;
    if (activeCard === "consolidation") return 1;
    if (activeCard === "self_transfer") return 1;
    if (activeCard === "cioh") return 0.25;
    return 1;
  };

  const getInputStroke = (idx: number) => {
    if (activeCard === "cioh") return "#d4a546"; // amber for same-owner
    if (activeCard === "consolidation") return "#3b82f6";
    if (activeCard === "address_reuse") {
      const addr = inputs[idx]?.address;
      if (addr && outputs.some((o) => o.address === addr)) return "#ef4444";
    }
    return "rgba(16,185,129,0.3)";
  };

  const getOutputStroke = (idx: number) => {
    if (activeCard === "change_detection" && idx === changeIdx)
      return "#d4a546";
    if (activeCard === "round_number_payment" && roundOutputIdxs.includes(idx))
      return "#d4a546";
    if (activeCard === "op_return" && opReturnIdxs.includes(idx))
      return "#06b6d4";
    if (activeCard === "address_reuse" && reusedAddresses.includes(idx))
      return "#ef4444";
    if (activeCard === "coinjoin" && equalValueIdxs.includes(idx))
      return "#a855f7";
    return "rgba(139,92,246,0.3)";
  };

  // Central engine color
  const coreColor = useMemo(() => {
    if (activeCard === "cioh") return "#d4a546";
    if (activeCard === "change_detection") return "#d4a546";
    if (activeCard === "coinjoin") return "#a855f7";
    if (activeCard === "consolidation") return "#3b82f6";
    if (activeCard === "address_reuse") return "#ef4444";
    if (activeCard === "classification") return "#10b981";
    return "#d4a546";
  }, [activeCard]);

  return (
    <div className="w-full h-full rounded-2xl border border-white/5 bg-black overflow-hidden relative flex flex-col">
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)",
          backgroundSize: "20px 20px",
        }}
      />

      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full flex-1 min-h-0"
        preserveAspectRatio="xMidYMid meet"
      >
        <style>{`
          @keyframes dot-flow {
            0% { offset-distance: 0%; opacity: 0; transform: scale(0.5); }
            15% { opacity: 1; transform: scale(1); }
            85% { opacity: 1; transform: scale(1); }
            100% { offset-distance: 100%; opacity: 0; transform: scale(0.5); }
          }
        `}</style>
        <defs>
          <linearGradient id="glassN" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.01)" />
          </linearGradient>
        </defs>

        {/* === INPUT PATHS === */}
        {Array.from({ length: visInCount }).map((_, i) => {
          const y = leftY0 + i * (nodeH + gap) + nodeH / 2;
          const pathD = drawPath(leftX + nodeW, y, cx - coreR, cy);
          const op = getInputOpacity(i);
          return (
            <g
              key={`pi-${i}`}
              className="transition-opacity duration-500"
              style={{ opacity: op }}
            >
              <path
                d={pathD}
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1.5"
              />
              <circle
                r="2.5"
                fill="#10b981"
                style={{
                  filter: "drop-shadow(0 0 6px #10b981)",
                  offsetPath: `path('${pathD}')`,
                  animation: `dot-flow ${2.5 + i * 0.15}s linear infinite`,
                  animationDelay: `${-(i * 0.5)}s`,
                }}
              />
            </g>
          );
        })}

        {/* === OUTPUT PATHS === */}
        {Array.from({ length: visOutCount }).map((_, i) => {
          const y = rightY0 + i * (nodeH + gap) + nodeH / 2;
          const pathD = drawPath(cx + coreR, cy, rightX, y);
          const isFee = !isCoinbase && i === visOutCount - 1;
          const col = isFee ? "#ef4444" : "#8b5cf6";
          const op = isFee
            ? activeCard === "overview" || activeCard === "classification"
              ? 1
              : 0.3
            : getOutputOpacity(i);
          return (
            <g
              key={`po-${i}`}
              className="transition-opacity duration-500"
              style={{ opacity: op }}
            >
              <path
                d={pathD}
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1.5"
              />
              <circle
                r="2.5"
                fill={col}
                style={{
                  filter: `drop-shadow(0 0 6px ${col})`,
                  offsetPath: `path('${pathD}')`,
                  animation: `dot-flow ${2.5 + i * 0.12}s linear infinite`,
                  animationDelay: `${-(i * 0.4)}s`,
                }}
              />
            </g>
          );
        })}

        {/* === CENTRAL ENGINE === */}
        <motion.g
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <circle
            cx={cx}
            cy={cy}
            r={coreR + 10}
            fill={coreColor}
            opacity="0.04"
            className="transition-colors duration-500"
          />
          <circle
            cx={cx}
            cy={cy}
            r={coreR}
            fill="rgba(3,4,6,0.95)"
            stroke={coreColor}
            strokeWidth="1.5"
            className="transition-colors duration-500"
            style={{ filter: `drop-shadow(0 0 8px ${coreColor}40)` }}
          />
          <circle
            cx={cx}
            cy={cy}
            r={coreR - 7}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
          {/* Magnifying glass */}
          <circle
            cx={cx - 3}
            cy={cy - 3}
            r="9"
            fill="none"
            stroke={coreColor}
            strokeWidth="2"
            opacity="0.6"
            className="transition-colors duration-500"
          />
          <line
            x1={cx + 3}
            y1={cy + 3}
            x2={cx + 11}
            y2={cy + 11}
            stroke={coreColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.6"
            className="transition-colors duration-500"
          />
        </motion.g>

        {/* Annotations now rendered as inline badges on nodes — see input/output node sections */}

        {/* === INPUT NODES === */}
        {visibleInputs.map((inp, i) => {
          const y = leftY0 + i * (nodeH + gap);
          const op = getInputOpacity(i);
          const stroke = getInputStroke(i);
          return (
            <motion.g
              key={`in-${i}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: op, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="transition-all duration-500"
            >
              <rect
                x={leftX}
                y={y}
                width={nodeW}
                height={nodeH}
                rx="5"
                fill="url(#glassN)"
                stroke={stroke}
                strokeWidth={stroke !== "rgba(16,185,129,0.3)" ? "2" : "1"}
                className="transition-colors duration-500"
              />
              <rect
                x={leftX}
                y={y}
                width="3"
                height={nodeH}
                fill="#10b981"
                rx="1.5"
              />
              <text
                x={leftX + 12}
                y={y + 20}
                fill="#fff"
                fontSize="11"
                fontFamily="sans-serif"
                fontWeight="bold"
              >
                {fmt(inp.value_sats)}{" "}
                <tspan fill="#94a3b8" fontSize="9" fontWeight="normal">
                  BTC
                </tspan>
              </text>
              <text
                x={leftX + 12}
                y={y + 34}
                fill="#64748b"
                fontSize="8"
                fontFamily="monospace"
              >
                {trunc(inp.address)}
              </text>
              <text
                x={leftX + 12}
                y={y + 46}
                fill="#4b5563"
                fontSize="7"
                fontFamily="sans-serif"
                className="uppercase"
              >
                {inp.script_type}
              </text>
              {/* ── Inline heuristic badge ── */}
              {activeCard === "cioh" && (
                <>
                  <rect
                    x={leftX + nodeW - 76}
                    y={y + 8}
                    width={70}
                    height={14}
                    rx="3"
                    fill="rgba(212,165,70,0.15)"
                    stroke="rgba(212,165,70,0.5)"
                    strokeWidth="0.75"
                  />
                  <text
                    x={leftX + nodeW - 41}
                    y={y + 17.5}
                    fill="#d4a546"
                    fontSize="6.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    SAME OWNER
                  </text>
                </>
              )}
              {activeCard === "address_reuse" &&
                inputs[i]?.address &&
                outputs.some((o) => o.address === inputs[i].address) && (
                  <>
                    <rect
                      x={leftX + nodeW - 52}
                      y={y + 8}
                      width={46}
                      height={14}
                      rx="3"
                      fill="rgba(239,68,68,0.15)"
                      stroke="rgba(239,68,68,0.5)"
                      strokeWidth="0.75"
                    />
                    <text
                      x={leftX + nodeW - 29}
                      y={y + 17.5}
                      fill="#ef4444"
                      fontSize="6.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      REUSED
                    </text>
                  </>
                )}
            </motion.g>
          );
        })}

        {showInputMore &&
          (() => {
            const y = leftY0 + MAX_VISIBLE * (nodeH + gap);
            return (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 0.5 }}>
                <rect
                  x={leftX}
                  y={y}
                  width={nodeW}
                  height={nodeH}
                  rx="5"
                  fill="#18181b"
                  stroke="#3f3f46"
                  strokeWidth="1"
                />
                <text
                  x={leftX + nodeW / 2}
                  y={y + 26}
                  fill="#a1a1aa"
                  fontSize="11"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  +{inputs.length - MAX_VISIBLE} more
                </text>
                <text
                  x={leftX + nodeW / 2}
                  y={y + 42}
                  fill="#71717a"
                  fontSize="8"
                  textAnchor="middle"
                >
                  Total: {inputs.length} inputs
                </text>
              </motion.g>
            );
          })()}

        {/* === OUTPUT NODES === */}
        {visibleOutputs.map((out, i) => {
          const y = rightY0 + i * (nodeH + gap);
          const op = getOutputOpacity(i);
          const stroke = getOutputStroke(i);
          return (
            <motion.g
              key={`out-${i}`}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: op, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="transition-all duration-500"
            >
              <rect
                x={rightX}
                y={y}
                width={nodeW}
                height={nodeH}
                rx="5"
                fill="url(#glassN)"
                stroke={stroke}
                strokeWidth={stroke !== "rgba(139,92,246,0.3)" ? "2" : "1"}
                className="transition-colors duration-500"
              />
              <rect
                x={rightX + nodeW - 3}
                y={y}
                width="3"
                height={nodeH}
                fill="#8b5cf6"
                rx="1.5"
              />
              <text
                x={rightX + 12}
                y={y + 20}
                fill="#fff"
                fontSize="11"
                fontFamily="sans-serif"
                fontWeight="bold"
              >
                {fmt(out.value_sats)}{" "}
                <tspan fill="#94a3b8" fontSize="9" fontWeight="normal">
                  BTC
                </tspan>
              </text>
              <text
                x={rightX + 12}
                y={y + 34}
                fill="#64748b"
                fontSize="8"
                fontFamily="monospace"
              >
                {trunc(out.address)}
              </text>
              <text
                x={rightX + 12}
                y={y + 46}
                fill="#4b5563"
                fontSize="7"
                fontFamily="sans-serif"
                className="uppercase"
              >
                {out.script_type}
              </text>
              {/* ── Inline heuristic badge ── */}
              {activeCard === "change_detection" && i === changeIdx && (
                <>
                  <rect
                    x={rightX + nodeW - 48}
                    y={y + 8}
                    width={42}
                    height={14}
                    rx="3"
                    fill="rgba(212,165,70,0.15)"
                    stroke="rgba(212,165,70,0.5)"
                    strokeWidth="0.75"
                  />
                  <text
                    x={rightX + nodeW - 27}
                    y={y + 17.5}
                    fill="#d4a546"
                    fontSize="6.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    CHANGE
                  </text>
                </>
              )}
              {activeCard === "round_number_payment" &&
                roundOutputIdxs.includes(i) && (
                  <>
                    <rect
                      x={rightX + nodeW - 38}
                      y={y + 8}
                      width={32}
                      height={14}
                      rx="3"
                      fill="rgba(212,165,70,0.15)"
                      stroke="rgba(212,165,70,0.5)"
                      strokeWidth="0.75"
                    />
                    <text
                      x={rightX + nodeW - 22}
                      y={y + 17.5}
                      fill="#d4a546"
                      fontSize="6.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      ROUND
                    </text>
                  </>
                )}
              {activeCard === "op_return" && opReturnIdxs.includes(i) && (
                <>
                  <rect
                    x={rightX + nodeW - 56}
                    y={y + 8}
                    width={50}
                    height={14}
                    rx="3"
                    fill="rgba(6,182,212,0.15)"
                    stroke="rgba(6,182,212,0.5)"
                    strokeWidth="0.75"
                  />
                  <text
                    x={rightX + nodeW - 31}
                    y={y + 17.5}
                    fill="#06b6d4"
                    fontSize="6.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    OP_RETURN
                  </text>
                </>
              )}
              {activeCard === "address_reuse" &&
                reusedAddresses.includes(i) && (
                  <>
                    <rect
                      x={rightX + nodeW - 44}
                      y={y + 8}
                      width={38}
                      height={14}
                      rx="3"
                      fill="rgba(239,68,68,0.15)"
                      stroke="rgba(239,68,68,0.5)"
                      strokeWidth="0.75"
                    />
                    <text
                      x={rightX + nodeW - 25}
                      y={y + 17.5}
                      fill="#ef4444"
                      fontSize="6.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      REUSED
                    </text>
                  </>
                )}
              {activeCard === "coinjoin" && equalValueIdxs.includes(i) && (
                <>
                  <rect
                    x={rightX + nodeW - 64}
                    y={y + 8}
                    width={58}
                    height={14}
                    rx="3"
                    fill="rgba(168,85,247,0.15)"
                    stroke="rgba(168,85,247,0.5)"
                    strokeWidth="0.75"
                  />
                  <text
                    x={rightX + nodeW - 35}
                    y={y + 17.5}
                    fill="#a855f7"
                    fontSize="6.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    EQUAL VALUE
                  </text>
                </>
              )}
            </motion.g>
          );
        })}

        {showOutputMore &&
          (() => {
            const baseIdx = MAX_VISIBLE;
            const y = rightY0 + baseIdx * (nodeH + gap);
            return (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 0.5 }}>
                <rect
                  x={rightX}
                  y={y}
                  width={nodeW}
                  height={nodeH}
                  rx="5"
                  fill="#18181b"
                  stroke="#3f3f46"
                  strokeWidth="1"
                />
                <text
                  x={rightX + nodeW / 2}
                  y={y + 26}
                  fill="#a1a1aa"
                  fontSize="11"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  +{outputs.length - MAX_VISIBLE} more
                </text>
                <text
                  x={rightX + nodeW / 2}
                  y={y + 42}
                  fill="#71717a"
                  fontSize="8"
                  textAnchor="middle"
                >
                  Total: {outputs.length} outputs
                </text>
              </motion.g>
            );
          })()}

        {/* === FEE NODE === */}
        {!isCoinbase &&
          (() => {
            const feeIdx = visOutCount - 1;
            const y = rightY0 + feeIdx * (nodeH + gap);
            const op =
              activeCard === "overview" || activeCard === "classification"
                ? 1
                : 0.3;
            return (
              <motion.g
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: op, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="transition-opacity duration-500"
              >
                <rect
                  x={rightX}
                  y={y}
                  width={nodeW}
                  height={nodeH}
                  rx="5"
                  fill="rgba(239,68,68,0.04)"
                  stroke="rgba(239,68,68,0.25)"
                  strokeWidth="1"
                />
                <rect
                  x={rightX + nodeW - 3}
                  y={y}
                  width="3"
                  height={nodeH}
                  fill="#ef4444"
                  rx="1.5"
                />
                <text
                  x={rightX + 12}
                  y={y + 20}
                  fill="#fca5a5"
                  fontSize="11"
                  fontWeight="bold"
                >
                  {fmt(feeSats)}{" "}
                  <tspan fill="#ef4444" fontSize="9" fontWeight="normal">
                    BTC
                  </tspan>
                </text>
                <text
                  x={rightX + 12}
                  y={y + 34}
                  fill="#ef4444"
                  fontSize="9"
                  fontWeight="bold"
                >
                  Miner Fee
                </text>
                <text x={rightX + 12} y={y + 46} fill="#4b5563" fontSize="7">
                  Paid to block miner
                </text>
              </motion.g>
            );
          })()}
      </svg>
    </div>
  );
}
