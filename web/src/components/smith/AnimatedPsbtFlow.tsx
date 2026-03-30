"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Types matching the backend JSON output                            */
/* ------------------------------------------------------------------ */
export interface BuildResult {
  ok: boolean;
  psbt_base64: string;
  fee_sats: number;
  fee_rate_sat_vb: number;
  vbytes: number;
  change_index: number | null;
  warnings: { code: string }[];
  selected_inputs: { txid: string; vout: number; value_sats: number; script_type: string }[];
  outputs: { value_sats: number; script_type: string; address?: string; is_change?: boolean }[];
  locktime: number;
  rbf_signaling: boolean;
  strategy: string;
  network: string;
}

interface Props {
  activeCardId: string;
  data: BuildResult;
  onSummaryClick?: (type: 'inputs' | 'outputs') => void;
}

export function AnimatedPsbtFlow({ activeCardId, data, onSummaryClick }: Props) {
  const nodeW = 200;
  const nodeH = 64;
  const gap = 24;
  const MAX_VISIBLE_NODES = 3;

  const totalInputs = data.selected_inputs.length;
  const totalOutputs = data.outputs.length;

  const showInputSummary = totalInputs > MAX_VISIBLE_NODES;
  const showOutputSummary = totalOutputs > MAX_VISIBLE_NODES;

  // Build visible output indices — always include change if it exists
  const visibleOutputIndices: number[] = [];
  if (!showOutputSummary) {
    // Show all outputs
    for (let i = 0; i < totalOutputs; i++) visibleOutputIndices.push(i);
  } else {
    // Show first (MAX-1) + change (if not already in first MAX-1)
    const changeIdx = data.change_index;
    const firstN = Math.min(MAX_VISIBLE_NODES, totalOutputs);
    for (let i = 0; i < firstN; i++) visibleOutputIndices.push(i);
    if (changeIdx !== null && changeIdx >= firstN && !visibleOutputIndices.includes(changeIdx)) {
      // Replace last visible slot with the change output
      visibleOutputIndices[visibleOutputIndices.length - 1] = changeIdx;
    }
  }

  const visibleInputsCount = showInputSummary ? MAX_VISIBLE_NODES + 1 : totalInputs;
  const visibleOutputsCount = showOutputSummary ? visibleOutputIndices.length + 1 : visibleOutputIndices.length; // +1 for summary node

  const rightNodeCount = visibleOutputsCount + 1; // +1 for fee
  const maxNodes = Math.max(visibleInputsCount, rightNodeCount);

  const svgH = Math.max(400, maxNodes * (nodeH + gap) + gap * 2);
  const svgW = 800;

  const leftX = 24;
  const rightX = svgW - nodeW - 24;
  const centerX = svgW / 2;
  const centerY = svgH / 2;
  const coreRadius = 48;

  const leftTotalH = visibleInputsCount * (nodeH + gap) - gap;
  const leftStartY = (svgH - leftTotalH) / 2;

  const rightTotalH = rightNodeCount * (nodeH + gap) - gap;
  const rightStartY = (svgH - rightTotalH) / 2;

  /* ---- State per card ---- */
  const isInputsCard = activeCardId === "card-0";
  const isFlowCard = activeCardId === "card-1";
  const isFeeCard = activeCardId === "card-2";
  const isSettingsCard = activeCardId === "card-3";
  const isWarningCard = activeCardId === "card-4";

  const isOutputDimmed = isInputsCard || isFeeCard;
  const isInputDimmed = isFeeCard;
  const isFeeDimmed = isInputsCard || isFlowCard;
  const isFeeHighlighted = isFeeCard;

  const hasWarnings = data.warnings.length > 0;

  const coreColor = useMemo(() => {
    if (isWarningCard) return hasWarnings ? "#fbbf24" : "#10b981";
    if (isSettingsCard) return "#8b5cf6";
    return "#3b82f6";
  }, [isWarningCard, isSettingsCard, hasWarnings]);

  const drawPath = (x1: number, y1: number, x2: number, y2: number) => {
    const cp = 60;
    return `M ${x1},${y1} C ${x1 + cp},${y1} ${x2 - cp},${y2} ${x2},${y2}`;
  };

  const formatSats = (sats: number) => {
    if (sats >= 100_000_000) return `${(sats / 100_000_000).toFixed(4)} BTC`;
    if (sats >= 1_000_000) return `${(sats / 1_000_000).toFixed(2)}M sats`;
    if (sats >= 1_000) return `${(sats / 1_000).toFixed(1)}k sats`;
    return `${sats} sats`;
  };

  const getScriptDefinition = (s: string) => {
    const defs: Record<string, string> = {
      p2pkh: "Pay-to-Public-Key-Hash (Legacy address starting with 1)",
      p2sh: "Pay-to-Script-Hash (Address starting with 3, commonly used for multisig)",
      p2wpkh: "Pay-to-Witness-Public-Key-Hash (Native SegWit, bc1q address)",
      p2wsh: "Pay-to-Witness-Script-Hash (SegWit multisig/complex scripts)",
      p2tr: "Pay-to-Taproot (Newest address type, bc1p address)",
    };
    return defs[s] || s;
  };

  const translateScript = (s: string) => {
    const map: Record<string, string> = {
      p2pkh: "Legacy",
      p2sh: "Script Hash",
      p2wpkh: "Native SegWit",
      p2wsh: "SegWit Script",
      p2tr: "Taproot",
    };
    return map[s] || s;
  };

  return (
    <div className="w-full h-full min-h-125 flex items-center justify-center bg-black rounded-2xl border border-surface-border overflow-hidden relative">
      {/* Dot grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: `24px 24px`,
        }}
      />

      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full drop-shadow-2xl" style={{ filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.5))" }}>
        <defs>
          <linearGradient id="glassNode" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.01)" />
          </linearGradient>
        </defs>

        {/* === INPUT PATHS === */}
        {Array.from({ length: visibleInputsCount }).map((_, i) => {
          const y = leftStartY + i * (nodeH + gap) + nodeH / 2;
          const pathD = drawPath(leftX + nodeW, y, centerX - coreRadius, centerY);
          const active = !isWarningCard && !isSettingsCard && !isInputDimmed;
          return (
            <g key={`pi-${i}`}>
              <path d={pathD} fill="none" stroke="var(--color-surface-border)" strokeWidth="2" opacity={isInputDimmed ? 0.15 : 1} className="transition-opacity duration-500" />
              {active && (
                <circle r="3" fill={coreColor} style={{ filter: `drop-shadow(0 0 4px ${coreColor})` }}>
                  <animateMotion dur={`${2 + i * 0.2}s`} repeatCount="indefinite" path={pathD} />
                </circle>
              )}
            </g>
          );
        })}

        {/* === OUTPUT PATHS === */}
        {visibleOutputIndices.map((_, slotIdx) => {
          const y = rightStartY + slotIdx * (nodeH + gap) + nodeH / 2;
          const pathD = drawPath(centerX + coreRadius, centerY, rightX, y);
          const active = !isOutputDimmed && !isWarningCard && !isSettingsCard;
          return (
            <g key={`po-${slotIdx}`}>
              <path d={pathD} fill="none" stroke="var(--color-surface-border)" strokeWidth="2" opacity={isOutputDimmed ? 0.15 : 1} className="transition-opacity duration-500" />
              {active && (
                <circle r="3" fill={coreColor} style={{ filter: `drop-shadow(0 0 4px ${coreColor})` }}>
                  <animateMotion dur={`${2 + slotIdx * 0.1}s`} repeatCount="indefinite" path={pathD} />
                </circle>
              )}
            </g>
          );
        })}

        {/* === OUTPUT SUMMARY PATH === */}
        {showOutputSummary && (() => {
          const slotIdx = visibleOutputIndices.length;
          const y = rightStartY + slotIdx * (nodeH + gap) + nodeH / 2;
          const pathD = drawPath(centerX + coreRadius, centerY, rightX, y);
          const active = !isOutputDimmed && !isWarningCard && !isSettingsCard;
          return (
            <g key="po-summary">
              <path d={pathD} fill="none" stroke="var(--color-surface-border)" strokeWidth="2" opacity={isOutputDimmed ? 0.15 : 0.5} className="transition-opacity duration-500" />
              {active && (
                <circle r="3" fill={coreColor} style={{ filter: `drop-shadow(0 0 4px ${coreColor})` }}>
                  <animateMotion dur="2.5s" repeatCount="indefinite" path={pathD} />
                </circle>
              )}
            </g>
          );
        })()}

        {/* === FEE PATH === */}
        {(() => {
          const feeSlotIdx = showOutputSummary ? visibleOutputIndices.length + 1 : visibleOutputIndices.length;
          const y = rightStartY + feeSlotIdx * (nodeH + gap) + nodeH / 2;
          const pathD = drawPath(centerX + coreRadius, centerY, rightX, y);
          const strokeCol = isFeeHighlighted ? "#ef4444" : "var(--color-surface-border)";
          const active = !isFeeDimmed && !isWarningCard && !isSettingsCard;
          return (
            <g key="pf">
              <path d={pathD} fill="none" stroke={strokeCol} strokeWidth={isFeeHighlighted ? "3" : "2"} opacity={isFeeDimmed ? 0.2 : 1} className="transition-all duration-500" style={isFeeHighlighted ? { filter: "drop-shadow(0 0 6px #ef4444)" } : undefined} />
              {active && (
                <circle r="3" fill="#ef4444" style={{ filter: "drop-shadow(0 0 4px #ef4444)" }}>
                  <animateMotion dur="2.5s" repeatCount="indefinite" path={pathD} />
                </circle>
              )}
            </g>
          );
        })()}

        {/* === CENTRAL ENGINE === */}
        <motion.g
          animate={{ scale: isWarningCard ? [1, 1.02, 1] : 1 }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <circle cx={centerX} cy={centerY} r={coreRadius + 16} fill={coreColor} opacity="0.05" className="transition-colors duration-500" />
          <circle cx={centerX} cy={centerY} r={coreRadius} fill="rgba(6,6,16,0.9)" stroke={coreColor} strokeWidth="1.5" className="transition-colors duration-500" style={{ filter: `drop-shadow(0 0 10px ${coreColor}40)` }} />
          <circle cx={centerX} cy={centerY} r={coreRadius - 8} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

          {/* Crosshairs */}
          <line x1={centerX - coreRadius - 4} y1={centerY} x2={centerX - coreRadius + 4} y2={centerY} stroke={coreColor} strokeWidth="2" opacity="0.6" />
          <line x1={centerX + coreRadius - 4} y1={centerY} x2={centerX + coreRadius + 4} y2={centerY} stroke={coreColor} strokeWidth="2" opacity="0.6" />
          <line x1={centerX} y1={centerY - coreRadius - 4} x2={centerX} y2={centerY - coreRadius + 4} stroke={coreColor} strokeWidth="2" opacity="0.6" />
          <line x1={centerX} y1={centerY + coreRadius - 4} x2={centerX} y2={centerY + coreRadius + 4} stroke={coreColor} strokeWidth="2" opacity="0.6" />

          {/* Spinner ring */}
          <motion.circle
            cx={centerX} cy={centerY} r={coreRadius - 16}
            fill="transparent" stroke={coreColor} strokeWidth="2" strokeDasharray="30 15 10 15"
            animate={{ rotate: 360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: `${centerX}px ${centerY}px` }}
            className="transition-colors duration-500"
            opacity="0.8"
          />

          {/* Icon inside core changes by card */}
          {isWarningCard && hasWarnings && (
            <g transform={`translate(${centerX - 16}, ${centerY - 16})`} className="text-amber-500">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <path d="M12 9v4" /><path d="M12 17h.01" />
              </svg>
            </g>
          )}
          {isWarningCard && !hasWarnings && (
            <g transform={`translate(${centerX - 16}, ${centerY - 16})`} className="text-emerald-500">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" />
              </svg>
            </g>
          )}
          {isSettingsCard && (
            <g transform={`translate(${centerX - 16}, ${centerY - 16})`} className="text-purple-400">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </g>
          )}
          {!isWarningCard && !isSettingsCard && (
            <g transform={`translate(${centerX - 12}, ${centerY - 12})`} className="text-brand-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9" />
                <path d="m18 15 4-4" />
                <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5" />
              </svg>
            </g>
          )}
        </motion.g>

        {/* === INPUT NODES === */}
        {data.selected_inputs.slice(0, MAX_VISIBLE_NODES).map((input, i) => {
          const y = leftStartY + i * (nodeH + gap);
          const opacity = isWarningCard || isSettingsCard || isInputDimmed ? 0.15 : 1;
          return (
            <motion.g key={`in-${i}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity, x: 0 }} transition={{ duration: 0.5, delay: i * 0.1 }} className="transition-opacity duration-500">
              <rect x={leftX} y={y} width={nodeW} height={nodeH} rx="6" fill="url(#glassNode)" stroke="rgba(16,185,129,0.4)" strokeWidth="1" />
              <rect x={leftX} y={y} width="3" height={nodeH} fill="#10b981" rx="1.5" style={{ filter: "drop-shadow(0 0 6px #10b981)" }} />
              <text x={leftX + 16} y={y + 24} fill="#ffffff" fontSize="13" fontFamily="sans-serif" fontWeight="bold">
                {formatSats(input.value_sats)}
              </text>
              <text x={leftX + 16} y={y + 44} fill="#64748b" fontSize="10" fontFamily="monospace">
                {input.txid.slice(0, 16)}...
              </text>
              <text x={leftX + 16} y={y + 56} fill="#4b5563" fontSize="9" fontFamily="sans-serif" className="uppercase tracking-wider">
                <title>{getScriptDefinition(input.script_type)}</title>
                {translateScript(input.script_type)}
              </text>
            </motion.g>
          );
        })}

        {/* +N More Inputs Summary Node */}
        {showInputSummary && (() => {
          const y = leftStartY + MAX_VISIBLE_NODES * (nodeH + gap);
          const hiddenInputSats = data.selected_inputs.slice(MAX_VISIBLE_NODES).reduce((s, inp) => s + inp.value_sats, 0);
          return (
            <motion.g initial={{ opacity: 0, x: -20 }} animate={{ opacity: isWarningCard || isSettingsCard || isInputDimmed ? 0.15 : 1, x: 0 }} transition={{ delay: 0.5, duration: 0.8 }} className="transition-opacity duration-500 cursor-pointer" onClick={() => onSummaryClick?.('inputs')}>
              <rect x={leftX} y={y} width={nodeW} height={nodeH} rx="8" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
              <rect x={leftX} y={y} width="3" height={nodeH} fill="#10b981" rx="1.5" opacity="0.5" />
              <text x={leftX + nodeW / 2} y={y + 28} fill="#a1a1aa" fontSize="13" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
                +{totalInputs - MAX_VISIBLE_NODES} more inputs
              </text>
              <text x={leftX + nodeW / 2} y={y + 48} fill="#71717a" fontSize="10" fontFamily="sans-serif" textAnchor="middle">
                {formatSats(hiddenInputSats)}
              </text>
            </motion.g>
          );
        })()}

        {/* === OUTPUT NODES === */}
        {visibleOutputIndices.map((outputIdx, slotIdx) => {
          const output = data.outputs[outputIdx];
          const y = rightStartY + slotIdx * (nodeH + gap);
          const opacity = isOutputDimmed || isWarningCard || isSettingsCard ? 0.15 : 1;
          const isChange = data.change_index === outputIdx;
          return (
            <motion.g key={`out-${outputIdx}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity, x: 0 }} transition={{ duration: 0.5, delay: slotIdx * 0.1 }} className="transition-opacity duration-500">
              <rect x={rightX} y={y} width={nodeW} height={nodeH} rx="6" fill="url(#glassNode)" stroke={isChange ? "rgba(16,185,129,0.5)" : "rgba(139,92,246,0.4)"} strokeWidth="1" />
              <rect x={rightX + nodeW - 3} y={y} width="3" height={nodeH} fill={isChange ? "#10b981" : "#8b5cf6"} rx="1.5" style={{ filter: `drop-shadow(0 0 6px ${isChange ? "#10b981" : "#8b5cf6"})` }} />
              <text x={rightX + 16} y={y + 24} fill="#ffffff" fontSize="13" fontFamily="sans-serif" fontWeight="bold">
                {formatSats(output.value_sats)}
              </text>
              <text x={rightX + 16} y={y + 44} fill="#64748b" fontSize="10" fontFamily="sans-serif">
                {isChange ? "Change" : `Payment #${outputIdx + 1}`}
              </text>
              <text x={rightX + 16} y={y + 56} fill="#4b5563" fontSize="9" fontFamily="sans-serif" className="uppercase tracking-wider">
                <title>{getScriptDefinition(output.script_type)}</title>
                {translateScript(output.script_type)}
              </text>
            </motion.g>
          );
        })}

        {/* +N More Outputs Summary Node */}
        {showOutputSummary && (() => {
          const slotIdx = visibleOutputIndices.length;
          const y = rightStartY + slotIdx * (nodeH + gap);
          const hiddenCount = totalOutputs - visibleOutputIndices.length;
          const hiddenSats = data.outputs.reduce((s, o, i) => visibleOutputIndices.includes(i) ? s : s + o.value_sats, 0);
          return (
            <motion.g initial={{ opacity: 0, x: 20 }} animate={{ opacity: isOutputDimmed || isWarningCard || isSettingsCard ? 0.3 : 1, x: 0 }} transition={{ delay: 0.5, duration: 0.8 }} className="transition-opacity duration-500 cursor-pointer" onClick={() => onSummaryClick?.('outputs')}>
              <rect x={rightX} y={y} width={nodeW} height={nodeH} rx="8" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
              <rect x={rightX + nodeW - 3} y={y} width="3" height={nodeH} fill="#8b5cf6" rx="1.5" opacity="0.5" />
              <text x={rightX + nodeW / 2} y={y + 28} fill="#a1a1aa" fontSize="13" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
                +{hiddenCount} more outputs
              </text>
              <text x={rightX + nodeW / 2} y={y + 48} fill="#71717a" fontSize="10" fontFamily="sans-serif" textAnchor="middle">
                {formatSats(hiddenSats)}
              </text>
            </motion.g>
          );
        })()}

        {/* === MINER FEE NODE === */}
        {(() => {
          const feeSlotIdx = showOutputSummary ? visibleOutputIndices.length + 1 : visibleOutputIndices.length;
          const y = rightStartY + feeSlotIdx * (nodeH + gap);
          const opacity = isFeeDimmed || isWarningCard || isSettingsCard ? 0.3 : 1;
          return (
            <motion.g key="fee" initial={{ opacity: 0, x: 20 }} animate={{ opacity, x: 0 }} transition={{ duration: 0.5, delay: feeSlotIdx * 0.1 }} className="transition-all duration-500">
              <rect x={rightX} y={y} width={nodeW} height={nodeH} rx="6" fill={isFeeHighlighted ? "rgba(239,68,68,0.1)" : "url(#glassNode)"} stroke={isFeeHighlighted ? "#ef4444" : "rgba(244,63,94,0.4)"} strokeWidth={isFeeHighlighted ? "2" : "1"} className="transition-all duration-500" />
              <rect x={rightX + nodeW - 3} y={y} width="3" height={nodeH} fill={isFeeHighlighted ? "#ef4444" : "#f43f5e"} rx="1.5" className="transition-colors duration-500" />
              <text x={rightX + 16} y={y + 24} fill={isFeeHighlighted ? "#fbbf24" : "#ffffff"} fontSize="13" fontFamily="sans-serif" fontWeight="bold" className="transition-colors duration-500">
                <title>The difference between total inputs and total outputs. This is what the miner earns for including your transaction.</title>
                {formatSats(data.fee_sats)}
              </text>
              <text x={rightX + 16} y={y + 42} fill={isFeeHighlighted ? "#fca5a5" : "#64748b"} fontSize="11" fontFamily="sans-serif" fontWeight="bold" className="transition-colors duration-500">
                Miner Fee
              </text>
              <text x={rightX + 16} y={y + 56} fill="#4b5563" fontSize="9" fontFamily="sans-serif">
                <title>Weight Units (WU): How much block space this transaction occupies.</title>
                {data.fee_rate_sat_vb.toFixed(1)} sat/vB · {data.vbytes} vB
              </text>
            </motion.g>
          );
        })()}
      </svg>
    </div>
  );
}
