"use client";

import { motion } from "framer-motion";

// Blue accent palette (matches brand-500)
const BLUE = "#3b82f6";
const BLUE_LIGHT = "#60a5fa";
const BLUE_DIM = "rgba(59, 130, 246, 0.4)";
const CYAN = "#38bdf8";
const GREEN = "#10b981";

// ----------------------------------------------------------------------
// 01: AnimatedWallet (The "Ledger vs Reality" Node Split)
// Corrects the misconception of an "account balance" vs actual UTXOs
// Uses the premium node-based aesthetic of AnimatedPsbtFlow
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// 01: AnimatedWallet (The Smartphone Storyline)
// Demonstrates that a single "Balance" UI hides distinct physical UTXOs.
// Begins a coherent narrative involving a realistic user tool (smartphone app).
// ----------------------------------------------------------------------
export function AnimatedWallet({ isPlaying }: { isPlaying: boolean }) {
  // Phone fills the canvas - content area is generous
  const phoneW = 200;
  const phoneH = 230;
  const phoneX = 60; // (320-200)/2
  const phoneY = 5; // (240-230)/2
  const rx = 28;
  // Usable content area inside the phone (after bezel + notch)
  const cx = phoneX + 16; // content left
  const cw = phoneW - 32; // content width
  const midX = phoneX + phoneW / 2; // horizontal center = 160

  return (
    <svg
      width="320"
      height="240"
      viewBox="0 0 320 240"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="glow-blue" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="phone-glass" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e2430" stopOpacity="1" />
          <stop offset="100%" stopColor="#080a0e" stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* --- THE PHONE BODY --- */}
      <g>
        {/* Shadow */}
        <rect
          x={phoneX + 2}
          y={phoneY + 6}
          width={phoneW}
          height={phoneH}
          rx={rx}
          fill="#030406"
          opacity="0.6"
        />
        {/* Device Casing */}
        <rect
          x={phoneX}
          y={phoneY}
          width={phoneW}
          height={phoneH}
          rx={rx}
          fill="url(#phone-glass)"
          stroke="#3f3f46"
          strokeWidth="2"
        />
        {/* Inner Bezel */}
        <rect
          x={phoneX + 3}
          y={phoneY + 3}
          width={phoneW - 6}
          height={phoneH - 6}
          rx={rx - 3}
          fill="#030406"
        />
        {/* Camera Notch/Dynamic Island */}
        <rect
          x={midX - 28}
          y={phoneY + 10}
          width="56"
          height="14"
          rx="7"
          fill="#111"
        />
        <circle cx={midX + 16} cy={phoneY + 17} r="3.5" fill="#1a1a1a" />
        {/* Home Bar */}
        <rect
          x={midX - 22}
          y={phoneY + phoneH - 14}
          width="44"
          height="4"
          rx="2"
          fill="#3f3f46"
        />
      </g>

      {/* --- LAYER 1: The Raw UTXO Hardware (The Reality) --- */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={
          isPlaying
            ? {
                opacity: [0, 0, 1, 1, 0, 0],
              }
            : { opacity: 0 }
        }
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.3, 0.45, 0.7, 0.85, 1],
        }}
      >
        {/* Connection lines: each UTXO feeds upward into a merge point */}
        {/* From 0.50 (top center) straight up to merge dot */}
        <line
          x1={midX}
          y1={75}
          x2={midX}
          y2={60}
          stroke={BLUE}
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        {/* From 0.20 (bottom left) up and right to merge */}
        <path
          d={`M${midX - 42} 128 L${midX - 42} 60 L${midX - 4} 60`}
          fill="none"
          stroke={BLUE_LIGHT}
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        {/* From 0.10 (bottom right) up and left to merge */}
        <path
          d={`M${midX + 42} 128 L${midX + 42} 60 L${midX + 4} 60`}
          fill="none"
          stroke={CYAN}
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        {/* Merge point dot */}
        <circle cx={midX} cy={60} r="3" fill={BLUE} opacity="0.6" />
        {/* Result value at merge - just the number, bigger */}
        <text
          x={midX}
          y={52}
          textAnchor="middle"
          fill="#fff"
          fontSize="12"
          fontWeight="700"
          opacity="0.8"
        >
          0.80
        </text>

        {/* The 0.50 UTXO Block (Top Center) */}
        <g transform={`translate(${midX}, 95)`}>
          <rect
            x="-40"
            y="-18"
            width="80"
            height="36"
            rx="8"
            fill="#11141c"
            stroke={BLUE}
            strokeWidth="1.5"
            filter="url(#glow-blue)"
            opacity="0.4"
          />
          <rect
            x="-40"
            y="-18"
            width="80"
            height="36"
            rx="8"
            fill="none"
            stroke="#fff"
            strokeWidth="1"
            opacity="0.15"
          />
          <text
            x="0"
            y="2"
            textAnchor="middle"
            fill="#fff"
            fontSize="15"
            fontWeight="800"
          >
            0.50
          </text>
          <text
            x="0"
            y="12"
            textAnchor="middle"
            fill={BLUE_LIGHT}
            fontSize="7"
            fontFamily="monospace"
            letterSpacing="0.5"
          >
            UTXO_1
          </text>
        </g>

        {/* The 0.20 UTXO Block (Bottom Left) - aligned at y=145 */}
        <g transform={`translate(${midX - 42}, 145)`}>
          <rect
            x="-30"
            y="-15"
            width="60"
            height="30"
            rx="6"
            fill="#11141c"
            stroke={BLUE_LIGHT}
            strokeWidth="1"
            filter="url(#glow-blue)"
            opacity="0.3"
          />
          <text
            x="0"
            y="1"
            textAnchor="middle"
            fill="#fff"
            fontSize="12"
            fontWeight="bold"
          >
            0.20
          </text>
          <text
            x="0"
            y="10"
            textAnchor="middle"
            fill={BLUE_LIGHT}
            fontSize="6"
            fontFamily="monospace"
          >
            UTXO_2
          </text>
        </g>

        {/* The 0.10 UTXO Block (Bottom Right) - aligned at y=145 too */}
        <g transform={`translate(${midX + 42}, 145)`}>
          <rect
            x="-30"
            y="-15"
            width="60"
            height="30"
            rx="6"
            fill="#11141c"
            stroke={CYAN}
            strokeWidth="1"
            filter="url(#glow-blue)"
            opacity="0.3"
          />
          <text
            x="0"
            y="1"
            textAnchor="middle"
            fill="#fff"
            fontSize="12"
            fontWeight="bold"
          >
            0.10
          </text>
          <text
            x="0"
            y="10"
            textAnchor="middle"
            fill={CYAN}
            fontSize="6"
            fontFamily="monospace"
          >
            UTXO_3
          </text>
        </g>

        {/* Math Equation - consistent 2 decimal places */}
        <text
          x={midX}
          y="190"
          textAnchor="middle"
          fill={BLUE_LIGHT}
          fontSize="11"
          fontWeight="bold"
          opacity="0.7"
        >
          <tspan fill="#fff">0.50</tspan> + <tspan fill="#fff">0.20</tspan> +{" "}
          <tspan fill="#fff">0.10</tspan> = 0.80 BTC
        </text>
      </motion.g>

      {/* --- LAYER 2: The Phone App UI (The Illusion) --- */}
      <motion.g
        initial={{ opacity: 1 }}
        animate={
          isPlaying
            ? {
                opacity: [1, 1, 0, 0, 1, 1],
              }
            : { opacity: 1 }
        }
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.25, 0.4, 0.75, 0.9, 1],
        }}
      >
        {/* App Background (Covers inner device) */}
        <rect
          x={phoneX + 6}
          y={phoneY + 30}
          width={phoneW - 12}
          height={phoneH - 48}
          rx="4"
          fill="#080a0e"
        />

        {/* Header */}
        <circle
          cx={cx + 14}
          cy={phoneY + 52}
          r="14"
          fill={BLUE_DIM}
          stroke={BLUE}
          strokeWidth="1"
          opacity="0.8"
        />
        <text
          x={cx + 14}
          y={phoneY + 57}
          textAnchor="middle"
          fill="#fff"
          fontSize="13"
          fontWeight="bold"
        >
          ₿
        </text>
        <text
          x={cx + 36}
          y={phoneY + 57}
          fill="#e2e8f0"
          fontSize="13"
          fontWeight="600"
        >
          My Wallet
        </text>

        {/* The "Big Balance" */}
        <text
          x={midX}
          y={phoneY + 100}
          textAnchor="middle"
          fill="#f4f4f5"
          fontSize="30"
          fontWeight="800"
          letterSpacing="-1"
        >
          0.80{" "}
          <tspan fontSize="18" fill="#a1a1aa">
            BTC
          </tspan>
        </text>
        <text
          x={midX}
          y={phoneY + 116}
          textAnchor="middle"
          fill="#10b981"
          fontSize="11"
          fontWeight="600"
        >
          ~$800,000.00
        </text>

        {/* Action Buttons (Send / Receive) */}
        <rect
          x={cx}
          y={phoneY + 128}
          width={cw / 2 - 4}
          height={30}
          rx="15"
          fill="#1c202a"
        />
        {/* Send arrow icon ↗ */}
        <circle cx={cx + 14} cy={phoneY + 143} r="7" fill="#3f3f46" />
        <path
          d={`M${cx + 11} ${phoneY + 146} L${cx + 17} ${phoneY + 140} M${cx + 13} ${phoneY + 140} L${cx + 17} ${phoneY + 140} L${cx + 17} ${phoneY + 144}`}
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <text
          x={cx + cw / 4 + 6}
          y={phoneY + 147}
          textAnchor="middle"
          fill="#fff"
          fontSize="10"
          fontWeight="600"
        >
          Send
        </text>

        <rect
          x={cx + cw / 2 + 4}
          y={phoneY + 128}
          width={cw / 2 - 4}
          height={30}
          rx="15"
          fill="#3b82f6"
        />
        <text
          x={cx + (cw * 3) / 4 + 4}
          y={phoneY + 147}
          textAnchor="middle"
          fill="#fff"
          fontSize="10"
          fontWeight="600"
        >
          Receive
        </text>

        {/* Transaction History Mockup */}
        <rect
          x={cx}
          y={phoneY + 168}
          width={cw}
          height={40}
          rx="10"
          fill="#1c202a"
        />
        <text
          x={cx + 10}
          y={phoneY + 184}
          fill="#f4f4f5"
          fontSize="9"
          fontWeight="600"
        >
          Received Bitcoin
        </text>
        <text x={cx + 10} y={phoneY + 196} fill="#64748b" fontSize="8">
          Yesterday
        </text>
        <text
          x={cx + cw - 10}
          y={phoneY + 190}
          textAnchor="end"
          fill="#10b981"
          fontSize="11"
          fontWeight="600"
        >
          +0.50
        </text>
      </motion.g>

      {/* --- GLITCH / SCAN EFFECT --- */}
      <motion.g
        initial={{ y: 0, opacity: 0 }}
        animate={
          isPlaying
            ? {
                y: [0, 0, phoneH, phoneH, phoneH, phoneH],
                opacity: [0, 0, 1, 0, 0, 0],
              }
            : { y: 0, opacity: 0 }
        }
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
          times: [0, 0.25, 0.4, 0.45, 0.9, 1],
        }}
      >
        <line
          x1={phoneX}
          y1={phoneY}
          x2={phoneX + phoneW}
          y2={phoneY}
          stroke={CYAN}
          strokeWidth="2"
          filter="url(#glow-blue)"
        />
        <rect
          x={phoneX}
          y={phoneY - 20}
          width={phoneW}
          height={20}
          fill="url(#phone-glass)"
          opacity="0.5"
        />
      </motion.g>
    </svg>
  );
}

// ----------------------------------------------------------------------
// 02: AnimatedChange (The Cash Register)
// Shows a whole UTXO entering a transaction node, splitting into
// Payment (0.30 → right to recipient) and Change (0.20 → back to you).
// The change visually returns to the left side to teach the concept.
// ----------------------------------------------------------------------
export function AnimatedChange({ isPlaying }: { isPlaying: boolean }) {
  const W = 320;
  const H = 240;
  const midX = W / 2;

  // Vertical layout: input row at top area, change return row below
  const inputY = 80; // input row
  const changeRetY = 175; // change return row (below TX node)

  // Key positions
  const walletX = 65; // left: your wallet area
  const txX = midX; // center: transaction node
  const txY = 105; // TX node centered between input and change rows
  const payX = 270; // right: payment destination
  const payY = 80; // same height as input

  // Durations
  const dur = 7;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="glow-tx" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="glow-green" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* --- STATIC INFRASTRUCTURE --- */}

      {/* Left label: YOUR WALLET */}
      <text
        x={walletX}
        y={inputY - 30}
        textAnchor="middle"
        fill="#64748b"
        fontSize="8"
        letterSpacing="1"
      >
        YOUR WALLET
      </text>

      {/* Right label: RECIPIENT */}
      <text
        x={payX}
        y={payY - 30}
        textAnchor="middle"
        fill="#64748b"
        fontSize="8"
        letterSpacing="1"
      >
        RECIPIENT
      </text>

      {/* Connection line: Input → TX node (horizontal then down to TX) */}
      <path
        d={`M${walletX + 42} ${inputY} L${txX - 10} ${inputY} L${txX - 10} ${txY - 24}`}
        fill="none"
        stroke="#1e2430"
        strokeWidth="2"
        strokeDasharray="4 4"
      />

      {/* Connection line: TX node → Payment (right, up to payY) */}
      <path
        d={`M${txX + 10} ${txY - 24} L${txX + 10} ${payY} L${payX - 42} ${payY}`}
        fill="none"
        stroke="#1e2430"
        strokeWidth="2"
        strokeDasharray="4 4"
      />

      {/* Connection line: TX node → Change (down, then back left) */}
      <path
        d={`M${txX} ${txY + 24} L${txX} ${changeRetY} L${walletX + 42} ${changeRetY}`}
        fill="none"
        stroke="#1e2430"
        strokeWidth="2"
        strokeDasharray="4 4"
      />

      {/* Return arrow indicator */}
      <text x={walletX + 50} y={changeRetY - 10} fill="#3f3f46" fontSize="8">
        return
      </text>

      {/* Central TX Processing Node (always visible) */}
      <g>
        <rect
          x={txX - 26}
          y={txY - 22}
          width="52"
          height="44"
          rx="12"
          fill="#11141c"
          stroke="#2a303c"
          strokeWidth="1.5"
        />
        <text
          x={txX}
          y={txY - 4}
          textAnchor="middle"
          fill="#64748b"
          fontSize="9"
          fontWeight="700"
          letterSpacing="0.5"
        >
          TX
        </text>
        <text
          x={txX}
          y={txY + 8}
          textAnchor="middle"
          fill="#3f3f46"
          fontSize="7"
          fontFamily="monospace"
        >
          NODE
        </text>
      </g>

      {/* --- PHASE 1: The Input UTXO slides from left into the TX node --- */}
      <motion.g
        initial={{ x: 0, opacity: 0 }}
        animate={
          isPlaying
            ? {
                x: [0, 0, txX - walletX - 45, txX - walletX - 45, 0, 0],
                opacity: [0, 1, 1, 0, 0, 0],
                scale: [1, 1, 0.85, 0, 0, 0],
              }
            : { x: 0, opacity: 0 }
        }
        transition={{
          duration: dur,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.05, 0.25, 0.35, 0.36, 1],
        }}
      >
        {/* The 0.50 UTXO block */}
        <rect
          x={walletX - 38}
          y={inputY - 18}
          width="76"
          height="36"
          rx="8"
          fill="#11141c"
          stroke={BLUE}
          strokeWidth="1.5"
          filter="url(#glow-tx)"
          opacity="0.5"
        />
        <rect
          x={walletX - 38}
          y={inputY - 18}
          width="76"
          height="36"
          rx="8"
          fill="none"
          stroke="#fff"
          strokeWidth="0.5"
          opacity="0.15"
        />
        <text
          x={walletX}
          y={inputY + 1}
          textAnchor="middle"
          fill="#fff"
          fontSize="15"
          fontWeight="800"
        >
          0.50
        </text>
        <text
          x={walletX}
          y={inputY + 12}
          textAnchor="middle"
          fill={BLUE_LIGHT}
          fontSize="7"
          fontFamily="monospace"
        >
          UTXO
        </text>
      </motion.g>

      {/* --- TX NODE GLOW: pulses when processing --- */}
      <motion.rect
        x={txX - 26}
        y={txY - 22}
        width="52"
        height="44"
        rx="12"
        fill="none"
        stroke={BLUE}
        initial={{ strokeWidth: 0, opacity: 0 }}
        animate={
          isPlaying
            ? {
                strokeWidth: [0, 0, 2, 2, 0, 0],
                opacity: [0, 0, 0.6, 0.6, 0, 0],
              }
            : { strokeWidth: 0, opacity: 0 }
        }
        transition={{
          duration: dur,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.25, 0.35, 0.55, 0.6, 1],
        }}
      />

      {/* --- PHASE 2a: Payment output (0.30) ejects to the right → RECIPIENT --- */}
      <motion.g
        initial={{ x: txX, y: txY, opacity: 0, scale: 0.3 }}
        animate={
          isPlaying
            ? {
                x: [txX, txX, payX, payX, payX, payX],
                y: [txY, txY, payY, payY, payY, payY],
                opacity: [0, 0, 1, 1, 0, 0],
                scale: [0.3, 0.3, 1, 1, 1, 0],
              }
            : { x: txX, y: txY, opacity: 0, scale: 0.3 }
        }
        transition={{
          duration: dur,
          repeat: Infinity,
          ease: "easeOut",
          times: [0, 0.35, 0.55, 0.75, 0.85, 1],
        }}
      >
        {/* Payment block */}
        <rect
          x="-36"
          y="-16"
          width="72"
          height="32"
          rx="8"
          fill="#11141c"
          stroke={GREEN}
          strokeWidth="1.5"
          filter="url(#glow-green)"
          opacity="0.5"
        />
        <rect
          x="-36"
          y="-16"
          width="72"
          height="32"
          rx="8"
          fill="none"
          stroke="#fff"
          strokeWidth="0.5"
          opacity="0.1"
        />
        <text
          x="0"
          y="2"
          textAnchor="middle"
          fill="#fff"
          fontSize="14"
          fontWeight="800"
        >
          0.30
        </text>
        <text
          x="0"
          y="11"
          textAnchor="middle"
          fill={GREEN}
          fontSize="6"
          fontFamily="monospace"
          letterSpacing="0.5"
        >
          PAYMENT
        </text>
      </motion.g>

      {/* --- PHASE 2b: Change output (0.20) curves back to YOUR WALLET --- */}
      <motion.g
        initial={{ x: txX, y: txY, opacity: 0, scale: 0.3 }}
        animate={
          isPlaying
            ? {
                x: [txX, txX, walletX, walletX, walletX, walletX],
                y: [txY, txY, changeRetY, changeRetY, changeRetY, changeRetY],
                opacity: [0, 0, 1, 1, 0, 0],
                scale: [0.3, 0.3, 1, 1, 1, 0],
              }
            : { x: txX, y: txY, opacity: 0, scale: 0.3 }
        }
        transition={{
          duration: dur,
          repeat: Infinity,
          ease: "easeOut",
          times: [0, 0.38, 0.6, 0.75, 0.85, 1],
        }}
      >
        {/* Change block */}
        <rect
          x="-36"
          y="-16"
          width="72"
          height="32"
          rx="8"
          fill="#11141c"
          stroke={CYAN}
          strokeWidth="1.5"
          filter="url(#glow-tx)"
          opacity="0.4"
        />
        <rect
          x="-36"
          y="-16"
          width="72"
          height="32"
          rx="8"
          fill="none"
          stroke="#fff"
          strokeWidth="0.5"
          opacity="0.1"
        />
        <text
          x="0"
          y="2"
          textAnchor="middle"
          fill="#fff"
          fontSize="14"
          fontWeight="800"
        >
          0.20
        </text>
        <text
          x="0"
          y="11"
          textAnchor="middle"
          fill={CYAN}
          fontSize="6"
          fontFamily="monospace"
          letterSpacing="0.5"
        >
          CHANGE
        </text>
      </motion.g>

      {/* --- Equation at the bottom --- */}
      <motion.text
        x={midX}
        y={H - 12}
        textAnchor="middle"
        fill="#64748b"
        fontSize="10"
        fontWeight="600"
        initial={{ opacity: 0 }}
        animate={
          isPlaying
            ? {
                opacity: [0, 0, 1, 1, 0, 0],
              }
            : { opacity: 0 }
        }
        transition={{
          duration: dur,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.5, 0.6, 0.78, 0.88, 1],
        }}
      >
        <tspan fill={BLUE_LIGHT}>0.50</tspan> → <tspan fill={GREEN}>0.30</tspan>{" "}
        + <tspan fill={CYAN}>0.20</tspan>
      </motion.text>

      {/* --- Animated data pulse along the input line --- */}
      <motion.circle
        r="3"
        fill={BLUE}
        initial={{ cx: walletX + 42, cy: inputY, opacity: 0 }}
        animate={
          isPlaying
            ? {
                cx: [walletX + 42, txX - 10, txX - 10],
                cy: [inputY, inputY, inputY],
                opacity: [0, 1, 0],
              }
            : { cx: walletX + 42, cy: inputY, opacity: 0 }
        }
        transition={{
          duration: dur * 0.25,
          repeat: Infinity,
          ease: "linear",
          repeatDelay: dur * 0.75,
        }}
      />
    </svg>
  );
}

// ----------------------------------------------------------------------
// 03: AnimatedFee (The Weighing Station)
// Side-by-side comparison. Both send 0.30 BTC.
// Left: 1 input → small data size → low fee
// Right: 3 inputs → large data size → high fee
// Teaches that Fee = Data Size (vBytes) × Fee Rate, NOT % of amount.
// ----------------------------------------------------------------------
export function AnimatedFee({ isPlaying }: { isPlaying: boolean }) {
  const W = 320;
  const H = 240;

  // Layout
  const leftX = 85;
  const rightX = 235;
  const midY = 110;
  const botY = 190;

  const dur = 8; // Longer cycle to let people read it

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="glow-fee" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* --- BACKGROUND DIVIDER --- */}
      <line
        x1={W / 2}
        y1={20}
        x2={W / 2}
        y2={H - 20}
        stroke="#1e2430"
        strokeWidth="2"
        strokeDasharray="4 4"
      />
      <text
        x={W / 2}
        y={30}
        fill="#3f3f46"
        fontSize="10"
        textAnchor="middle"
        letterSpacing="2"
        fontWeight="700"
      >
        VS
      </text>

      {/* ========================================== */}
      {/* LEFT SIDE: 1 INPUT TRANSACTION           */}
      {/* ========================================== */}

      {/* Title */}
      <text
        x={leftX}
        y={25}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize="10"
        fontWeight="600"
      >
        1 INPUT
      </text>

      {/* Value Sent (Constant) */}
      <text x={leftX} y={45} textAnchor="middle" fill="#64748b" fontSize="8">
        SENDING
      </text>
      <text
        x={leftX}
        y={60}
        textAnchor="middle"
        fill="#fff"
        fontSize="14"
        fontWeight="800"
      >
        0.30{" "}
        <tspan fill="#64748b" fontSize="10">
          BTC
        </tspan>
      </text>

      {/* "Data Block" - visualizes the vByte size */}
      <g transform={`translate(${leftX - 25}, ${midY - 20})`}>
        <text x="25" y="-8" textAnchor="middle" fill="#64748b" fontSize="8">
          DATA SIZE
        </text>

        {/* Animated growing data block */}
        <motion.rect
          x="0"
          y="0"
          width="50"
          height="40"
          rx="4"
          fill="#11141c"
          stroke={BLUE}
          strokeWidth="1.5"
          initial={{ height: 0, opacity: 0 }}
          animate={
            isPlaying
              ? {
                  height: [0, 40, 40, 40, 0, 0],
                  opacity: [0, 1, 1, 1, 0, 0],
                }
              : { height: 0, opacity: 0 }
          }
          transition={{
            duration: dur,
            repeat: Infinity,
            times: [0, 0.15, 0.8, 0.9, 0.95, 1],
            ease: "easeOut",
          }}
        />

        {/* Inner lines showing data */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={isPlaying ? { opacity: [0, 1, 1, 1, 0, 0] } : { opacity: 0 }}
          transition={{
            duration: dur,
            repeat: Infinity,
            times: [0, 0.2, 0.8, 0.9, 0.95, 1],
          }}
        >
          <line
            x1="10"
            y1="12"
            x2="40"
            y2="12"
            stroke={BLUE_LIGHT}
            strokeWidth="2"
            opacity="0.5"
            strokeLinecap="round"
          />
          <line
            x1="10"
            y1="20"
            x2="30"
            y2="20"
            stroke={BLUE_LIGHT}
            strokeWidth="2"
            opacity="0.5"
            strokeLinecap="round"
          />
          <line
            x1="10"
            y1="28"
            x2="35"
            y2="28"
            stroke={BLUE_LIGHT}
            strokeWidth="2"
            opacity="0.5"
            strokeLinecap="round"
          />
          <text x="55" y="24" fill={BLUE_LIGHT} fontSize="10" fontWeight="bold">
            190 vB
          </text>
        </motion.g>
      </g>

      {/* The Fee generated */}
      <g transform={`translate(${leftX}, ${botY})`}>
        <line
          x1="0"
          y1="-30"
          x2="0"
          y2="-15"
          stroke="#1e2430"
          strokeWidth="2"
        />
        <text x="0" y="-2" textAnchor="middle" fill="#64748b" fontSize="8">
          MINER FEE (10 sat/vB)
        </text>

        <motion.g
          initial={{ y: 10, opacity: 0 }}
          animate={
            isPlaying
              ? {
                  y: [10, 0, 0, 0, 10, 10],
                  opacity: [0, 1, 1, 1, 0, 0],
                }
              : { y: 10, opacity: 0 }
          }
          transition={{
            duration: dur,
            repeat: Infinity,
            times: [0, 0.25, 0.8, 0.9, 0.95, 1],
            ease: "backOut",
          }}
        >
          <rect
            x="-35"
            y="6"
            width="70"
            height="24"
            rx="12"
            fill="#11141c"
            stroke={CYAN}
            strokeWidth="1.5"
            filter="url(#glow-fee)"
          />
          <text
            x="0"
            y="22"
            textAnchor="middle"
            fill="#fff"
            fontSize="12"
            fontWeight="bold"
          >
            1,900{" "}
            <tspan fill={CYAN} fontSize="8">
              sats
            </tspan>
          </text>
        </motion.g>
      </g>

      {/* ========================================== */}
      {/* RIGHT SIDE: 3 INPUT TRANSACTION          */}
      {/* ========================================== */}

      {/* Title */}
      <text
        x={rightX}
        y={25}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize="10"
        fontWeight="600"
      >
        3 INPUTS
      </text>

      {/* Value Sent (Constant - same as left) */}
      <text x={rightX} y={45} textAnchor="middle" fill="#64748b" fontSize="8">
        SENDING
      </text>
      <text
        x={rightX}
        y={60}
        textAnchor="middle"
        fill="#fff"
        fontSize="14"
        fontWeight="800"
      >
        0.30{" "}
        <tspan fill="#64748b" fontSize="10">
          BTC
        </tspan>
      </text>

      {/* "Data Block" - visualizes the much larger vByte size */}
      <g transform={`translate(${rightX - 35}, ${midY - 20})`}>
        <text x="35" y="-8" textAnchor="middle" fill="#64748b" fontSize="8">
          DATA SIZE
        </text>

        {/* Animated growing data block (much taller) */}
        <motion.rect
          x="0"
          y="0"
          width="70"
          height="70"
          rx="4"
          fill="#11141c"
          stroke={BLUE}
          strokeWidth="1.5"
          initial={{ height: 0, opacity: 0 }}
          animate={
            isPlaying
              ? {
                  height: [0, 0, 70, 70, 70, 0, 0],
                  opacity: [0, 0, 1, 1, 1, 0, 0],
                }
              : { height: 0, opacity: 0 }
          }
          transition={{
            duration: dur,
            repeat: Infinity,
            times: [0, 0.1, 0.3, 0.8, 0.9, 0.95, 1],
            ease: "easeOut",
          }}
        />

        {/* Inner lines showing lots of input data */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={
            isPlaying ? { opacity: [0, 0, 1, 1, 1, 0, 0] } : { opacity: 0 }
          }
          transition={{
            duration: dur,
            repeat: Infinity,
            times: [0, 0.2, 0.35, 0.8, 0.9, 0.95, 1],
          }}
        >
          {/* Input 1 data */}
          <line
            x1="10"
            y1="12"
            x2="60"
            y2="12"
            stroke={BLUE_LIGHT}
            strokeWidth="2"
            opacity="0.5"
            strokeLinecap="round"
          />
          <line
            x1="10"
            y1="20"
            x2="45"
            y2="20"
            stroke={BLUE_LIGHT}
            strokeWidth="2"
            opacity="0.5"
            strokeLinecap="round"
          />
          {/* Input 2 data */}
          <line
            x1="10"
            y1="32"
            x2="55"
            y2="32"
            stroke={BLUE_LIGHT}
            strokeWidth="2"
            opacity="0.5"
            strokeLinecap="round"
          />
          <line
            x1="10"
            y1="40"
            x2="35"
            y2="40"
            stroke={BLUE_LIGHT}
            strokeWidth="2"
            opacity="0.5"
            strokeLinecap="round"
          />
          {/* Input 3 data */}
          <line
            x1="10"
            y1="52"
            x2="50"
            y2="52"
            stroke={BLUE_LIGHT}
            strokeWidth="2"
            opacity="0.5"
            strokeLinecap="round"
          />
          <line
            x1="10"
            y1="60"
            x2="40"
            y2="60"
            stroke={BLUE_LIGHT}
            strokeWidth="2"
            opacity="0.5"
            strokeLinecap="round"
          />

          <text x="75" y="40" fill={BLUE_LIGHT} fontSize="10" fontWeight="bold">
            486 vB
          </text>
        </motion.g>
      </g>

      {/* The Fee generated (much larger) */}
      <g transform={`translate(${rightX}, ${botY})`}>
        <line
          x1="0"
          y1="-30"
          x2="0"
          y2="-15"
          stroke="#1e2430"
          strokeWidth="2"
        />
        <text x="0" y="-2" textAnchor="middle" fill="#64748b" fontSize="8">
          MINER FEE (10 sat/vB)
        </text>

        <motion.g
          initial={{ y: 10, opacity: 0, scale: 0.9 }}
          animate={
            isPlaying
              ? {
                  y: [10, 10, 0, 0, 0, 10, 10],
                  opacity: [0, 0, 1, 1, 1, 0, 0],
                  scale: [0.9, 0.9, 1.1, 1, 1, 0.9, 0.9], // Pops larger to emphasize the high price
                }
              : { y: 10, opacity: 0, scale: 0.9 }
          }
          transition={{
            duration: dur,
            repeat: Infinity,
            times: [0, 0.35, 0.45, 0.5, 0.8, 0.9, 1],
            ease: "backOut",
          }}
        >
          <rect
            x="-40"
            y="4"
            width="80"
            height="28"
            rx="14"
            fill="#11141c"
            stroke={CYAN}
            strokeWidth="2"
            filter="url(#glow-fee)"
          />
          <text
            x="0"
            y="22"
            textAnchor="middle"
            fill="#fff"
            fontSize="14"
            fontWeight="900"
          >
            4,860{" "}
            <tspan fill={CYAN} fontSize="8">
              sats
            </tspan>
          </text>
        </motion.g>
      </g>
    </svg>
  );
}

// ----------------------------------------------------------------------
// 04: AnimatedDust (The Heavy Toll)
// A tiny UTXO travels up a network lane toward an imposing toll booth,
// gets laser-scanned, fails the math check, and is knocked back as
// "UNSPENDABLE" - stuck in the wallet forever.
// ----------------------------------------------------------------------
export function AnimatedDust({ isPlaying }: { isPlaying: boolean }) {
  const W = 320;
  const H = 240;
  const cx = W / 2;

  // Vertical layout
  const walletY = 195; // UTXO resting position (bottom)
  const tollY = 65; // Toll booth center
  const approachY = 115; // Where UTXO stops before toll (mid-point)
  const dur = 8; // Full animation cycle - slow and cinematic

  // Colors
  const RED = "#ef4444";
  const RED_DARK = "#7f1d1d";
  const RED_LIGHT = "#fca5a5";
  const AMBER = "#f59e0b";

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="glow-dust" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="glow-scan" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="lane-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={BLUE} stopOpacity="0.15" />
          <stop offset="100%" stopColor={BLUE} stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="scan-beam" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={CYAN} stopOpacity="0" />
          <stop offset="40%" stopColor={CYAN} stopOpacity="0.8" />
          <stop offset="60%" stopColor={CYAN} stopOpacity="0.8" />
          <stop offset="100%" stopColor={CYAN} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* --- BACKGROUND GRID --- */}
      <pattern
        id="grid-dust"
        width="40"
        height="40"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M 40 0 L 0 0 0 40"
          fill="none"
          stroke="#1e2430"
          strokeWidth="0.5"
          opacity="0.3"
        />
      </pattern>
      <rect width="100%" height="100%" fill="url(#grid-dust)" />

      {/* ========================================== */}
      {/* THE NETWORK LANE (Dual-line path)          */}
      {/* ========================================== */}

      {/* Lane fill */}
      <rect
        x={cx - 22}
        y={tollY + 28}
        width="44"
        height={walletY - tollY - 30}
        rx="4"
        fill="url(#lane-grad)"
      />
      {/* Left rail */}
      <line
        x1={cx - 22}
        y1={walletY - 5}
        x2={cx - 22}
        y2={tollY + 30}
        stroke="#1e2430"
        strokeWidth="1.5"
        strokeDasharray="6 4"
      />
      {/* Right rail */}
      <line
        x1={cx + 22}
        y1={walletY - 5}
        x2={cx + 22}
        y2={tollY + 30}
        stroke="#1e2430"
        strokeWidth="1.5"
        strokeDasharray="6 4"
      />
      {/* Center dashes */}
      <line
        x1={cx}
        y1={walletY - 5}
        x2={cx}
        y2={tollY + 30}
        stroke="#1e2430"
        strokeWidth="1"
        strokeDasharray="3 8"
        opacity="0.5"
      />

      {/* Small data pulses traveling up the lane */}
      {[0, 0.33, 0.66].map((delay, i) => (
        <motion.circle
          key={i}
          cx={cx + (i - 1) * 8}
          r="1.5"
          fill={BLUE_LIGHT}
          opacity="0.6"
          initial={{ cy: walletY - 10 }}
          animate={
            isPlaying
              ? { cy: [walletY - 10, tollY + 35], opacity: [0.6, 0] }
              : { cy: walletY - 10 }
          }
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: delay * 2,
            ease: "linear",
          }}
        />
      ))}

      {/* ========================================== */}
      {/* THE TOLL BOOTH (Imposing Checkpoint)       */}
      {/* ========================================== */}

      <g transform={`translate(${cx}, ${tollY})`}>
        {/* Main booth body - wider and more imposing */}
        <rect
          x="-70"
          y="-28"
          width="140"
          height="48"
          rx="6"
          fill="#0b0f19"
          stroke="#334155"
          strokeWidth="1.5"
        />
        {/* Inner panel */}
        <rect x="-64" y="-24" width="128" height="40" rx="4" fill="#080a0e" />

        {/* Indicator lights - horizontal row below fee amount, no text overlap */}
        <circle cx="-10" cy="14" r="2.5" fill="#1e2430" />
        <circle cx="0" cy="14" r="2.5" fill="#1e2430" />
        <circle cx="10" cy="14" r="2.5" fill="#1e2430" />
        {/* First light pulses amber, then red */}
        <motion.circle
          cx="-10"
          cy="14"
          r="2.5"
          initial={{ fill: "#1e2430" }}
          animate={
            isPlaying
              ? {
                  fill: [
                    "#1e2430",
                    "#1e2430",
                    AMBER,
                    AMBER,
                    RED,
                    RED,
                    "#1e2430",
                  ],
                }
              : { fill: "#1e2430" }
          }
          transition={{
            duration: dur,
            repeat: Infinity,
            times: [0, 0.2, 0.25, 0.38, 0.42, 0.48, 0.52],
          }}
        />
        {/* Third light goes red on rejection */}
        <motion.circle
          cx="10"
          cy="14"
          r="2.5"
          initial={{ fill: "#1e2430" }}
          animate={
            isPlaying
              ? {
                  fill: ["#1e2430", "#1e2430", RED, RED, "#1e2430"],
                }
              : { fill: "#1e2430" }
          }
          transition={{
            duration: dur,
            repeat: Infinity,
            times: [0, 0.4, 0.42, 0.48, 0.52],
          }}
        />

        {/* Fee label */}
        <text
          x="0"
          y="-10"
          textAnchor="middle"
          fill="#64748b"
          fontSize="7"
          fontWeight="bold"
          letterSpacing="1.5"
        >
          NETWORK FEE REQUIRED
        </text>

        {/* Fee amount - pulses subtly */}
        <motion.g
          initial={{ opacity: 0.9 }}
          animate={isPlaying ? { opacity: [0.9, 1, 0.9] } : { opacity: 0.9 }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <text
            x="0"
            y="4"
            textAnchor="middle"
            fill="#fff"
            fontSize="16"
            fontWeight="800"
            letterSpacing="-0.5"
          >
            1,500
          </text>
          <text
            x="34"
            y="4"
            textAnchor="middle"
            fill="#475569"
            fontSize="9"
            fontWeight="600"
          >
            sats
          </text>
        </motion.g>
      </g>

      {/* Gate barrier arms (left and right of toll) */}
      {/* Left arm */}
      <motion.line
        x1={cx - 70}
        y1={tollY + 20}
        x2={cx - 28}
        y2={tollY + 20}
        stroke="#475569"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ opacity: 1 }}
        animate={
          isPlaying
            ? {
                stroke: ["#475569", "#475569", RED, RED, "#475569"],
                strokeWidth: [3, 3, 4, 4, 3],
              }
            : { stroke: "#475569" }
        }
        transition={{
          duration: dur,
          repeat: Infinity,
          times: [0, 0.4, 0.42, 0.48, 0.52],
        }}
      />
      {/* Right arm */}
      <motion.line
        x1={cx + 28}
        y1={tollY + 20}
        x2={cx + 70}
        y2={tollY + 20}
        stroke="#475569"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ opacity: 1 }}
        animate={
          isPlaying
            ? {
                stroke: ["#475569", "#475569", RED, RED, "#475569"],
                strokeWidth: [3, 3, 4, 4, 3],
              }
            : { stroke: "#475569" }
        }
        transition={{
          duration: dur,
          repeat: Infinity,
          times: [0, 0.4, 0.42, 0.48, 0.52],
        }}
      />
      {/* Gate barrier end knobs */}
      <circle cx={cx - 70} cy={tollY + 20} r="3" fill="#334155" />
      <circle cx={cx + 70} cy={tollY + 20} r="3" fill="#334155" />

      {/* ========================================== */}
      {/* THE UTXO NODE (Moves up and gets rejected) */}
      {/* ========================================== */}

      {/* Wallet label (stays at bottom) */}
      <text
        x={cx}
        y={walletY + 25}
        textAnchor="middle"
        fill="#475569"
        fontSize="9"
        fontWeight="600"
        letterSpacing="1.5"
      >
        YOUR WALLET
      </text>

      {/* The Moving UTXO */}
      <motion.g
        initial={{ y: 0 }}
        animate={
          isPlaying
            ? {
                // Rests → slides up to approach point → pauses → knocked back down → rests
                y: [
                  0,
                  0,
                  -(walletY - approachY),
                  -(walletY - approachY),
                  -(walletY - approachY),
                  8,
                  0,
                  0,
                ],
              }
            : { y: 0 }
        }
        transition={{
          duration: dur,
          repeat: Infinity,
          times: [0, 0.05, 0.2, 0.35, 0.48, 0.55, 0.6, 1],
          ease: "easeInOut",
        }}
      >
        <g transform={`translate(${cx}, ${walletY})`}>
          {/* UTXO box - dims after rejection */}
          <motion.rect
            x="-32"
            y="-17"
            width="64"
            height="34"
            rx="8"
            fill="#11141c"
            strokeWidth="1.5"
            initial={{ stroke: BLUE }}
            animate={
              isPlaying
                ? {
                    stroke: [
                      BLUE,
                      BLUE,
                      BLUE,
                      BLUE,
                      RED,
                      "#3f3f46",
                      "#3f3f46",
                      BLUE,
                    ],
                    opacity: [1, 1, 1, 1, 1, 0.5, 0.5, 1],
                  }
                : { stroke: BLUE }
            }
            transition={{
              duration: dur,
              repeat: Infinity,
              times: [0, 0.2, 0.35, 0.45, 0.5, 0.6, 0.85, 1],
            }}
          />
          {/* Glow ring */}
          <motion.rect
            x="-32"
            y="-17"
            width="64"
            height="34"
            rx="8"
            fill="none"
            strokeWidth="1"
            initial={{ stroke: BLUE, opacity: 0.2 }}
            animate={
              isPlaying
                ? {
                    stroke: [BLUE, BLUE, BLUE, RED, "#3f3f46", BLUE],
                    opacity: [0.2, 0.3, 0.3, 0.4, 0.1, 0.2],
                  }
                : { stroke: BLUE, opacity: 0.2 }
            }
            transition={{
              duration: dur,
              repeat: Infinity,
              times: [0, 0.2, 0.45, 0.5, 0.6, 1],
            }}
            filter="url(#glow-dust)"
          />
          {/* Value */}
          <motion.text
            x="0"
            y="-2"
            textAnchor="middle"
            fontSize="14"
            fontWeight="800"
            initial={{ fill: "#fff" }}
            animate={
              isPlaying
                ? {
                    fill: [
                      "#fff",
                      "#fff",
                      "#fff",
                      "#fff",
                      "#64748b",
                      "#64748b",
                      "#fff",
                    ],
                  }
                : { fill: "#fff" }
            }
            transition={{
              duration: dur,
              repeat: Infinity,
              times: [0, 0.45, 0.5, 0.55, 0.6, 0.85, 1],
            }}
          >
            400
          </motion.text>
          <motion.text
            x="0"
            y="10"
            textAnchor="middle"
            fontSize="7"
            fontFamily="monospace"
            fontWeight="600"
            initial={{ fill: BLUE_LIGHT }}
            animate={
              isPlaying
                ? {
                    fill: [
                      BLUE_LIGHT,
                      BLUE_LIGHT,
                      BLUE_LIGHT,
                      "#64748b",
                      "#64748b",
                      BLUE_LIGHT,
                    ],
                  }
                : { fill: BLUE_LIGHT }
            }
            transition={{
              duration: dur,
              repeat: Infinity,
              times: [0, 0.45, 0.55, 0.6, 0.85, 1],
            }}
          >
            sats
          </motion.text>
        </g>
      </motion.g>

      {/* ========================================== */}
      {/* ANIMATION SEQUENCE OVERLAYS                */}
      {/* ========================================== */}

      {/* 1. LASER SCAN - horizontal sweep across UTXO at approach point */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={
          isPlaying
            ? {
                opacity: [0, 0, 1, 1, 0, 0],
              }
            : { opacity: 0 }
        }
        transition={{
          duration: dur,
          repeat: Infinity,
          times: [0, 0.22, 0.25, 0.34, 0.38, 1],
        }}
      >
        {/* Scan line sweeps vertically */}
        <motion.rect
          x={cx - 40}
          width="80"
          height="3"
          rx="1.5"
          fill="url(#scan-beam)"
          filter="url(#glow-scan)"
          initial={{ y: approachY - 20 }}
          animate={
            isPlaying
              ? {
                  y: [
                    approachY - 20,
                    approachY - 20,
                    approachY + 20,
                    approachY + 20,
                  ],
                }
              : { y: approachY - 20 }
          }
          transition={{
            duration: dur,
            repeat: Infinity,
            times: [0, 0.25, 0.34, 1],
            ease: "easeInOut",
          }}
        />
        {/* Scan field glow area */}
        <rect
          x={cx - 36}
          y={approachY - 20}
          width="72"
          height="40"
          rx="4"
          fill={CYAN}
          opacity="0.04"
        />
      </motion.g>

      {/* 2. CONNECTION BEAMS - laser lines from UTXO to Toll during scan */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={
          isPlaying
            ? {
                opacity: [0, 0, 0.8, 0.8, 0, 0],
              }
            : { opacity: 0 }
        }
        transition={{
          duration: dur,
          repeat: Infinity,
          times: [0, 0.28, 0.32, 0.4, 0.45, 1],
        }}
      >
        {/* Left beam */}
        <line
          x1={cx - 30}
          y1={approachY}
          x2={cx - 50}
          y2={tollY + 20}
          stroke={CYAN}
          strokeWidth="1"
          opacity="0.6"
          strokeDasharray="3 3"
        />
        {/* Right beam */}
        <line
          x1={cx + 30}
          y1={approachY}
          x2={cx + 50}
          y2={tollY + 20}
          stroke={CYAN}
          strokeWidth="1"
          opacity="0.6"
          strokeDasharray="3 3"
        />
        {/* Center beam */}
        <line
          x1={cx}
          y1={approachY - 17}
          x2={cx}
          y2={tollY + 20}
          stroke={CYAN}
          strokeWidth="1.5"
          opacity="0.4"
          filter="url(#glow-scan)"
        />
      </motion.g>

      {/* 3. MATH COMPARISON PILL - color-coded, dramatic */}
      <motion.g
        initial={{ scale: 0, opacity: 0 }}
        animate={
          isPlaying
            ? {
                scale: [0, 0, 1.15, 1, 1, 1, 0],
                opacity: [0, 0, 1, 1, 1, 1, 0],
              }
            : { scale: 0, opacity: 0 }
        }
        transition={{
          duration: dur,
          repeat: Infinity,
          times: [0, 0.35, 0.39, 0.42, 0.65, 0.72, 0.78],
          ease: "backOut",
        }}
      >
        {/* Pill background */}
        <rect
          x={cx - 80}
          y={tollY + 28}
          width="160"
          height="26"
          rx="13"
          fill="#11141c"
          stroke="#475569"
          strokeWidth="1"
        />
        {/* Math: 400 (red) < 1,500 (white) */}
        <text
          x={cx}
          y={tollY + 45}
          textAnchor="middle"
          fill="#fff"
          fontSize="11"
          fontWeight="bold"
          letterSpacing="0.5"
        >
          <tspan fill="#fff">400</tspan>
          <tspan fill="#475569"> sats</tspan>
          <tspan fill="#64748b"> {"<"} </tspan>
          <tspan fill="#fff">1,500</tspan>
          <tspan fill="#475569"> sats</tspan>
        </text>
      </motion.g>

      {/* 4. RED FLASH on the toll gate barrier */}
      <motion.rect
        x={cx - 72}
        y={tollY + 16}
        width="144"
        height="8"
        rx="2"
        fill={RED}
        filter="url(#glow-red)"
        initial={{ opacity: 0 }}
        animate={
          isPlaying
            ? {
                opacity: [0, 0, 0.6, 0.3, 0.5, 0.2, 0],
              }
            : { opacity: 0 }
        }
        transition={{
          duration: dur,
          repeat: Infinity,
          times: [0, 0.42, 0.44, 0.47, 0.5, 0.53, 0.58],
        }}
      />

      {/* 5. LOCK ICON + UNSPENDABLE PILL - appears after UTXO returns */}
      <motion.g
        initial={{ opacity: 0, scale: 0 }}
        animate={
          isPlaying
            ? {
                opacity: [0, 0, 1, 1, 1, 0],
                scale: [0, 0, 1.2, 1, 1, 0.8],
              }
            : { opacity: 0, scale: 0 }
        }
        transition={{
          duration: dur,
          repeat: Infinity,
          times: [0, 0.55, 0.6, 0.65, 0.82, 0.9],
          ease: "backOut",
        }}
      >
        {/* Lock icon - positioned above the UTXO, not covering it */}
        <g transform={`translate(${cx}, ${walletY - 28})`}>
          <rect x="-9" y="-4" width="18" height="14" rx="3" fill={RED} />
          <path
            d="M -4.5 -4 V -8 C -4.5 -12, 4.5 -12, 4.5 -8 V -4"
            fill="none"
            stroke={RED}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="0" cy="3" r="2" fill="#11141c" />
          <path
            d="M 0 3 V 6"
            stroke="#11141c"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>

        {/* "UNSPENDABLE" pill - below UTXO */}
        <rect
          x={cx - 48}
          y={walletY + 6}
          width="96"
          height="20"
          rx="10"
          fill={RED_DARK}
        />
        <motion.rect
          x={cx - 48}
          y={walletY + 6}
          width="96"
          height="20"
          rx="10"
          fill="none"
          stroke={RED}
          strokeWidth="1"
          initial={{ opacity: 0.5 }}
          animate={isPlaying ? { opacity: [0.5, 1, 0.5] } : { opacity: 0.5 }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        />
        <text
          x={cx}
          y={walletY + 20}
          textAnchor="middle"
          fill={RED_LIGHT}
          fontSize="8"
          fontWeight="800"
          letterSpacing="1.5"
        >
          UNSPENDABLE
        </text>
      </motion.g>

      {/* 6. STUCK pill - final dramatic status */}
      <motion.g
        initial={{ opacity: 0, y: 5 }}
        animate={
          isPlaying
            ? {
                opacity: [0, 0, 1, 1, 0],
                y: [5, 5, 0, 0, -3],
              }
            : { opacity: 0, y: 5 }
        }
        transition={{
          duration: dur,
          repeat: Infinity,
          times: [0, 0.62, 0.67, 0.82, 0.9],
          ease: "easeOut",
        }}
      >
        <text
          x={cx}
          y={walletY + 38}
          textAnchor="middle"
          fill="#475569"
          fontSize="7"
          fontWeight="600"
          letterSpacing="2"
        >
          STUCK IN WALLET FOREVER
        </text>
      </motion.g>
    </svg>
  );
}

// ----------------------------------------------------------------------
// 05: AnimatedForge (The Scan & Forge)
// A scanner beam sweeps across raw wallet complexity, transforming it
// into a clean structured PSBT - showing what Coin Smith does.
// Background = chaos (UTXOs, fee rates, dust, hex)
// Foreground = order (clean PSBT with inputs, outputs, fee)
// ----------------------------------------------------------------------
export function AnimatedForge({ isPlaying }: { isPlaying: boolean }) {
  const W = 320;
  const H = 240;
  const cycle = 8;

  // Raw JSON rows for the chaos background (representing a wallet file)
  const jsonRows = [
    "[",
    "  {",
    '    "txid": "3ba3edfd7a7b...",',
    '    "vout": 1,',
    '    "value": 50000000',
    "  },",
    "  {",
    '    "txid": "809698001976...",',
    '    "vout": 0,',
    '    "value": 20000000',
    "  },",
    "  ...",
    "]",
  ];

  // Messy stack of UTXOs for the chaos layer (Raw input list)
  const utxos = [
    { x: 30, y: 35, val: "0.50", w: 52 },
    { x: 42, y: 62, val: "0.20", w: 52 },
    { x: 26, y: 89, val: "0.10", w: 52 },
    { x: 50, y: 116, val: "0.05", w: 42 },
    { x: 38, y: 143, val: "0.003", w: 48 },
    { x: 20, y: 170, val: "0.80", w: 52 },
  ];

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Clip for the chaos (shrinks as scanner moves right) */}
        <clipPath id="chaos-clip">
          <motion.rect
            y="0"
            height={H}
            initial={{ x: 0, width: W }}
            animate={
              isPlaying
                ? {
                    x: [0, W, W, 0],
                    width: [W, 0, 0, W],
                  }
                : {}
            }
            transition={{
              duration: cycle,
              times: [0, 0.65, 0.88, 1],
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </clipPath>
        {/* Clip for the structured PSBT (grows as scanner moves right) */}
        <clipPath id="psbt-clip">
          <motion.rect
            y="0"
            height={H}
            initial={{ x: 0, width: 0 }}
            animate={
              isPlaying
                ? {
                    width: [0, W, W, 0],
                  }
                : {}
            }
            transition={{
              duration: cycle,
              times: [0, 0.65, 0.88, 1],
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </clipPath>
        {/* Scanner glow gradient */}
        <linearGradient id="forge-scan-glow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(59,130,246,0)" />
          <stop offset="100%" stopColor="rgba(59,130,246,0.25)" />
        </linearGradient>
        <filter id="glow-forge" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* ========================================== */}
      {/* LAYER 1: THE CHAOS (Raw wallet data)       */}
      {/* ========================================== */}
      <g clipPath="url(#chaos-clip)">
        {/* JSON data rows - faded, monospace, looking like raw wallet file */}
        {jsonRows.map((row, i) => (
          <text
            key={i}
            x="8"
            y={18 + i * 16}
            fill="#1e3a5a"
            fontSize="9"
            fontFamily="monospace"
            letterSpacing="0.5"
            opacity="0.7"
          >
            {row}
          </text>
        ))}

        {/* Scattered UTXO blocks - different sizes, no order */}
        {utxos.map((u, i) => (
          <g key={i}>
            <rect
              x={u.x}
              y={u.y}
              width={u.w}
              height="22"
              rx="4"
              fill="#11141c"
              stroke={i === 4 ? "#7f1d1d" : BLUE_DIM}
              strokeWidth="1"
              opacity="0.7"
            />
            <text
              x={u.x + u.w / 2}
              y={u.y + 14}
              textAnchor="middle"
              fill={i === 4 ? "#fca5a5" : "#94a3b8"}
              fontSize="9"
              fontWeight="600"
            >
              {u.val}
            </text>
            {/* Dust warning on tiny UTXO */}
            {i === 4 && (
              <text
                x={u.x + u.w + 4}
                y={u.y + 14}
                fill="#ef4444"
                fontSize="6"
                fontWeight="bold"
              >
                DUST?
              </text>
            )}
          </g>
        ))}

        {/* The "Problem State" - grouped questions on the right */}
        <g opacity="0.6">
          <text x="130" y="60" fill="#cbd5e1" fontSize="9" fontWeight="bold">
            TARGET: 0.30 BTC
          </text>

          <text
            x="130"
            y="90"
            fill="#64748b"
            fontSize="8"
            fontFamily="monospace"
          >
            fee_rate: 10 sat/vB
          </text>
          <text
            x="130"
            y="105"
            fill="#ef4444"
            fontSize="8"
            fontFamily="monospace"
          >
            dust risk detected!
          </text>
          <text
            x="130"
            y="120"
            fill="#64748b"
            fontSize="8"
            fontFamily="monospace"
          >
            vbytes = inputs × 68 + ...
          </text>

          <text x="145" y="145" fill="#3f3f46" fontSize="16" fontWeight="bold">
            ?
          </text>
          <text
            x="130"
            y="155"
            fill="#94a3b8"
            fontSize="8"
            fontFamily="monospace"
          >
            which UTXOs to pick??
          </text>
          <text x="210" y="140" fill="#3f3f46" fontSize="14" fontWeight="bold">
            ??
          </text>
        </g>
      </g>

      {/* ========================================== */}
      {/* LAYER 2: THE ORDER (Clean PSBT structure)  */}
      {/* ========================================== */}
      <g clipPath="url(#psbt-clip)">
        {/* Dark clean background */}
        <rect width={W} height={H} fill="#060810" />

        {/* PSBT Header */}
        <rect
          x="16"
          y="12"
          width={W - 32}
          height="32"
          rx="6"
          fill="#0b0f19"
          stroke={BLUE}
          strokeWidth="1.5"
        />
        <text
          x="28"
          y="28"
          fill={BLUE_LIGHT}
          fontSize="7"
          fontWeight="bold"
          letterSpacing="1.5"
        >
          UNSIGNED TRANSACTION (PSBT)
        </text>
        <text x="28" y="38" fill="#475569" fontSize="6" fontFamily="monospace">
          v2 • 1 input • 2 outputs
        </text>
        {/* Checkmark badge */}
        <circle cx={W - 36} cy="28" r="8" fill="#065f46" />
        <text
          x={W - 36}
          y="32"
          textAnchor="middle"
          fill="#10b981"
          fontSize="10"
          fontWeight="bold"
        >
          OK
        </text>

        {/* INPUTS Section */}
        <text
          x="20"
          y="60"
          fill="#64748b"
          fontSize="7"
          fontWeight="bold"
          letterSpacing="1.5"
        >
          INPUTS
        </text>
        <rect
          x="16"
          y="64"
          width={W - 32}
          height="30"
          rx="4"
          fill="#0b0f19"
          stroke="#1e2430"
          strokeWidth="1"
        />
        {/* Selected UTXO */}
        <circle cx="28" cy="79" r="4" fill={BLUE} opacity="0.6" />
        <text x="38" y="76" fill="#fff" fontSize="9" fontWeight="700">
          0.50 BTC
        </text>
        <text x="38" y="86" fill="#475569" fontSize="6" fontFamily="monospace">
          bc1q...xk3m · confirmed
        </text>
        <text
          x={W - 28}
          y="81"
          textAnchor="end"
          fill={GREEN}
          fontSize="7"
          fontWeight="bold"
        >
          SELECTED
        </text>

        {/* OUTPUTS Section */}
        <text
          x="20"
          y="110"
          fill="#64748b"
          fontSize="7"
          fontWeight="bold"
          letterSpacing="1.5"
        >
          OUTPUTS
        </text>

        {/* Output 1: Payment */}
        <rect
          x="16"
          y="114"
          width={W - 32}
          height="28"
          rx="4"
          fill="#0b0f19"
          stroke="#1e2430"
          strokeWidth="1"
        />
        <circle cx="28" cy="128" r="4" fill={GREEN} opacity="0.6" />
        <text x="38" y="125" fill="#fff" fontSize="9" fontWeight="700">
          0.30 BTC
        </text>
        <text x="38" y="135" fill="#475569" fontSize="6" fontFamily="monospace">
          → bc1q...r8pv (recipient)
        </text>
        <rect x={W - 68} y="122" width="40" height="14" rx="7" fill="#065f46" />
        <text
          x={W - 48}
          y="132"
          textAnchor="middle"
          fill="#10b981"
          fontSize="6"
          fontWeight="bold"
        >
          PAYMENT
        </text>

        {/* Output 2: Change */}
        <rect
          x="16"
          y="146"
          width={W - 32}
          height="28"
          rx="4"
          fill="#0b0f19"
          stroke="#1e2430"
          strokeWidth="1"
        />
        <circle cx="28" cy="160" r="4" fill={CYAN} opacity="0.6" />
        <text x="38" y="157" fill="#fff" fontSize="9" fontWeight="700">
          0.1981 BTC
        </text>
        <text x="38" y="167" fill="#475569" fontSize="6" fontFamily="monospace">
          → bc1q...m4kn (your wallet)
        </text>
        <rect x={W - 66} y="154" width="38" height="14" rx="7" fill="#164e63" />
        <text
          x={W - 47}
          y="164"
          textAnchor="middle"
          fill={CYAN}
          fontSize="6"
          fontWeight="bold"
        >
          CHANGE
        </text>

        {/* FEE Section */}
        <text
          x="20"
          y="192"
          fill="#64748b"
          fontSize="7"
          fontWeight="bold"
          letterSpacing="1.5"
        >
          FEE DETAILS
        </text>
        <rect
          x="16"
          y="196"
          width={W - 32}
          height="32"
          rx="4"
          fill="#0b0f19"
          stroke="#1e2430"
          strokeWidth="1"
        />
        <text x="28" y="210" fill="#94a3b8" fontSize="8">
          Fee Rate:
        </text>
        <text x="80" y="210" fill="#fff" fontSize="8" fontWeight="700">
          10 sat/vB
        </text>
        <text x="130" y="210" fill="#94a3b8" fontSize="8">
          Size:
        </text>
        <text x="155" y="210" fill="#fff" fontSize="8" fontWeight="700">
          190 vB
        </text>
        <text x="200" y="210" fill="#94a3b8" fontSize="8">
          Total:
        </text>
        <text x="228" y="210" fill="#fff" fontSize="9" fontWeight="800">
          1,900 sats
        </text>
        {/* No dust confirmation */}
        <text x="28" y="222" fill={GREEN} fontSize="7" fontWeight="600">
          No dust outputs
        </text>
        <text x="140" y="222" fill={GREEN} fontSize="7" fontWeight="600">
          Optimal coin selection
        </text>
      </g>

      {/* ========================================== */}
      {/* THE SCANNER BEAM                           */}
      {/* ========================================== */}
      <motion.g
        initial={{ x: 0 }}
        animate={isPlaying ? { x: [0, W, W, 0] } : {}}
        transition={{
          duration: cycle,
          times: [0, 0.65, 0.88, 1],
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Vertical laser line */}
        <line
          x1="0"
          y1="0"
          x2="0"
          y2={H}
          stroke={BLUE}
          strokeWidth="2"
          filter="url(#glow-forge)"
        />
        {/* Trailing glow behind the beam */}
        <rect
          x="-50"
          y="0"
          width="50"
          height={H}
          fill="url(#forge-scan-glow)"
        />
      </motion.g>
    </svg>
  );
}
