"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LOADING_STEPS = [
  "Parsing raw bytes...",
  "Decoding transaction...",
  "Building graph...",
];

const cycle = 5;

// --- Hex row data ---
// Before scan: dim, uniform hex
// After scan:  same hex but color-coded by field with tiny annotations

// Each segment: { text, color (after scan) }
// We stick to the lens theme: dim base, bright lens-500 (#3b82f6) for highlights
type HexSegment = { text: string; color: string };

const baseColor = "#475569"; // Slate for unhighlighted bits after scan
const highlightColor = "#60a5fa"; // Bright blue for highlighted bits

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
  [
    { text: "732030332f4a616e2f32", color: highlightColor },
    { text: "303039204368", color: highlightColor },
  ],
  [
    { text: "616e63656c6c6f72206f", color: highlightColor },
    { text: "6e206272696e", color: highlightColor },
  ],
  [
    { text: "ffffffff", color: baseColor },
    { text: "01", color: highlightColor },
    { text: "00f2052a", color: highlightColor },
    { text: "01000000", color: highlightColor },
  ],
];

const SVG_W = 210;
const SVG_H = 230;

export function ContentScanLoader() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 1600);
    return () => clearInterval(interval);
  }, []);

  const rowHeight = 20;
  const startY = 28;
  const startX = 19;
  const fontSize = 9;
  const charWidth = 5.4;

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-5">
      <div className="relative w-full rounded-2xl border border-lens-500/15 bg-[#060610] overflow-hidden shadow-[0_0_60px_-15px_rgba(59,130,246,0.15)]">
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" fill="none">
          <defs>
            {/* Clip for color-coded hex (revealed by scanner) */}
            <clipPath id="scan-reveal">
              <motion.rect
                y="0"
                height={SVG_H}
                initial={{ x: 0, width: 0 }}
                animate={{ width: [0, SVG_W, SVG_W, 0] }}
                transition={{
                  duration: cycle,
                  times: [0, 0.65, 0.88, 1],
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </clipPath>
            {/* Beam glow gradient */}
            <linearGradient id="beamGlow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0)" />
              <stop offset="100%" stopColor="rgba(59, 130, 246, 0.2)" />
            </linearGradient>
          </defs>

          {/* LAYER 1: DIM uniform hex (always visible as base) */}
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
                        fill="#334155"
                        fontSize={fontSize}
                        fontFamily="monospace"
                        opacity="0.7"
                      >
                        {seg.text}
                      </text>
                    );
                  })}
                </g>
              );
            })}
          </g>

          {/* LAYER 2: COLOR-CODED hex (after scan) */}
          <g clipPath="url(#scan-reveal)">
            {/* Opaque background to fully cover dim text beneath */}
            <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="#060610" />

            {hexLines.map((segments, row) => {
              let xOffset = 0;
              return (
                <g key={`color-${row}`}>
                  {segments.map((seg, si) => {
                    const x = startX + xOffset * charWidth;
                    xOffset += seg.text.length;
                    return (
                      <g key={si}>
                        {/* Bright color-coded text */}
                        <text
                          x={x}
                          y={startY + row * rowHeight}
                          fill={seg.color}
                          fontSize={fontSize}
                          fontFamily="monospace"
                          opacity={seg.color === highlightColor ? 1 : 0.6}
                          style={
                            seg.color === highlightColor
                              ? {
                                  filter: `drop-shadow(0 0 4px ${highlightColor}80)`,
                                }
                              : {}
                          }
                        >
                          {seg.text}
                        </text>
                      </g>
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
            transition={{
              duration: cycle,
              times: [0, 0.65, 0.88, 1],
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {/* Vertical laser */}
            <line
              x1="0"
              y1="0"
              x2="0"
              y2={SVG_H}
              stroke="#3b82f6"
              strokeWidth="1.5"
              style={{
                filter:
                  "drop-shadow(0 0 6px #3b82f6) drop-shadow(0 0 16px rgba(59,130,246,0.3))",
              }}
            />
            {/* Trailing glow */}
            <rect
              x="-45"
              y="0"
              width="45"
              height={SVG_H}
              fill="url(#beamGlow)"
            />
          </motion.g>
        </svg>
      </div>

      {/* Status Text -- smooth fade, larger */}
      <div className="h-6 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.span
            key={stepIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="text-lens-400 font-mono text-sm uppercase tracking-widest"
          >
            {LOADING_STEPS[stepIndex]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
