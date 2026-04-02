"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type AnalyzedTx } from "@/lib/layout";
import { translateScript, getScriptDefinition } from "@/lib/scriptData";
import { X } from "lucide-react";

interface Props {
  activeCardId: string;
  txData: AnalyzedTx;
}

export function AnimatedTransactionFlow({ activeCardId, txData }: Props) {
  const [expandedList, setExpandedList] = useState<"inputs" | "outputs" | null>(
    null,
  );

  // --- Dimensions & Layout ---
  const nodeW = 200; // Slightly narrower nodes
  const nodeH = 64;
  const gap = 24;
  const MAX_VISIBLE_NODES = 5;

  const totalInputs = txData.vin.length;
  const totalOutputs = txData.vout.length;

  const showInputSummary = totalInputs > MAX_VISIBLE_NODES;
  const showOutputSummary = totalOutputs > MAX_VISIBLE_NODES;

  const visibleInputsCount = showInputSummary
    ? MAX_VISIBLE_NODES + 1
    : totalInputs;
  const visibleOutputsCount = showOutputSummary
    ? MAX_VISIBLE_NODES + 1
    : totalOutputs;

  const rightNodeCount = visibleOutputsCount + 1; // +1 for the fee node
  const maxNodes = Math.max(visibleInputsCount, rightNodeCount);

  // Dynamic sizing based on content
  const minHeight = 400;
  const svgH = Math.max(minHeight, maxNodes * (nodeH + gap) + gap * 2);
  const svgW = 800;

  const leftX = 24; // Pushed closer to edges to expand the center bezier curves
  const rightX = svgW - nodeW - 24;
  const centerX = svgW / 2;
  const centerY = svgH / 2;
  const coreRadius = 48;

  const leftTotalH = visibleInputsCount * (nodeH + gap) - gap;
  const leftStartY = (svgH - leftTotalH) / 2;

  const rightTotalH = rightNodeCount * (nodeH + gap) - gap;
  const rightStartY = (svgH - rightTotalH) / 2;

  // --- Story State Management ---
  // card-0: General flow
  // card-1: Inputs & Outputs (fee is dimmed)
  // card-2: The Cost (fee highlighted, outputs dimmed)
  // card-3: Risks & Warnings (pulse red/green)

  const isFeeDimmed = activeCardId === "card-1";
  const isOutputDimmed = activeCardId === "card-2";
  const isFeeHighlighted = activeCardId === "card-2";
  const isWarningCard = activeCardId === "card-3";
  const hasWarnings = txData.warnings && txData.warnings.length > 0;

  // Core Theme Color
  const coreColor = useMemo(() => {
    if (isWarningCard) {
      return hasWarnings ? "#fbbf24" : "#10b981"; // Amber or Emerald
    }
    return "#3b82f6"; // Lens Blue
  }, [isWarningCard, hasWarnings]);

  const coreOpacity = isWarningCard ? 1 : 0.8;

  // Jargon Translator for SVG Nodes
  const translateScriptRuleset = translateScript;

  // Bezier curve helper
  const drawPath = (x1: number, y1: number, x2: number, y2: number) => {
    const cpOffset = 60;
    return `M ${x1},${y1} C ${x1 + cpOffset},${y1} ${x2 - cpOffset},${y2} ${x2},${y2}`;
  };

  return (
    <div className="w-full h-full min-h-125 flex items-center justify-center bg-black rounded-2xl border border-surface-border overflow-hidden relative">
      {/* Background Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: `24px 24px`,
        }}
      />

      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full h-full drop-shadow-2xl"
        style={{ filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.5))" }}
      >
        <defs>
          <filter id="glow-blue" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          {/* Subtle node glass glow */}
          <linearGradient id="glassNode" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.05)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.01)" />
          </linearGradient>
        </defs>

        {/* --- PATHS --- */}
        {Array.from({ length: visibleInputsCount }).map((_, i) => {
          const y = leftStartY + i * (nodeH + gap) + nodeH / 2;
          const pathD = drawPath(
            leftX + nodeW,
            y,
            centerX - coreRadius,
            centerY,
          );
          const activePath = !isWarningCard;

          return (
            <g key={`path-in-${i}`}>
              <path
                d={pathD}
                fill="none"
                stroke="var(--color-surface-border)"
                strokeWidth="2"
              />
              {activePath && (
                <circle
                  r="3"
                  fill={coreColor}
                  style={{ filter: `drop-shadow(0 0 4px ${coreColor})` }}
                >
                  <animateMotion
                    dur={`${2 + i * 0.2}s`}
                    repeatCount="indefinite"
                    path={pathD}
                  />
                </circle>
              )}
            </g>
          );
        })}

        {Array.from({ length: visibleOutputsCount }).map((_, i) => {
          const y = rightStartY + i * (nodeH + gap) + nodeH / 2;
          const pathD = drawPath(centerX + coreRadius, centerY, rightX, y);
          const activePath = !isOutputDimmed && !isWarningCard;

          return (
            <g key={`path-out-${i}`}>
              <path
                d={pathD}
                fill="none"
                stroke="var(--color-surface-border)"
                strokeWidth="2"
                opacity={isOutputDimmed ? 0.2 : 1}
                className="transition-opacity duration-500"
              />
              {activePath && (
                <circle
                  r="3"
                  fill={coreColor}
                  style={{ filter: `drop-shadow(0 0 4px ${coreColor})` }}
                >
                  <animateMotion
                    dur={`${2 + i * 0.1}s`}
                    repeatCount="indefinite"
                    path={pathD}
                  />
                </circle>
              )}
            </g>
          );
        })}

        {/* Fee Path */}
        {(() => {
          const feeIdx = visibleOutputsCount;
          const y = rightStartY + feeIdx * (nodeH + gap) + nodeH / 2;
          const pathD = drawPath(centerX + coreRadius, centerY, rightX, y);
          const activePath = !isFeeDimmed && !isWarningCard;
          const strokeCol = isFeeHighlighted
            ? "#ef4444"
            : "var(--color-surface-border)"; // red-500 or border

          return (
            <g key={`path-fee`}>
              <path
                d={pathD}
                fill="none"
                stroke={strokeCol}
                strokeWidth={isFeeHighlighted ? "3" : "2"}
                opacity={isFeeDimmed ? 0.2 : 1}
                className="transition-all duration-500"
                style={
                  isFeeHighlighted
                    ? { filter: "drop-shadow(0 0 6px #ef4444)" }
                    : undefined
                }
              />
              {activePath && (
                <circle
                  r="3"
                  fill="#ef4444"
                  style={{ filter: `drop-shadow(0 0 4px #ef4444)` }}
                >
                  <animateMotion
                    dur="2.5s"
                    repeatCount="indefinite"
                    path={pathD}
                  />
                </circle>
              )}
            </g>
          );
        })()}

        {/* --- CENTRAL ENGINE (txray lens target) --- */}
        <motion.g
          animate={{ scale: isWarningCard ? [1, 1.02, 1] : 1 }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Outer diffuse glow */}
          <circle
            cx={centerX}
            cy={centerY}
            r={coreRadius + 16}
            fill={coreColor}
            opacity="0.05"
            className="transition-colors duration-500"
            style={{ filter: "url(#glow-blue)" }}
          />
          {/* Main frame */}
          <circle
            cx={centerX}
            cy={centerY}
            r={coreRadius}
            fill="rgba(6,6,16,0.9)"
            stroke={coreColor}
            strokeWidth="1.5"
            opacity={coreOpacity}
            className="transition-colors duration-500"
            style={{ filter: "drop-shadow(0 0 10px rgba(59,130,246,0.4))" }}
          />

          {/* Inner targeting ring */}
          <circle
            cx={centerX}
            cy={centerY}
            r={coreRadius - 8}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />

          {/* Crosshairs */}
          <line
            x1={centerX - coreRadius - 4}
            y1={centerY}
            x2={centerX - coreRadius + 4}
            y2={centerY}
            stroke={coreColor}
            strokeWidth="2"
            opacity="0.6"
          />
          <line
            x1={centerX + coreRadius - 4}
            y1={centerY}
            x2={centerX + coreRadius + 4}
            y2={centerY}
            stroke={coreColor}
            strokeWidth="2"
            opacity="0.6"
          />
          <line
            x1={centerX}
            y1={centerY - coreRadius - 4}
            x2={centerX}
            y2={centerY - coreRadius + 4}
            fill="none"
            stroke={coreColor}
            strokeWidth="2"
            opacity="0.6"
          />
          <line
            x1={centerX}
            y1={centerY + coreRadius - 4}
            x2={centerX}
            y2={centerY + coreRadius + 4}
            fill="none"
            stroke={coreColor}
            strokeWidth="2"
            opacity="0.6"
          />

          {/* Animated Spinner Ring */}
          <motion.circle
            cx={centerX}
            cy={centerY}
            r={coreRadius - 16}
            fill="transparent"
            stroke={coreColor}
            strokeWidth="2"
            strokeDasharray="30 15 10 15"
            animate={{ rotate: 360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: `${centerX}px ${centerY}px` }}
            className="transition-colors duration-500"
            opacity="0.8"
          />
          {isWarningCard && hasWarnings && (
            <g
              transform={`translate(${centerX - 16}, ${centerY - 16})`}
              className="text-amber-500"
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
            </g>
          )}
          {isWarningCard && !hasWarnings && (
            <g
              transform={`translate(${centerX - 16}, ${centerY - 16})`}
              className="text-emerald-500"
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </g>
          )}
          {!isWarningCard && (
            <g
              transform={`translate(${centerX - 12}, ${centerY - 12})`}
              className="text-lens-400"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </g>
          )}
        </motion.g>

        {/* --- INPUT NODES (capped) --- */}
        {txData.vin.slice(0, MAX_VISIBLE_NODES).map((vin, i) => {
          const y = leftStartY + i * (nodeH + gap);
          const opacity = isWarningCard ? 0.3 : 1;
          const displayAmount =
            vin.prevout?.value_sats !== undefined
              ? (vin.prevout.value_sats / 100_000_000).toFixed(4)
              : "Unknown";

          return (
            <motion.g
              key={`in-${i}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity, x: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="transition-opacity duration-500"
            >
              <rect
                x={leftX}
                y={y}
                width={nodeW}
                height={nodeH}
                rx="6"
                fill="url(#glassNode)"
                stroke="rgba(16, 185, 129, 0.4)"
                strokeWidth="1"
                style={{
                  backdropFilter: "blur(4px)",
                  filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.5))",
                }}
              />
              <rect
                x={leftX}
                y={y}
                width="3"
                height={nodeH}
                fill="#10b981"
                rx="1.5"
                style={{ filter: "drop-shadow(0 0 6px #10b981)" }}
              />

              <text
                x={leftX + 16}
                y={y + 24}
                fill="#ffffff"
                fontSize="13"
                fontFamily="sans-serif"
                fontWeight="bold"
                style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))" }}
              >
                {displayAmount}{" "}
                <tspan fill="#94a3b8" fontSize="11" fontWeight="normal">
                  BTC
                </tspan>
              </text>
              <text
                x={leftX + 16}
                y={y + 44}
                fill="#64748b"
                fontSize="10"
                fontFamily="monospace"
              >
                {vin.txid.slice(0, 16)}...
              </text>
              <text
                x={leftX + 16}
                y={y + 56}
                fill="#4b5563"
                fontSize="9"
                fontFamily="sans-serif"
                className="uppercase tracking-wider hover:fill-lens-400 hover:cursor-help transition-colors"
              >
                <title>{getScriptDefinition(vin.script_type)}</title>
                {translateScriptRuleset(vin.script_type)}
              </text>
            </motion.g>
          );
        })}

        {/* +N More Inputs Summary Node */}
        {showInputSummary &&
          (() => {
            const y = leftStartY + MAX_VISIBLE_NODES * (nodeH + gap);
            return (
              <motion.g
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: isWarningCard ? 0.3 : 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="cursor-pointer transition-opacity duration-500"
                onClick={() => setExpandedList("inputs")}
              >
                <rect
                  x={leftX}
                  y={y}
                  width={nodeW}
                  height={nodeH}
                  rx="8"
                  fill="#18181b"
                  stroke="#3f3f46"
                  strokeWidth="1"
                  className="hover:stroke-lens-500 transition-colors duration-300"
                />
                <rect
                  x={leftX}
                  y={y}
                  width="3"
                  height={nodeH}
                  fill="#10b981"
                  rx="1.5"
                  opacity="0.5"
                />
                <text
                  x={leftX + nodeW / 2}
                  y={y + 28}
                  fill="#a1a1aa"
                  fontSize="13"
                  fontFamily="sans-serif"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  +{totalInputs - MAX_VISIBLE_NODES} more inputs
                </text>
                <text
                  x={leftX + nodeW / 2}
                  y={y + 48}
                  fill="#71717a"
                  fontSize="10"
                  fontFamily="sans-serif"
                  textAnchor="middle"
                >
                  Click to view all {totalInputs}
                </text>
              </motion.g>
            );
          })()}

        {/* --- OUTPUT NODES (capped) --- */}
        {txData.vout.slice(0, MAX_VISIBLE_NODES).map((vout, i) => {
          const y = rightStartY + i * (nodeH + gap);
          const opacity = isOutputDimmed || isWarningCard ? 0.3 : 1;

          return (
            <motion.g
              key={`out-${i}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity, x: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="transition-opacity duration-500"
            >
              <rect
                x={rightX}
                y={y}
                width={nodeW}
                height={nodeH}
                rx="6"
                fill="url(#glassNode)"
                stroke="rgba(139, 92, 246, 0.4)"
                strokeWidth="1"
                style={{
                  backdropFilter: "blur(4px)",
                  filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.5))",
                }}
              />
              <rect
                x={rightX + nodeW - 3}
                y={y}
                width="3"
                height={nodeH}
                fill="#8b5cf6"
                rx="1.5"
                style={{ filter: "drop-shadow(0 0 6px #8b5cf6)" }}
              />

              <text
                x={rightX + 16}
                y={y + 24}
                fill="#ffffff"
                fontSize="13"
                fontFamily="sans-serif"
                fontWeight="bold"
                style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))" }}
              >
                {(vout.value_sats / 100_000_000).toFixed(4)}{" "}
                <tspan fill="#94a3b8" fontSize="11" fontWeight="normal">
                  BTC
                </tspan>
              </text>
              <text
                x={rightX + 16}
                y={y + 44}
                fill="#64748b"
                fontSize="10"
                fontFamily="monospace"
              >
                {vout.address
                  ? vout.address.slice(0, 20) + "..."
                  : "OP_RETURN / Unknown"}
              </text>
              <text
                x={rightX + 16}
                y={y + 56}
                fill="#4b5563"
                fontSize="9"
                fontFamily="sans-serif"
                className="uppercase tracking-wider hover:fill-lens-400 hover:cursor-help transition-colors"
              >
                <title>{getScriptDefinition(vout.script_type)}</title>
                {translateScriptRuleset(vout.script_type)}
              </text>
            </motion.g>
          );
        })}

        {/* +N More Outputs Summary Node */}
        {showOutputSummary &&
          (() => {
            const y = rightStartY + MAX_VISIBLE_NODES * (nodeH + gap);
            return (
              <motion.g
                initial={{ opacity: 0, x: 20 }}
                animate={{
                  opacity: isOutputDimmed || isWarningCard ? 0.3 : 1,
                  x: 0,
                }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="cursor-pointer transition-opacity duration-500"
                onClick={() => setExpandedList("outputs")}
              >
                <rect
                  x={rightX}
                  y={y}
                  width={nodeW}
                  height={nodeH}
                  rx="8"
                  fill="#18181b"
                  stroke="#3f3f46"
                  strokeWidth="1"
                  className="hover:stroke-lens-500 transition-colors duration-300"
                />
                <rect
                  x={rightX + nodeW - 3}
                  y={y}
                  width="3"
                  height={nodeH}
                  fill="#8b5cf6"
                  rx="1.5"
                  opacity="0.5"
                />
                <text
                  x={rightX + nodeW / 2}
                  y={y + 28}
                  fill="#a1a1aa"
                  fontSize="13"
                  fontFamily="sans-serif"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  +{totalOutputs - MAX_VISIBLE_NODES} more outputs
                </text>
                <text
                  x={rightX + nodeW / 2}
                  y={y + 48}
                  fill="#71717a"
                  fontSize="10"
                  fontFamily="sans-serif"
                  textAnchor="middle"
                >
                  Click to view all {totalOutputs}
                </text>
              </motion.g>
            );
          })()}

        {/* --- MINER FEE NODE --- */}
        {(() => {
          const feeIdx = visibleOutputsCount;
          const y = rightStartY + feeIdx * (nodeH + gap);
          const opacity = isFeeDimmed || isWarningCard ? 0.3 : 1;

          return (
            <motion.g
              key={`fee`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity, x: 0 }}
              transition={{ duration: 0.5, delay: feeIdx * 0.1 }}
              className="transition-all duration-500"
            >
              <rect
                x={rightX}
                y={y}
                width={nodeW}
                height={nodeH}
                rx="6"
                fill={
                  isFeeHighlighted
                    ? "rgba(239, 68, 68, 0.1)"
                    : "url(#glassNode)"
                }
                stroke={isFeeHighlighted ? "#ef4444" : "rgba(244, 63, 94, 0.4)"}
                strokeWidth={isFeeHighlighted ? "2" : "1"}
                className="transition-all duration-500"
                style={{
                  backdropFilter: "blur(4px)",
                  filter: isFeeHighlighted
                    ? "url(#glow-red)"
                    : "drop-shadow(0 4px 6px rgba(0,0,0,0.5))",
                }}
              />
              <rect
                x={rightX + nodeW - 3}
                y={y}
                width="3"
                height={nodeH}
                fill={isFeeHighlighted ? "#ef4444" : "#f43f5e"}
                rx="1.5"
                className="transition-colors duration-500"
                style={{
                  filter: isFeeHighlighted
                    ? "drop-shadow(0 0 8px #ef4444)"
                    : "drop-shadow(0 0 4px #f43f5e)",
                }}
              />

              <text
                x={rightX + 16}
                y={y + 24}
                fill={isFeeHighlighted ? "#fbbf24" : "#ffffff"}
                fontSize="13"
                fontFamily="sans-serif"
                fontWeight="bold"
                className="transition-colors duration-500"
                style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))" }}
              >
                {(txData.fee_sats / 100_000_000).toFixed(8)}{" "}
                <tspan fill="#ef4444" fontSize="11" fontWeight="normal">
                  BTC
                </tspan>
              </text>
              <text
                x={rightX + 16}
                y={y + 42}
                fill={isFeeHighlighted ? "#fca5a5" : "#64748b"}
                fontSize="11"
                fontFamily="sans-serif"
                fontWeight="bold"
                className="transition-colors duration-500 hover:fill-red-400 hover:cursor-help"
              >
                <title>
                  The difference between the total inputs and total outputs.
                  This is exactly what the miner gets paid for including your
                  transaction in the block.
                </title>
                Miner Fee
              </text>
              <text
                x={rightX + 16}
                y={y + 56}
                fill="#4b5563"
                fontSize="9"
                fontFamily="sans-serif"
                className="hover:fill-zinc-400 hover:cursor-help transition-colors"
              >
                <title>
                  Weight Units (WU): How much physical hard drive space this
                  transaction takes up on the blockchain.
                </title>
                Weight: {txData.weight} WU
              </text>
              {isFeeHighlighted && (
                <g
                  transform={`translate(${rightX + nodeW - 32}, ${y + 16})`}
                  className="text-red-500"
                >
                  <FlameIcon />
                </g>
              )}
            </motion.g>
          );
        })()}
      </svg>

      {/* --- EXPANDED LIST MODAL --- */}
      <AnimatePresence>
        {expandedList && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-4xl max-h-[80vh] flex flex-col bg-surface-card border border-surface-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-surface-border bg-black/40">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    All {expandedList === "inputs" ? totalInputs : totalOutputs}{" "}
                    {expandedList === "inputs" ? "Inputs" : "Outputs"}
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    {expandedList === "inputs"
                      ? "Funds flowing into this transaction to be spent."
                      : "Brand new UTXOs created by this transaction."}
                  </p>
                </div>
                <button
                  onClick={() => setExpandedList(null)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-black/20">
                <div className="flex flex-col gap-3">
                  {(expandedList === "inputs" ? txData.vin : txData.vout).map(
                    (item, idx) => {
                      const valueSats =
                        "prevout" in item
                          ? item.prevout?.value_sats || 0
                          : item.value_sats;
                      const address = "address" in item ? item.address : "";
                      const txid = "txid" in item ? item.txid : "";

                      return (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-xs font-mono font-bold text-zinc-500 px-2 py-0.5 rounded bg-black/40 border border-white/5">
                                #{idx}
                              </span>
                              <span className="text-xs font-bold uppercase tracking-wider text-lens-400">
                                {translateScriptRuleset(item.script_type)}
                              </span>
                            </div>
                            <p className="text-sm font-mono text-zinc-300 truncate">
                              {txid
                                ? `${txid.slice(0, 32)}...`
                                : address || "OP_RETURN / Data Payload"}
                            </p>
                          </div>
                          <div className="text-left sm:text-right shrink-0">
                            <p className="text-sm font-bold text-white tracking-tight">
                              {(valueSats / 100_000_000).toFixed(8)}{" "}
                              <span className="text-zinc-500 text-xs">BTC</span>
                            </p>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FlameIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}
