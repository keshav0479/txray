"use client";

import { motion } from "framer-motion";

const AMBER = "#f59e0b";
const AMBER_DIM = "#fbbf24";
const AMBER_BG = "rgba(245,158,11,0.08)";

/* ─────────────────────────────────────────────
   LensMini — Transaction flow with scanning lens
   Shows: inputs → core → outputs with data pulses
───────────────────────────────────────────── */
export function LensMini() {
  const drawPath = (x1: number, y1: number, x2: number, y2: number) => {
    const cp = 30;
    return `M ${x1},${y1} C ${x1 + cp},${y1} ${x2 - cp},${y2} ${x2},${y2}`;
  };

  const inputs = [28, 52, 76];
  const outputs = [28, 52, 76];
  const cx = 120, cy = 52;

  return (
    <svg viewBox="0 0 240 104" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <filter id="lm-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Input paths with traveling pulses */}
      {inputs.map((y, i) => {
        const pathD = drawPath(48, y, cx - 18, cy);
        return (
          <g key={`in-${i}`}>
            <path d={pathD} fill="none" stroke="rgba(245,158,11,0.12)" strokeWidth="1" />
            <circle r="2" fill={AMBER} style={{ filter: "url(#lm-glow)" }}>
              <animateMotion dur={`${2.5 + i * 0.4}s`} repeatCount="indefinite" path={pathD} />
            </circle>
          </g>
        );
      })}

      {/* Output paths with traveling pulses */}
      {outputs.map((y, i) => {
        const pathD = drawPath(cx + 18, cy, 192, y);
        return (
          <g key={`out-${i}`}>
            <path d={pathD} fill="none" stroke="rgba(245,158,11,0.12)" strokeWidth="1" />
            <circle r="2" fill={AMBER_DIM} style={{ filter: "url(#lm-glow)" }}>
              <animateMotion dur={`${2.5 + i * 0.3}s`} repeatCount="indefinite" path={pathD} />
            </circle>
          </g>
        );
      })}

      {/* Input nodes */}
      {inputs.map((y, i) => (
        <g key={`in-node-${i}`}>
          <rect x="8" y={y - 10} width="40" height="20" rx="4" fill={AMBER_BG} stroke="rgba(245,158,11,0.2)" strokeWidth="0.8" />
          <text x="28" y={y + 4} textAnchor="middle" fontSize="6" fontFamily="monospace" fill={AMBER} opacity="0.7">
            {["0.42₿", "1.05₿", "0.18₿"][i]}
          </text>
        </g>
      ))}

      {/* Output nodes */}
      {outputs.map((y, i) => (
        <g key={`out-node-${i}`}>
          <rect x="192" y={y - 10} width="40" height="20" rx="4" fill={AMBER_BG} stroke="rgba(245,158,11,0.2)" strokeWidth="0.8" />
          <text x="212" y={y + 4} textAnchor="middle" fontSize="6" fontFamily="monospace" fill={AMBER_DIM} opacity="0.7">
            {["1.20₿", "0.40₿", "FEE"][i]}
          </text>
        </g>
      ))}

      {/* Central scanning lens */}
      <motion.g
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        <circle cx={cx} cy={cy} r={20} fill="rgba(245,158,11,0.04)" stroke={AMBER} strokeWidth="1" style={{ filter: "url(#lm-glow)" }} />
        <circle cx={cx} cy={cy} r={14} fill="none" stroke="rgba(245,158,11,0.15)" strokeWidth="0.5" />
        {/* Crosshairs */}
        <line x1={cx - 24} y1={cy} x2={cx - 12} y2={cy} stroke={AMBER} strokeWidth="1" opacity="0.4" />
        <line x1={cx + 12} y1={cy} x2={cx + 24} y2={cy} stroke={AMBER} strokeWidth="1" opacity="0.4" />
        <line x1={cx} y1={cy - 24} x2={cx} y2={cy - 12} stroke={AMBER} strokeWidth="1" opacity="0.4" />
        <line x1={cx} y1={cy + 12} x2={cx} y2={cy + 24} stroke={AMBER} strokeWidth="1" opacity="0.4" />
        {/* Spinner */}
        <motion.circle
          cx={cx} cy={cy} r={10}
          fill="transparent" stroke={AMBER} strokeWidth="1" strokeDasharray="8 4 3 4"
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
          opacity="0.5"
        />
        {/* Lens icon */}
        <text x={cx} y={cy + 3} textAnchor="middle" fontSize="10" fill={AMBER} opacity="0.8">⟐</text>
      </motion.g>
    </svg>
  );
}

/* ─────────────────────────────────────────────
   SherlockMini — Fingerprint scan with heuristic callouts
   Shows: A fingerprint being scanned with detection labels
───────────────────────────────────────────── */
export function SherlockMini() {
  return (
    <svg viewBox="0 0 240 104" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <filter id="sm-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Fingerprint concentric arcs */}
      {[16, 22, 28, 34, 40].map((r, i) => (
        <motion.path
          key={`arc-${i}`}
          d={`M ${80 - r} 52 A ${r} ${r} 0 0 1 ${80 + r} 52`}
          fill="none"
          stroke={AMBER}
          strokeWidth="1"
          opacity={0.1 + i * 0.04}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: [0, 1] }}
          transition={{ duration: 2, delay: i * 0.3, repeat: Infinity, repeatDelay: 3 }}
        />
      ))}
      {[14, 20, 26, 32].map((r, i) => (
        <motion.path
          key={`arc-bot-${i}`}
          d={`M ${80 + r} 56 A ${r} ${r} 0 0 1 ${80 - r} 56`}
          fill="none"
          stroke={AMBER}
          strokeWidth="1"
          opacity={0.08 + i * 0.03}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: [0, 1] }}
          transition={{ duration: 2, delay: 0.15 + i * 0.3, repeat: Infinity, repeatDelay: 3 }}
        />
      ))}

      {/* Scanning sweep line */}
      <motion.line
        x1="42" y1="10" x2="42" y2="94"
        stroke={AMBER}
        strokeWidth="1.5"
        opacity="0.6"
        style={{ filter: "url(#sm-glow)" }}
        animate={{ x1: [42, 118, 42], x2: [42, 118, 42] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Detection callout lines */}
      <motion.g
        animate={{ opacity: [0, 0, 1, 1, 0] }}
        transition={{ duration: 6, repeat: Infinity, times: [0, 0.3, 0.4, 0.8, 1] }}
      >
        <line x1="110" y1="28" x2="140" y2="28" stroke={AMBER} strokeWidth="0.5" opacity="0.6" />
        <rect x="142" y="22" width="52" height="12" rx="2" fill={AMBER_BG} stroke="rgba(245,158,11,0.25)" strokeWidth="0.5" />
        <text x="168" y="30" textAnchor="middle" fontSize="5" fontFamily="monospace" fill={AMBER} fontWeight="bold">CIOH DETECTED</text>
      </motion.g>

      <motion.g
        animate={{ opacity: [0, 0, 0, 1, 1, 0] }}
        transition={{ duration: 6, repeat: Infinity, times: [0, 0.4, 0.5, 0.55, 0.85, 1] }}
      >
        <line x1="108" y1="52" x2="140" y2="52" stroke={AMBER} strokeWidth="0.5" opacity="0.6" />
        <rect x="142" y="46" width="52" height="12" rx="2" fill={AMBER_BG} stroke="rgba(245,158,11,0.25)" strokeWidth="0.5" />
        <text x="168" y="54" textAnchor="middle" fontSize="5" fontFamily="monospace" fill={AMBER} fontWeight="bold">ROUND NUMBER</text>
      </motion.g>

      <motion.g
        animate={{ opacity: [0, 0, 0, 0, 1, 1, 0] }}
        transition={{ duration: 6, repeat: Infinity, times: [0, 0.5, 0.6, 0.65, 0.7, 0.9, 1] }}
      >
        <line x1="106" y1="76" x2="140" y2="76" stroke={AMBER} strokeWidth="0.5" opacity="0.6" />
        <rect x="142" y="70" width="52" height="12" rx="2" fill={AMBER_BG} stroke="rgba(245,158,11,0.25)" strokeWidth="0.5" />
        <text x="168" y="78" textAnchor="middle" fontSize="5" fontFamily="monospace" fill={AMBER} fontWeight="bold">SCRIPT MATCH</text>
      </motion.g>

      {/* Confidence meter */}
      <rect x="200" y="20" width="6" height="64" rx="3" fill="rgba(255,255,255,0.03)" stroke="rgba(245,158,11,0.1)" strokeWidth="0.5" />
      <motion.rect
        x="201" rx="2" width="4"
        fill={AMBER}
        opacity="0.4"
        style={{ filter: "url(#sm-glow)" }}
        animate={{ y: [82, 30, 82], height: [2, 52, 2] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <text x="203" y="94" textAnchor="middle" fontSize="4" fontFamily="monospace" fill={AMBER} opacity="0.5">RISK</text>
    </svg>
  );
}

/* ─────────────────────────────────────────────
   SmithMini — PSBT construction / coin forge
   Shows: Coins being selected → forged into a transaction
───────────────────────────────────────────── */
export function SmithMini() {
  const coins = [
    { x: 24, y: 24 },
    { x: 24, y: 52 },
    { x: 24, y: 80 },
  ];

  return (
    <svg viewBox="0 0 240 104" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <filter id="fm-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Input coins with selection pulse */}
      {coins.map((coin, i) => (
        <motion.g
          key={`coin-${i}`}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 3, delay: i * 0.8, repeat: Infinity }}
          style={{ transformOrigin: `${coin.x}px ${coin.y}px` }}
        >
          <circle cx={coin.x} cy={coin.y} r="12" fill={AMBER_BG} stroke="rgba(245,158,11,0.2)" strokeWidth="0.8" />
          <text x={coin.x} y={coin.y + 3} textAnchor="middle" fontSize="8" fill={AMBER} fontWeight="bold">₿</text>
        </motion.g>
      ))}

      {/* Selection arrows flowing to forge */}
      {coins.map((coin, i) => {
        const pathD = `M ${coin.x + 14} ${coin.y} Q 70 52 86 52`;
        return (
          <g key={`arrow-${i}`}>
            <path d={pathD} fill="none" stroke="rgba(245,158,11,0.1)" strokeWidth="1" />
            <motion.circle r="1.5" fill={AMBER} style={{ filter: "url(#fm-glow)" }}
              animate={{ offsetDistance: ["0%", "100%"] }}
              transition={{ duration: 2, delay: i * 0.6, repeat: Infinity }}
            >
              <animateMotion dur={`${2 + i * 0.3}s`} repeatCount="indefinite" path={pathD} />
            </motion.circle>
          </g>
        );
      })}

      {/* Central forge / anvil */}
      <motion.g
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "108px 52px" }}
      >
        {/* Anvil shape */}
        <rect x="90" y="38" width="36" height="28" rx="6" fill="rgba(245,158,11,0.06)" stroke={AMBER} strokeWidth="1" style={{ filter: "url(#fm-glow)" }} />
        {/* Hammer icon */}
        <text x="108" y="56" textAnchor="middle" fontSize="12" fill={AMBER} opacity="0.8">⚒</text>
      </motion.g>

      {/* Sparks from forge */}
      {[0, 1, 2, 3].map((i) => (
        <motion.circle
          key={`spark-${i}`}
          cx={108} cy={38}
          r="1"
          fill={AMBER_DIM}
          style={{ filter: "url(#fm-glow)" }}
          animate={{
            x: [-5 + i * 8, -10 + i * 12],
            y: [-5 - i * 3, -15 - i * 5],
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0],
          }}
          transition={{ duration: 1.5, delay: 1 + i * 0.2, repeat: Infinity, repeatDelay: 2.5 }}
        />
      ))}

      {/* Output: constructed TX */}
      <motion.g
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <line x1="128" y1="52" x2="155" y2="52" stroke={AMBER} strokeWidth="1" opacity="0.3" />
        <rect x="158" y="30" width="70" height="44" rx="6" fill={AMBER_BG} stroke="rgba(245,158,11,0.2)" strokeWidth="0.8" />
        {/* TX details */}
        <text x="193" y="44" textAnchor="middle" fontSize="6" fontFamily="monospace" fill={AMBER} fontWeight="bold">UNSIGNED TX</text>
        <line x1="165" y1="48" x2="221" y2="48" stroke="rgba(245,158,11,0.1)" strokeWidth="0.5" />
        <text x="168" y="56" fontSize="4.5" fontFamily="monospace" fill={AMBER} opacity="0.5">fee: 1,420 sat</text>
        <text x="168" y="64" fontSize="4.5" fontFamily="monospace" fill={AMBER} opacity="0.5">vbytes: 142</text>
      </motion.g>
    </svg>
  );
}
