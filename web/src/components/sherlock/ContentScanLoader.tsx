"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

const LOADING_STEPS = [
  "Accessing case file...",
  "Parsing block data...",
  "Applying heuristics...",
  "Classifying transactions...",
  "Generating report...",
];

const cycle = 5;

// --- Hex row data ---
type HexSegment = { text: string; color: string };

const baseColor = "#27272a"; // Zinc-800
const highlightColor = "#60a5fa"; // Blue-400
const accentColor = "#3b82f6"; // Blue-500

const hexLines: HexSegment[][] = [
  [
    { text: "01000000", color: highlightColor },
    { text: "000000000000000000000000", color: baseColor },
  ],
  [
    { text: "00000000", color: baseColor },
    { text: "3ba3edfd7a7b12b2", color: highlightColor },
    { text: "7ac72c3e", color: highlightColor },
  ],
  [
    { text: "67768f617fc81bc3", color: highlightColor },
    { text: "888a51323a9fb8aa", color: highlightColor },
  ],
  [
    { text: "4b1e5e4a", color: highlightColor },
    { text: "29ab5f49", color: highlightColor },
    { text: "ffff001d", color: highlightColor },
    { text: "1dac2b7c", color: highlightColor },
  ],
  [
    { text: "01", color: highlightColor },
    { text: "01000000", color: baseColor },
    { text: "01", color: highlightColor },
    { text: "00000000000000000000", color: baseColor },
  ],
  [
    { text: "00000000000000000000", color: baseColor },
    { text: "00000000", color: baseColor },
    { text: "4d", color: highlightColor },
  ],
  [
    { text: "04ffff001d0104455468", color: highlightColor },
    { text: "652054696d65", color: highlightColor },
  ],
];

const SVG_W = 210;
const SVG_H = 170;

interface ContentScanLoaderProps {
  onComplete: () => void;
  dataReady: boolean;
}

export function ContentScanLoader({ onComplete, dataReady }: ContentScanLoaderProps) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (stepIndex < LOADING_STEPS.length) {
      // Advance step every 400ms
      const timer = setTimeout(() => {
        // If we are on the very last step, only finish if data is ready
        if (stepIndex === LOADING_STEPS.length - 1) {
          if (dataReady) {
            setStepIndex((s) => s + 1);
          }
        } else {
          setStepIndex((s) => s + 1);
        }
      }, 400);
      return () => clearTimeout(timer);
    } else {
      // All steps checked AND data is ready — fade out
      const timer = setTimeout(() => {
        onComplete();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [stepIndex, dataReady, onComplete]);

  const rowHeight = 20;
  const startY = 28;
  const startX = 19;
  const fontSize = 9;
  const charWidth = 5.4;

  return (
    <motion.div 
      initial={{ opacity: 0, filter: "blur(8px)", scale: 0.95 }}
      animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: "blur(4px)" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full min-h-screen flex flex-col items-center justify-center gap-10 pt-16 px-6"
    >
      {/* --- Hex Scanner (Week 1 adapted) --- */}
      <div className="relative w-full max-w-sm rounded-2xl border border-blue-500/15 bg-[#09090b] overflow-hidden shadow-[0_0_60px_-15px_rgba(59,130,246,0.15)]">
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" fill="none">
          <defs>
            <clipPath id="scan-reveal">
              <motion.rect
                y="0" height={SVG_H}
                initial={{ x: 0, width: 0 }}
                animate={{ width: [0, SVG_W, SVG_W, 0] }}
                transition={{ duration: cycle, times: [0, 0.65, 0.88, 1], repeat: Infinity, ease: "easeInOut" }}
              />
            </clipPath>
            <linearGradient id="beamGlow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0)" />
              <stop offset="100%" stopColor="rgba(59, 130, 246, 0.2)" />
            </linearGradient>
          </defs>

          {/* LAYER 1: DIM base hex */}
          <g>
            {hexLines.map((segments, row) => {
              let xOffset = 0;
              return (
                <g key={`dim-${row}`}>
                  {segments.map((seg, si) => {
                    const x = startX + xOffset * charWidth;
                    xOffset += seg.text.length;
                    return (
                      <text
                        key={si}
                        x={x}
                        y={startY + row * rowHeight}
                        fill="#3f3f46"
                        fontSize={fontSize}
                        fontFamily="monospace"
                        opacity="0.8"
                      >
                        {seg.text}
                      </text>
                    );
                  })}
                </g>
              );
            })}
          </g>

          {/* LAYER 2: COLOR HIGHLIGHT (revealed by scanner) */}
          <g clipPath="url(#scan-reveal)">
            <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="#09090b" />
            {hexLines.map((segments, row) => {
              let xOffset = 0;
              return (
                <g key={`color-${row}`}>
                  {segments.map((seg, si) => {
                    const x = startX + xOffset * charWidth;
                    xOffset += seg.text.length;
                    return (
                      <text
                        key={si}
                        x={x}
                        y={startY + row * rowHeight}
                        fill={seg.color}
                        fontSize={fontSize}
                        fontFamily="monospace"
                        opacity={seg.color === highlightColor ? 1 : 0.6}
                        style={seg.color === highlightColor ? { filter: `drop-shadow(0 0 4px ${highlightColor}80)` } : {}}
                      >
                        {seg.text}
                      </text>
                    );
                  })}
                </g>
              );
            })}
          </g>

          {/* LAYER 3: SCANNER BEAM */}
          <motion.g
            initial={{ x: 0 }}
            animate={{ x: [0, SVG_W, SVG_W, 0] }}
            transition={{ duration: cycle, times: [0, 0.65, 0.88, 1], repeat: Infinity, ease: "easeInOut" }}
          >
            <line
              x1="0" y1="0" x2="0" y2={SVG_H}
              stroke={accentColor} strokeWidth="1.5"
              style={{ filter: `drop-shadow(0 0 6px ${accentColor}) drop-shadow(0 0 16px rgba(59,130,246,0.3))` }}
            />
            <rect
              x="-45" y="0" width="45" height={SVG_H}
              fill="url(#beamGlow)"
            />
          </motion.g>
        </svg>
      </div>

      {/* --- Checklist (Week 2 adapted) --- */}
      <div className="flex flex-col gap-3 w-full max-w-xs ml-4 sm:ml-0">
        {LOADING_STEPS.map((step, i) => (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: i <= stepIndex ? 1 : 0.2, x: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="flex items-center gap-3 text-sm font-mono tracking-wide"
          >
            {i < stepIndex ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : i === stepIndex ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-4 h-4 text-blue-400 shrink-0" />
              </motion.div>
            ) : (
              <div className="w-4 h-4 rounded-full border border-zinc-700 shrink-0" />
            )}
            <span className={i < stepIndex ? "text-zinc-500" : i === stepIndex ? "text-blue-100" : "text-zinc-700"}>
              {step}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
