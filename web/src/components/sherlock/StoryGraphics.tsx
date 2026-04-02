"use client";

import { motion } from "framer-motion";

const BLUE = "#3b82f6";
const BLUE_DIM = "#60a5fa";

/* ─────────────────────────────────────────────
   Helper: strokeDasharray / strokeDashoffset
   trick — we pass the total path length so the
   draw animation works for any element.
───────────────────────────────────────────── */

// ─── Card 1: AnimatedTrail ───────────────────────────────────────────────────
export function AnimatedTrail({ isPlaying }: { isPlaying: boolean }) {
  // Scrolling hex lines — 8 rows, repeated for seamless scroll
  const hexLines = [
    "a3f2b1c9d0e4",
    "8f3a12cc9e71",
    "b891405adf2e",
    "c44d7b33e901",
    "0xff3ab12c44",
    "d0e4a3f21890",
    "9e71b891405a",
    "1c2d3e4f5a6b",
  ];

  return (
    <svg
      viewBox="0 0 280 160"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <defs>
        {/* Glow filter for the gold elements */}
        <filter id="blueGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="blueGlowHeavy" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        {/* Subtle grid pattern */}
        <pattern
          id="gridBlue"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke="rgba(255,255,255,0.02)"
            strokeWidth="1"
          />
        </pattern>
      </defs>

      {/* Background with Grid */}
      <rect width="280" height="160" fill="transparent" />
      <rect width="280" height="160" fill="url(#gridBlue)" />

      {/* ── Scrolling hex text column (very faint) ── */}
      <clipPath id="trail-hex-clip">
        <rect x="0" y="0" width="85" height="160" />
      </clipPath>
      <g clipPath="url(#trail-hex-clip)" opacity="0.15">
        {/* Two copies stacked for seamless vertical loop */}
        {[0, 1].map((copy) =>
          hexLines.map((line, j) => (
            <motion.text
              key={`hex-${copy}-${j}`}
              x="8"
              y={copy * (hexLines.length * 16) + j * 16 + 12}
              fontSize="8"
              fontFamily="monospace"
              fill={BLUE}
              animate={
                isPlaying ? { y: [0, -(hexLines.length * 16)] } : { y: 0 }
              }
              transition={
                isPlaying
                  ? {
                      duration: 12,
                      repeat: Infinity,
                      ease: "linear",
                      delay: copy * 0,
                    }
                  : { duration: 0 }
              }
            >
              {line}
            </motion.text>
          )),
        )}
      </g>

      {/* ── Chain blocks ── */}
      {/* Block 1 */}
      <motion.g
        initial={{ opacity: 0, scale: 0.9, y: 5 }}
        animate={
          isPlaying
            ? { opacity: 1, scale: 1, y: 0 }
            : { opacity: 0, scale: 0.9, y: 5 }
        }
        transition={
          isPlaying
            ? { duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }
            : { duration: 0.3 }
        }
        style={{ transformOrigin: "50px 80px" }}
      >
        <rect
          x="20"
          y="60"
          width="60"
          height="40"
          rx="6"
          stroke={BLUE}
          strokeWidth="1.5"
          fill="rgba(59,130,246,0.03)"
          filter="url(#blueGlow)"
        />
        <text
          x="50"
          y="85"
          textAnchor="middle"
          fontSize="8"
          fontFamily="monospace"
          fill={BLUE}
          opacity="0.9"
          fontWeight="bold"
        >
          0xa3f2
        </text>
      </motion.g>

      {/* Chain link 1 */}
      <motion.line
        x1="80"
        y1="80"
        x2="110"
        y2="80"
        stroke={BLUE_DIM}
        strokeWidth="2"
        strokeDasharray="30"
        initial={{ strokeDashoffset: 30 }}
        animate={isPlaying ? { strokeDashoffset: 0 } : { strokeDashoffset: 30 }}
        transition={
          isPlaying
            ? { duration: 0.6, delay: 1.1, ease: "easeOut" }
            : { duration: 0.2 }
        }
        filter="url(#blueGlow)"
      />
      {/* Chain link 1 center dot */}
      <motion.circle
        cx="95"
        cy="80"
        r="3"
        fill={BLUE_DIM}
        initial={{ opacity: 0, scale: 0 }}
        animate={
          isPlaying ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }
        }
        transition={
          isPlaying
            ? { duration: 0.4, delay: 1.4, type: "spring" }
            : { duration: 0.2 }
        }
        filter="url(#blueGlowHeavy)"
      />

      {/* Block 2 */}
      <motion.g
        initial={{ opacity: 0, scale: 0.9, y: 5 }}
        animate={
          isPlaying
            ? { opacity: 1, scale: 1, y: 0 }
            : { opacity: 0, scale: 0.9, y: 5 }
        }
        transition={
          isPlaying
            ? { duration: 0.8, delay: 1.6, ease: [0.16, 1, 0.3, 1] }
            : { duration: 0.3 }
        }
        style={{ transformOrigin: "140px 80px" }}
      >
        <rect
          x="110"
          y="60"
          width="60"
          height="40"
          rx="6"
          stroke={BLUE}
          strokeWidth="1.5"
          fill="rgba(59,130,246,0.03)"
          filter="url(#blueGlow)"
        />
        <text
          x="140"
          y="85"
          textAnchor="middle"
          fontSize="8"
          fontFamily="monospace"
          fill={BLUE}
          opacity="0.9"
          fontWeight="bold"
        >
          0xb891
        </text>
      </motion.g>

      {/* Chain link 2 */}
      <motion.line
        x1="170"
        y1="80"
        x2="200"
        y2="80"
        stroke={BLUE_DIM}
        strokeWidth="2"
        strokeDasharray="30"
        initial={{ strokeDashoffset: 30 }}
        animate={isPlaying ? { strokeDashoffset: 0 } : { strokeDashoffset: 30 }}
        transition={
          isPlaying
            ? { duration: 0.6, delay: 2.2, ease: "easeOut" }
            : { duration: 0.2 }
        }
        filter="url(#blueGlow)"
      />
      <motion.circle
        cx="185"
        cy="80"
        r="3"
        fill={BLUE_DIM}
        initial={{ opacity: 0, scale: 0 }}
        animate={
          isPlaying ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }
        }
        transition={
          isPlaying
            ? { duration: 0.4, delay: 2.5, type: "spring" }
            : { duration: 0.2 }
        }
        filter="url(#blueGlowHeavy)"
      />

      {/* Block 3 */}
      <motion.g
        initial={{ opacity: 0, scale: 0.9, y: 5 }}
        animate={
          isPlaying
            ? { opacity: 1, scale: 1, y: 0 }
            : { opacity: 0, scale: 0.9, y: 5 }
        }
        transition={
          isPlaying
            ? { duration: 0.8, delay: 2.7, ease: [0.16, 1, 0.3, 1] }
            : { duration: 0.3 }
        }
        style={{ transformOrigin: "230px 80px" }}
      >
        <rect
          x="200"
          y="60"
          width="60"
          height="40"
          rx="6"
          stroke={BLUE}
          strokeWidth="1.5"
          fill="rgba(59,130,246,0.03)"
          filter="url(#blueGlow)"
        />
        <text
          x="230"
          y="85"
          textAnchor="middle"
          fontSize="8"
          fontFamily="monospace"
          fill={BLUE}
          opacity="0.9"
          fontWeight="bold"
        >
          0xc44d
        </text>
      </motion.g>

      {/* ── Magnifying glass sweeping left → right ── */}
      <motion.g
        initial={{ x: -60 }}
        animate={isPlaying ? { x: [null, -40, 320] } : { x: -60 }}
        transition={
          isPlaying
            ? {
                duration: 9,
                repeat: Infinity,
                times: [0, 0.4, 1],
                ease: ["easeInOut", "easeInOut"],
                delay: 1,
              }
            : { duration: 0 }
        }
      >
        {/* Glass circle */}
        <circle
          cx="140"
          cy="80"
          r="36"
          stroke={BLUE}
          strokeWidth="2.5"
          fill="rgba(59,130,246,0.08)"
          filter="url(#blueGlow)"
          style={{ backdropFilter: "blur(4px)" }}
          className="backdrop-blur-md"
        />
        {/* Highlight arc */}
        <path
          d="M 115 60 A 32 32 0 0 1 155 52"
          stroke={BLUE}
          strokeWidth="1.5"
          fill="none"
          opacity="0.6"
        />
        {/* Handle */}
        <line
          x1="165"
          y1="105"
          x2="185"
          y2="125"
          stroke={BLUE}
          strokeWidth="4"
          strokeLinecap="round"
          filter="url(#blueGlow)"
        />
      </motion.g>
    </svg>
  );
}

// ─── Card 2: AnimatedCIOH ────────────────────────────────────────────────────
export function AnimatedCIOH({ isPlaying }: { isPlaying: boolean }) {
  const coins = [
    { cx: 30, cy: 30 },
    { cx: 30, cy: 80 },
    { cx: 30, cy: 130 },
  ];

  // Arrow path from each coin to wallet center
  // Originating from just outside the coin (r=14) and stopping just before the wallet (x=190)
  const arrowPaths = [
    "M 44 35 L 180 88",
    "M 44 80 L 180 88",
    "M 44 125 L 180 88",
  ];

  return (
    <svg
      viewBox="0 0 280 160"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <defs>
        <filter id="blueGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="blueGlowHeavy" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <pattern
          id="gridBlue"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke="rgba(255,255,255,0.02)"
            strokeWidth="1"
          />
        </pattern>
      </defs>

      <rect width="280" height="160" fill="transparent" />
      <rect width="280" height="160" fill="url(#gridBlue)" />

      {/* ── Input coins ── */}
      {coins.map((coin, i) => (
        <motion.g
          key={`coin-${i}`}
          initial={{ scale: 0 }}
          animate={isPlaying ? { scale: 1 } : { scale: 0 }}
          transition={
            isPlaying
              ? { type: "spring", stiffness: 320, damping: 18, delay: i * 0.3 }
              : { duration: 0.2 }
          }
          style={{ transformOrigin: `${coin.cx}px ${coin.cy}px` }}
        >
          <circle
            cx={coin.cx}
            cy={coin.cy}
            r="14"
            stroke={BLUE}
            strokeWidth="1.5"
            fill="rgba(59,130,246,0.08)"
            filter="url(#blueGlow)"
          />
          <text
            x={coin.cx}
            y={coin.cy + 3}
            textAnchor="middle"
            fontSize="9"
            fill={BLUE}
            fontWeight="bold"
          >
            ₿
          </text>
        </motion.g>
      ))}

      {/* ── Arrow lines (drawn smoothly) ── */}
      {arrowPaths.map((d, i) => (
        <motion.path
          key={`arrow-${i}`}
          d={d}
          stroke={BLUE}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={
            isPlaying
              ? { pathLength: 1, opacity: 0.8 }
              : { pathLength: 0, opacity: 0 }
          }
          transition={
            isPlaying
              ? { duration: 1, delay: 1 + i * 0.3, ease: "easeOut" }
              : { duration: 0.2 }
          }
        />
      ))}

      {/* Merged Arrow Head */}
      <motion.g
        initial={{ opacity: 0, scale: 0 }}
        animate={
          isPlaying ? { opacity: 0.9, scale: 1 } : { opacity: 0, scale: 0 }
        }
        transition={
          isPlaying ? { duration: 0.3, delay: 2.2 } : { duration: 0.2 }
        }
        style={{ transformOrigin: `180px 88px` }}
      >
        <polygon
          points="-2,-6 6,0 -2,6"
          fill={BLUE}
          transform={`translate(180, 88)`}
        />
      </motion.g>

      {/* ── Wallet rectangle ── */}
      <motion.rect
        x="190"
        y="65"
        width="60"
        height="50"
        rx="8"
        strokeWidth="2"
        fill="rgba(59,130,246,0.06)"
        filter="url(#blueGlow)"
        initial={{ stroke: "#444" }}
        animate={
          isPlaying ? { stroke: [null, "#444", BLUE] } : { stroke: "#444" }
        }
        transition={
          isPlaying
            ? { duration: 0.8, delay: 3, times: [0, 0, 1] }
            : { duration: 0.3 }
        }
      />
      {/* Wallet tab */}
      <motion.rect
        x="205"
        y="61"
        width="20"
        height="8"
        rx="2"
        strokeWidth="2"
        fill="rgba(59,130,246,0.06)"
        filter="url(#blueGlow)"
        initial={{ stroke: "#444" }}
        animate={
          isPlaying ? { stroke: [null, "#444", BLUE] } : { stroke: "#444" }
        }
        transition={
          isPlaying
            ? { duration: 0.8, delay: 3, times: [0, 0, 1] }
            : { duration: 0.3 }
        }
      />
      {/* Wallet interior line */}
      <motion.line
        x1="198"
        y1="82"
        x2="242"
        y2="82"
        strokeWidth="1.5"
        initial={{ stroke: "#333", opacity: 0 }}
        animate={
          isPlaying
            ? { stroke: BLUE_DIM, opacity: 0.5 }
            : { stroke: "#333", opacity: 0 }
        }
        transition={
          isPlaying ? { duration: 0.5, delay: 3.5 } : { duration: 0.2 }
        }
      />

      {/* ── Lock / keyhole icon snapping shut ── */}
      <motion.g
        initial={{ scale: 0, opacity: 0, y: -10 }}
        animate={
          isPlaying
            ? { scale: 1, opacity: 1, y: 0 }
            : { scale: 0, opacity: 0, y: -10 }
        }
        transition={
          isPlaying
            ? { type: "spring", stiffness: 400, damping: 15, delay: 4.5 }
            : { duration: 0.2 }
        }
        style={{ transformOrigin: "220px 45px" }}
      >
        <rect
          x="213"
          y="45"
          width="14"
          height="11"
          rx="2"
          stroke={BLUE}
          strokeWidth="1.5"
          fill="rgba(59,130,246,0.1)"
          filter="url(#blueGlow)"
        />
        <path
          d="M 215 45 L 215 40 A 5 5 0 0 1 225 40 L 225 45"
          stroke={BLUE}
          strokeWidth="2"
          fill="none"
        />
        <circle cx="220" cy="50" r="2" fill={BLUE} />
        <line x1="220" y1="52" x2="220" y2="54" stroke={BLUE} strokeWidth="2" />
      </motion.g>

      {/* ── "SAME OWNER" label ── */}
      <motion.text
        x="220"
        y="136"
        textAnchor="middle"
        fontSize="10"
        fontFamily="monospace"
        fontWeight="bold"
        fill={BLUE}
        letterSpacing="1"
        initial={{ opacity: 0, y: 140 }}
        animate={isPlaying ? { opacity: 1, y: 136 } : { opacity: 0, y: 140 }}
        transition={
          isPlaying ? { duration: 0.6, delay: 4.8 } : { duration: 0.2 }
        }
        style={{ textShadow: `0 0 8px rgba(59,130,246,0.5)` }}
      >
        SAME OWNER
      </motion.text>
    </svg>
  );
}

// ─── Card 3: AnimatedChange ──────────────────────────────────────────────────
export function AnimatedChange({ isPlaying }: { isPlaying: boolean }) {
  const hexLines = [
    "script_pubkey: OP_DUP OP_HASH160...",
    "value: 0.341 BTC",
    "type: P2WPKH",
    "heuristics_match: true",
    "round_number: false",
    "wallet_fingerprint: a9f2b8...",
    "sig_hash: SIGHASH_ALL",
    "locktime: 0x00000000",
  ];

  return (
    <svg
      viewBox="0 0 280 160"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <defs>
        <filter id="blueGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="blueGlowHeavy" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <pattern
          id="gridBlue"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke="rgba(255,255,255,0.02)"
            strokeWidth="1"
          />
        </pattern>
        <clipPath id="change-hex-clip">
          <rect x="0" y="0" width="130" height="160" />
        </clipPath>
      </defs>

      <rect width="280" height="160" fill="transparent" />
      <rect width="280" height="160" fill="url(#gridBlue)" />

      {/* ── Background Scrolling Hex (Diagnostic Output) ── */}
      <g clipPath="url(#change-hex-clip)" opacity="0.15">
        {[0, 1].map((copy) =>
          hexLines.map((line, j) => (
            <motion.text
              key={`hex-${copy}-${j}`}
              x="8"
              y={copy * (hexLines.length * 16) + j * 16 + 14}
              fontSize="7"
              fontFamily="monospace"
              fill={BLUE}
              animate={
                isPlaying ? { y: [0, -(hexLines.length * 16)] } : { y: 0 }
              }
              transition={
                isPlaying
                  ? { duration: 15, repeat: Infinity, ease: "linear" }
                  : { duration: 0 }
              }
            >
              {line}
            </motion.text>
          )),
        )}
      </g>

      {/* ── Base Connection Lines (Faint Pipes) ── */}
      <line
        x1="40"
        y1="80"
        x2="100"
        y2="80"
        stroke="rgba(59,130,246,0.15)"
        strokeWidth="2"
        strokeDasharray="4 2"
      />
      <path
        d="M 115 80 Q 150 40 200 40"
        stroke="rgba(59,130,246,0.15)"
        strokeWidth="2"
        fill="none"
        strokeDasharray="4 2"
      />
      <path
        d="M 115 80 Q 150 120 200 120"
        stroke="rgba(59,130,246,0.15)"
        strokeWidth="2"
        fill="none"
        strokeDasharray="4 2"
      />

      {/* ── Animated Data Pulses ── */}
      <motion.line
        x1="40"
        y1="80"
        x2="100"
        y2="80"
        stroke={BLUE}
        strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={
          isPlaying
            ? { pathLength: [0, 1, 1, 0, 0], opacity: [0, 1, 0, 0, 0] }
            : {}
        }
        transition={{
          duration: 8,
          repeat: Infinity,
          times: [0, 0.1, 0.15, 0.2, 1],
        }}
        filter="url(#blueGlow)"
      />

      <motion.path
        d="M 115 80 Q 150 40 184 40"
        stroke={BLUE_DIM}
        strokeWidth="2"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={
          isPlaying
            ? { pathLength: [0, 0, 1, 1, 0, 0], opacity: [0, 0, 1, 0, 0, 0] }
            : {}
        }
        transition={{
          duration: 8,
          repeat: Infinity,
          times: [0, 0.15, 0.3, 0.4, 0.45, 1],
        }}
        filter="url(#blueGlow)"
      />

      <motion.path
        d="M 115 80 Q 150 120 184 120"
        stroke={BLUE}
        strokeWidth="2.5"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={
          isPlaying
            ? { pathLength: [0, 0, 1, 1, 0, 0], opacity: [0, 0, 1, 0, 0, 0] }
            : {}
        }
        transition={{
          duration: 8,
          repeat: Infinity,
          times: [0, 0.15, 0.3, 0.4, 0.45, 1],
        }}
        filter="url(#blueGlowHeavy)"
      />

      {/* ── Input Node ── */}
      <circle
        cx="30"
        cy="80"
        r="14"
        fill="rgba(59,130,246,0.05)"
        stroke={BLUE}
        strokeWidth="1.5"
      />
      <text
        x="30"
        y="84"
        textAnchor="middle"
        fontSize="10"
        fill={BLUE}
        fontWeight="bold"
      >
        ₿
      </text>

      {/* ── Tx Splitter Node (Center) ── */}
      <motion.g
        style={{ transformOrigin: "100px 80px" }}
        initial={{ scale: 1 }}
        animate={isPlaying ? { scale: [1, 1, 1.15, 1, 1] } : { scale: 1 }}
        transition={{
          duration: 8,
          repeat: Infinity,
          times: [0, 0.1, 0.15, 0.25, 1],
        }}
      >
        <rect
          x="85"
          y="65"
          width="30"
          height="30"
          rx="4"
          stroke={BLUE}
          fill="rgba(59,130,246,0.15)"
          strokeWidth="1.5"
          filter="url(#blueGlow)"
        />
        <text
          x="100"
          y="83"
          textAnchor="middle"
          fontSize="8"
          fill={BLUE}
          fontWeight="bold"
          fontFamily="monospace"
        >
          TX
        </text>
      </motion.g>

      {/* ── Payment Output Node (Top) ── */}
      <motion.g
        style={{ transformOrigin: "200px 40px" }}
        initial={{ scale: 0.9, opacity: 0.5 }}
        animate={
          isPlaying
            ? { scale: [0.9, 0.9, 1.1, 1, 0.9], opacity: [0.5, 0.5, 1, 1, 0.5] }
            : {}
        }
        transition={{
          duration: 8,
          repeat: Infinity,
          times: [0, 0.25, 0.35, 0.8, 1],
        }}
      >
        <circle
          cx="200"
          cy="40"
          r="16"
          stroke={BLUE_DIM}
          fill="transparent"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <circle
          cx="200"
          cy="40"
          r="12"
          fill="rgba(96,165,250,0.15)"
          stroke={BLUE_DIM}
          strokeWidth="1"
        />
        <text x="200" y="43" textAnchor="middle" fontSize="8" fill={BLUE_DIM}>
          ₿
        </text>
        <text
          x="200"
          y="18"
          textAnchor="middle"
          fontSize="7"
          fill={BLUE_DIM}
          fontFamily="monospace"
          letterSpacing="0.5"
        >
          PAYMENT
        </text>
      </motion.g>

      {/* ── Change Output Node (Bottom) ── */}
      <motion.g
        style={{ transformOrigin: "200px 120px" }}
        initial={{ scale: 0.9, opacity: 0.5 }}
        animate={
          isPlaying
            ? { scale: [0.9, 0.9, 1.1, 1, 0.9], opacity: [0.5, 0.5, 1, 1, 0.5] }
            : {}
        }
        transition={{
          duration: 8,
          repeat: Infinity,
          times: [0, 0.25, 0.35, 0.8, 1],
        }}
      >
        <motion.circle
          cx="200"
          cy="120"
          r="16"
          stroke={BLUE}
          fill="transparent"
          strokeWidth="1.5"
          strokeDasharray="10 10"
          animate={isPlaying ? { rotate: [0, 180] } : {}}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "200px 120px" }}
        />
        <circle
          cx="200"
          cy="120"
          r="12"
          fill="rgba(59,130,246,0.25)"
          stroke={BLUE}
          strokeWidth="1.5"
          filter="url(#blueGlow)"
        />
        <text
          x="200"
          y="123"
          textAnchor="middle"
          fontSize="8"
          fill={BLUE}
          fontWeight="bold"
        >
          ↺
        </text>
        <text
          x="200"
          y="150"
          textAnchor="middle"
          fontSize="7"
          fill={BLUE}
          fontFamily="monospace"
          letterSpacing="0.5"
          fontWeight="bold"
        >
          CHANGE
        </text>
      </motion.g>

      {/* ── Sherlock Scanner Over Change Output ── */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={isPlaying ? { opacity: [0, 0, 1, 1, 0, 0] } : {}}
        transition={{
          duration: 8,
          repeat: Infinity,
          times: [0, 0.4, 0.45, 0.85, 0.9, 1],
        }}
      >
        {/* Scanner Box */}
        <motion.rect
          x="176"
          y="96"
          width="48"
          height="48"
          rx="6"
          stroke={BLUE}
          strokeWidth="1.5"
          fill="rgba(59,130,246,0.05)"
          strokeDasharray="4 4"
          initial={{ scale: 1.2 }}
          animate={isPlaying ? { scale: [1.2, 1.2, 1, 1, 1.2, 1.2] } : {}}
          transition={{
            duration: 8,
            repeat: Infinity,
            times: [0, 0.4, 0.45, 0.85, 0.9, 1],
          }}
          style={{ transformOrigin: "200px 120px" }}
          filter="url(#blueGlow)"
        />

        {/* Callout Lines & Boxes */}
        <path
          d="M 176 102 L 130 102 L 120 112 L 82 112"
          stroke={BLUE}
          strokeWidth="1"
          fill="none"
          opacity="0.6"
        />
        <rect
          x="10"
          y="105"
          width="72"
          height="14"
          rx="2"
          fill="rgba(59,130,246,0.15)"
          stroke={BLUE}
          strokeWidth="1"
          filter="url(#blueGlow)"
        />
        <text
          x="46"
          y="114"
          textAnchor="middle"
          fontSize="6"
          fill={BLUE}
          fontFamily="monospace"
          fontWeight="bold"
        >
          SCRIPT MATCH
        </text>

        <path
          d="M 176 142 L 130 142 L 120 132 L 82 132"
          stroke={BLUE}
          strokeWidth="1"
          fill="none"
          opacity="0.6"
        />
        <rect
          x="10"
          y="125"
          width="72"
          height="14"
          rx="2"
          fill="rgba(59,130,246,0.15)"
          stroke={BLUE}
          strokeWidth="1"
          filter="url(#blueGlow)"
        />
        <text
          x="46"
          y="134"
          textAnchor="middle"
          fontSize="6"
          fill={BLUE}
          fontFamily="monospace"
          fontWeight="bold"
        >
          VALUE HEURISTIC
        </text>
      </motion.g>
    </svg>
  );
}

// ─── Card 4: AnimatedDots ────────────────────────────────────────────────────
const DOT_NODES = [
  { x: 40, y: 30 },
  { x: 130, y: 20 },
  { x: 230, y: 90 },
  { x: 100, y: 150 },
  { x: 30, y: 110 },
];

const EDGES: [number, number][] = [
  [0, 5], // connects to center
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 0],
  [1, 5],
  [2, 5],
  [3, 5],
  [4, 5],
];

// Re-map nodes with a central hub
const ENHANCED_NODES = [
  ...DOT_NODES,
  { x: 140, y: 80 }, // Center node (idx 5)
];

export function AnimatedDots({ isPlaying }: { isPlaying: boolean }) {
  // We'll create a scanning reticle that moves back and forth
  // and highlights nodes when it passes near them.
  const scannerX = [40, 230, 140, 40];
  const scannerY = [30, 90, 80, 30];

  return (
    <svg
      viewBox="0 0 280 160"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <defs>
        <filter id="blueGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="blueGlowHeavy" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <pattern
          id="gridBlue"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke="rgba(255,255,255,0.02)"
            strokeWidth="1"
          />
        </pattern>
        <linearGradient id="scannerBeam" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(59,130,246,0)" />
          <stop offset="50%" stopColor="rgba(59,130,246,0.3)" />
          <stop offset="100%" stopColor="rgba(59,130,246,0)" />
        </linearGradient>
      </defs>

      <rect width="280" height="160" fill="transparent" />
      <rect width="280" height="160" fill="url(#gridBlue)" />

      {/* ── Diagnostic Background Text ── */}
      <motion.g
        opacity="0.15"
        initial={{ y: 0 }}
        animate={isPlaying ? { y: -160 } : { y: 0 }}
        transition={
          isPlaying
            ? { duration: 20, repeat: Infinity, ease: "linear" }
            : { duration: 0 }
        }
      >
        {[0, 1].map((copy) => (
          <g key={`text-${copy}`} transform={`translate(0, ${copy * 160})`}>
            <text x="10" y="20" fontSize="8" fontFamily="monospace" fill={BLUE}>
              ANALYZING COINJOIN...
            </text>
            <text x="10" y="40" fontSize="8" fontFamily="monospace" fill={BLUE}>
              TX_ENTROPY: HIGH
            </text>
            <text x="10" y="60" fontSize="8" fontFamily="monospace" fill={BLUE}>
              IDENTIFYING CLUSTERS...
            </text>
            <text x="10" y="80" fontSize="8" fontFamily="monospace" fill={BLUE}>
              PEEL_CHAIN_DETECTED: FALSE
            </text>
            <text
              x="10"
              y="100"
              fontSize="8"
              fontFamily="monospace"
              fill={BLUE}
            >
              DECRYPTING PATHS...
            </text>
            <text
              x="10"
              y="120"
              fontSize="8"
              fontFamily="monospace"
              fill={BLUE}
            >
              MIXER_HEURISTIC: 0.89
            </text>
            <text
              x="10"
              y="140"
              fontSize="8"
              fontFamily="monospace"
              fill={BLUE}
            >
              ISOLATING INPUTS...
            </text>
          </g>
        ))}
      </motion.g>

      {/* ── Network Edges ── */}
      {EDGES.map(([a, b], i) => {
        const na = ENHANCED_NODES[a];
        const nb = ENHANCED_NODES[b];
        return (
          <g key={`edge-${i}`}>
            <line
              x1={na.x}
              y1={na.y}
              x2={nb.x}
              y2={nb.y}
              stroke="rgba(59,130,246,0.15)"
              strokeWidth="1"
            />
            {/* Moving data packets along edges */}
            <motion.circle
              r="1"
              fill={BLUE}
              filter="url(#blueGlow)"
              initial={{ x: na.x, y: na.y, opacity: 0 }}
              animate={
                isPlaying
                  ? {
                      x: [na.x, nb.x, na.x],
                      y: [na.y, nb.y, na.y],
                      opacity: [0, 1, 0],
                    }
                  : { x: na.x, y: na.y, opacity: 0 }
              }
              transition={
                isPlaying
                  ? {
                      duration: 4 + (i % 3),
                      repeat: Infinity,
                      delay: i * 0.2,
                      ease: "linear",
                    }
                  : { duration: 0 }
              }
            />
          </g>
        );
      })}

      {/* ── Network Nodes ── */}
      {ENHANCED_NODES.map((node, i) => {
        // We'll make the nodes pulse when the scanner passes over them
        // Approximate timing based on the scanner array
        let pulseTimes = [0, 1];
        if (i === 0) pulseTimes = [0, 0.05, 0.95, 1, 1];
        else if (i === 2) pulseTimes = [0, 0.25, 0.3, 0.35, 1];
        else if (i === 5) pulseTimes = [0, 0.6, 0.65, 0.7, 1];

        const isScannedNode = i === 0 || i === 5 || i === 2;
        const tagX = node.x > 140 ? node.x - 44 : node.x + 8;
        const textX = node.x > 140 ? node.x - 26 : node.x + 26;

        return (
          <g key={`node-${i}`}>
            {/* Outer ring */}
            <circle
              cx={node.x}
              cy={node.y}
              r="6"
              stroke="rgba(59,130,246,0.2)"
              fill="transparent"
              strokeWidth="1"
            />

            {/* Active Highlight */}
            <motion.circle
              cx={node.x}
              cy={node.y}
              r="8"
              stroke={BLUE}
              fill="rgba(59,130,246,0.2)"
              strokeWidth="1.5"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={
                isPlaying && pulseTimes.length > 2
                  ? {
                      opacity: [0, 1, 0, 0, 0],
                      scale: [0.8, 1.2, 0.8, 0.8, 0.8],
                    }
                  : { opacity: 0 }
              }
              transition={
                isPlaying && pulseTimes.length > 2
                  ? { duration: 20, repeat: Infinity, times: pulseTimes }
                  : { duration: 0 }
              }
              filter="url(#blueGlow)"
            />
            {/* Core dot */}
            <circle
              cx={node.x}
              cy={node.y}
              r="2.5"
              fill={BLUE}
              filter="url(#blueGlow)"
            />

            {/* Interactive Tags popping up occasionally */}
            {isScannedNode && (
              <motion.g
                initial={{ opacity: 0, y: 10 }}
                animate={
                  isPlaying
                    ? { opacity: [0, 1, 0, 0, 0], y: [10, -10, -15, -15, -15] }
                    : { opacity: 0 }
                }
                transition={
                  isPlaying
                    ? { duration: 20, repeat: Infinity, times: pulseTimes }
                    : { duration: 0 }
                }
              >
                <rect
                  x={tagX}
                  y={node.y - 14}
                  width="36"
                  height="10"
                  rx="2"
                  fill="rgba(59,130,246,0.2)"
                  stroke={BLUE}
                  strokeWidth="0.5"
                />
                <text
                  x={textX}
                  y={node.y - 6}
                  textAnchor="middle"
                  fontSize="4"
                  fill={BLUE}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {i === 5 ? "MIXER ROOT" : "ANONYMIZED"}
                </text>
              </motion.g>
            )}
          </g>
        );
      })}

      {/* ── High-Tech Scanner Reticle ── */}
      <motion.g
        initial={{ x: 40, y: 30 }}
        animate={isPlaying ? { x: scannerX, y: scannerY } : { x: 40, y: 30 }}
        transition={
          isPlaying
            ? { duration: 20, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0 }
        }
      >
        {/* Reticle Outer Circle with dashed border */}
        <motion.circle
          cx="0"
          cy="0"
          r="24"
          stroke={BLUE}
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="10 6"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          filter="url(#blueGlow)"
        />

        {/* Reticle Inner Ring */}
        <motion.circle
          cx="0"
          cy="0"
          r="18"
          stroke={BLUE}
          strokeWidth="0.5"
          fill="rgba(59,130,246,0.05)"
          strokeDasharray="4 2"
          animate={{ rotate: -360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />

        {/* Crosshairs */}
        <line
          x1="-30"
          y1="0"
          x2="-10"
          y2="0"
          stroke={BLUE}
          strokeWidth="1"
          filter="url(#blueGlow)"
        />
        <line
          x1="10"
          y1="0"
          x2="30"
          y2="0"
          stroke={BLUE}
          strokeWidth="1"
          filter="url(#blueGlow)"
        />
        <line
          x1="0"
          y1="-30"
          x2="0"
          y2="-10"
          stroke={BLUE}
          strokeWidth="1"
          filter="url(#blueGlow)"
        />
        <line
          x1="0"
          y1="10"
          x2="0"
          y2="30"
          stroke={BLUE}
          strokeWidth="1"
          filter="url(#blueGlow)"
        />

        {/* Center Target Dot */}
        <circle cx="0" cy="0" r="2" fill="none" stroke={BLUE} strokeWidth="1" />

        {/* Radar Sweeping Beam */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
          {/* Invisible sizing frame to lock rotation perfectly to 0,0 */}
          <circle cx="0" cy="0" r="22" fill="none" />
          <path
            d="M 0 0 L 0 -22 A 22 22 0 0 1 22 0 Z"
            fill="url(#scannerBeam)"
          />
        </motion.g>

        {/* Scanner Labels */}
        <rect
          x="-26"
          y="-38"
          width="52"
          height="10"
          rx="1"
          fill="rgba(59,130,246,0.3)"
        />
        <text
          x="0"
          y="-30"
          textAnchor="middle"
          fontSize="4"
          fill="#fff"
          fontFamily="monospace"
          fontWeight="bold"
        >
          HEURISTIC SCAN_
        </text>
      </motion.g>
    </svg>
  );
}
