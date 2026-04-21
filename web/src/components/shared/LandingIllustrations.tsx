"use client";

import { motion } from "framer-motion";

const AMBER = "#f59e0b";
const AMBER_DIM = "#fbbf24";
const AMBER_BG = "rgba(245,158,11,0.08)";

/* ---------------------------------------------------------------------------------------------------------------------------------------
   LensMini - Transaction flow with scanning lens
   Shows: inputs -> core -> outputs with smooth CSS-driven pulses
   Math: 0.50 + 0.30 + 0.20 = 1.00 -> 0.85 + 0.14 (implicit fee: 0.01)
--------------------------------------------------------------------------------------------------------------------------------------- */
export function LensMini() {
  // Y positions for nodes
  const inputs = [24, 52, 80];
  const outputs = [38, 66];
  const cx = 120,
    cy = 52;

  // Path definitions - bezier curves
  const inputPaths = inputs.map((y) => {
    const cp = y === cy ? 20 : 28; // Flatter curve for middle
    return `M 50,${y} C ${50 + cp},${y} ${cx - 20 - cp},${cy} ${cx - 20},${cy}`;
  });

  const outputPaths = outputs.map((y) => {
    const cp = 28;
    return `M ${cx + 20},${cy} C ${cx + 20 + cp},${cy} ${190 - cp},${y} 190,${y}`;
  });

  // CSS keyframes: One-way flow, fade in at start, fade out at end
  const styles = `
    @keyframes lens-flow {
      0% { offset-distance: 0%; opacity: 0; transform: scale(0.5); }
      15% { opacity: 1; transform: scale(1); }
      85% { opacity: 1; transform: scale(1); }
      100% { offset-distance: 100%; opacity: 0; transform: scale(0.5); }
    }
  `;

  return (
    <svg
      viewBox="0 0 240 104"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <style>{styles}</style>
      <defs>
        <filter id="lm-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient
          id="lm-path-in"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={AMBER} stopOpacity="0.05" />
          <stop offset="100%" stopColor={AMBER} stopOpacity="0.25" />
        </linearGradient>
        <linearGradient
          id="lm-path-out"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={AMBER} stopOpacity="0.25" />
          <stop offset="100%" stopColor={AMBER} stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Input paths */}
      {inputPaths.map((d, i) => (
        <path
          key={`in-path-${i}`}
          d={d}
          fill="none"
          stroke="url(#lm-path-in)"
          strokeWidth="1"
        />
      ))}

      {/* Output paths */}
      {outputPaths.map((d, i) => (
        <path
          key={`out-path-${i}`}
          d={d}
          fill="none"
          stroke="url(#lm-path-out)"
          strokeWidth="1"
        />
      ))}

      {/* Traveling dots - Input */}
      {inputPaths.map((d, i) => (
        <circle
          key={`in-dot-${i}`}
          r="2"
          fill={AMBER}
          style={{
            filter: "url(#lm-glow)",
            offsetPath: `path('${d}')`,
            animation: `lens-flow 2.5s linear infinite`,
            animationDelay: `${-(i * 0.8)}s`,
          }}
        />
      ))}

      {/* Traveling dots - Output */}
      {outputPaths.map((d, i) => (
        <circle
          key={`out-dot-${i}`}
          r="2"
          fill={AMBER_DIM}
          style={{
            filter: "url(#lm-glow)",
            offsetPath: `path('${d}')`,
            animation: `lens-flow 2.5s linear infinite`,
            animationDelay: `${-(i * 1.25) - 1.5}s`,
          }}
        />
      ))}

      {/* Input nodes */}
      {inputs.map((y, i) => (
        <g key={`in-node-${i}`}>
          <rect
            x="8"
            y={y - 10}
            width="42"
            height="20"
            rx="4"
            fill={AMBER_BG}
            stroke="rgba(245,158,11,0.25)"
            strokeWidth="0.8"
          />
          <text
            x="29"
            y={y + 3.5}
            textAnchor="middle"
            fontSize="7"
            fontFamily="monospace"
            fill={AMBER}
            opacity="0.85"
          >
            {["0.50 BTC", "0.30 BTC", "0.20 BTC"][i]}
          </text>
        </g>
      ))}

      {/* Output nodes */}
      {outputs.map((y, i) => (
        <g key={`out-node-${i}`}>
          <rect
            x="190"
            y={y - 10}
            width="42"
            height="20"
            rx="4"
            fill={AMBER_BG}
            stroke="rgba(245,158,11,0.25)"
            strokeWidth="0.8"
          />
          <text
            x="211"
            y={y + 3.5}
            textAnchor="middle"
            fontSize="7"
            fontFamily="monospace"
            fill={AMBER_DIM}
            opacity="0.85"
          >
            {["0.85BTC", "0.14BTC"][i]}
          </text>
        </g>
      ))}

      {/* Central lens core */}
      <g>
        {/* Outer breathing ring */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={22}
          fill="rgba(245,158,11,0.04)"
          stroke={AMBER}
          strokeWidth="1"
          style={{ filter: "url(#lm-glow)" }}
          initial={{ r: 22, opacity: 0.3 }}
          animate={{ r: [22, 25, 22], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Inner static ring */}
        <circle
          cx={cx}
          cy={cy}
          r={14}
          fill="none"
          stroke="rgba(245,158,11,0.2)"
          strokeWidth="0.5"
        />

        {/* Central Pulsing Diamond */}
        <g transform={`translate(${cx}, ${cy})`}>
          <motion.g
            initial={{ scale: 0.9, opacity: 0.7 }}
            animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <path
              d="M 0,-8 L 6,0 L 0,8 L -6,0 Z"
              fill="rgba(245,158,11,0.1)"
              stroke={AMBER}
              strokeWidth="1"
            />
            <path d="M 0,-4 L 3,0 L 0,4 L -3,0 Z" fill={AMBER} opacity="0.4" />
          </motion.g>
        </g>

        {/* Fast rotating dashed ring */}
        <g transform={`translate(${cx}, ${cy})`}>
          <motion.circle
            cx={0}
            cy={0}
            r={18}
            fill="none"
            stroke={AMBER}
            strokeWidth="0.5"
            strokeDasharray="4 8"
            opacity="0.4"
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          />
        </g>
      </g>
    </svg>
  );
}

/* ---------------------------------------------------------------------------------------------------------------------------------------
   SherlockMini - Fingerprint scan with heuristic callouts
   Shows: A fingerprint being scanned with detection labels
--------------------------------------------------------------------------------------------------------------------------------------- */
export function SherlockMini() {
  return (
    <svg
      viewBox="0 0 240 104"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <defs>
        <filter id="sm-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="sm-beam" x="-150%" y="-20%" width="400%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Authentic Fingerprint Biometric - draws in sequentially */}
      <g transform="translate(46, 20) scale(2.6)">
        {[
          "M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4",
          "M14 13.12c0 2.38 0 6.38-1 8.88",
          "M17.29 21.02c.12-.6.43-2.3.5-3.02",
          "M2 12a10 10 0 0 1 18-6",
          "M2 16h.01",
          "M21.8 16c.2-2 .131-5.354 0-6",
          "M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2",
          "M8.65 22c.21-.66.45-1.32.57-2",
          "M9 6.8a6 6 0 0 1 9 5.2v2",
        ].map((d, i) => {
          // Bake stagger into the times array so it loops perfectly without `delay` breaking
          const start = i * 0.04;
          const end = start + 0.25;
          const opTarget = 0.2 + i * 0.05;
          return (
            <motion.path
              key={`fp-path-${i}`}
              d={d}
              fill="none"
              stroke={AMBER}
              strokeWidth="0.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: "url(#sm-glow)" }}
              // 6 keyframes to match the 6 times exactly
              animate={{
                pathLength: [0, 0, 1, 1, 0, 0],
                opacity: [0, 0, opTarget, opTarget, 0, 0],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                times: [0, start, end, 0.8, 0.9, 1],
                ease: "easeInOut",
              }}
            />
          );
        })}
      </g>

      {/* Detection callout lines - perfectly synced to the 5s drawing cycle */}
      <motion.g
        animate={{ opacity: [0, 0, 1, 1, 0, 0], x: [-5, -5, 0, 0, -5, -5] }}
        transition={{
          duration: 5,
          repeat: Infinity,
          times: [0, 0.2, 0.25, 0.8, 0.9, 1],
          ease: "easeOut",
        }}
      >
        <line
          x1="115"
          y1="28"
          x2="138"
          y2="28"
          stroke={AMBER}
          strokeWidth="0.5"
          opacity="0.5"
        />
        <rect
          x="140"
          y="22"
          width="54"
          height="12"
          rx="2"
          fill={AMBER_BG}
          stroke="rgba(245,158,11,0.25)"
          strokeWidth="0.5"
        />
        <text
          x="167"
          y="30"
          textAnchor="middle"
          fontSize="5"
          fontFamily="monospace"
          fill={AMBER}
          fontWeight="bold"
        >
          CIOH DETECTED
        </text>
      </motion.g>

      <motion.g
        animate={{ opacity: [0, 0, 1, 1, 0, 0], x: [-5, -5, 0, 0, -5, -5] }}
        transition={{
          duration: 5,
          repeat: Infinity,
          times: [0, 0.35, 0.4, 0.8, 0.9, 1],
          ease: "easeOut",
        }}
      >
        <line
          x1="115"
          y1="52"
          x2="138"
          y2="52"
          stroke={AMBER}
          strokeWidth="0.5"
          opacity="0.5"
        />
        <rect
          x="140"
          y="46"
          width="54"
          height="12"
          rx="2"
          fill={AMBER_BG}
          stroke="rgba(245,158,11,0.25)"
          strokeWidth="0.5"
        />
        <text
          x="167"
          y="54"
          textAnchor="middle"
          fontSize="5"
          fontFamily="monospace"
          fill={AMBER}
          fontWeight="bold"
        >
          ROUND NUMBER
        </text>
      </motion.g>

      <motion.g
        animate={{ opacity: [0, 0, 1, 1, 0, 0], x: [-5, -5, 0, 0, -5, -5] }}
        transition={{
          duration: 5,
          repeat: Infinity,
          times: [0, 0.5, 0.55, 0.8, 0.9, 1],
          ease: "easeOut",
        }}
      >
        <line
          x1="115"
          y1="76"
          x2="138"
          y2="76"
          stroke={AMBER}
          strokeWidth="0.5"
          opacity="0.5"
        />
        <rect
          x="140"
          y="70"
          width="54"
          height="12"
          rx="2"
          fill={AMBER_BG}
          stroke="rgba(245,158,11,0.25)"
          strokeWidth="0.5"
        />
        <text
          x="167"
          y="78"
          textAnchor="middle"
          fontSize="5"
          fontFamily="monospace"
          fill={AMBER}
          fontWeight="bold"
        >
          SCRIPT MATCH
        </text>
      </motion.g>

      {/* Confidence meter - steps up instantly as each callout fires, clears with arcs */}
      <rect
        x="200"
        y="20"
        width="6"
        height="64"
        rx="3"
        fill="rgba(255,255,255,0.03)"
        stroke="rgba(245,158,11,0.1)"
        strokeWidth="0.5"
      />
      <motion.rect
        x="201"
        rx="2"
        width="4"
        fill={AMBER}
        opacity="0.45"
        style={{ filter: "url(#sm-glow)" }}
        animate={{
          y: [82, 82, 65, 65, 48, 48, 30, 30, 82, 82],
          height: [2, 2, 19, 19, 36, 36, 52, 52, 2, 2],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          times: [0, 0.22, 0.25, 0.37, 0.4, 0.52, 0.55, 0.8, 0.9, 1],
          ease: "easeOut",
        }}
      />
      <text
        x="203"
        y="94"
        textAnchor="middle"
        fontSize="4"
        fontFamily="monospace"
        fill={AMBER}
        opacity="0.5"
      >
        RISK
      </text>
    </svg>
  );
}

/* ---------------------------------------------------------------------------------------------------------------------------------------
   SmithMini - Smart coin selection -> PSBT output
--------------------------------------------------------------------------------------------------------------------------------------- */
export function SmithMini() {
  // UTXO rows: amount, whether selected (for styling), and stagger delay
  const utxos = [
    { amt: "0.50", selected: true, delay: 0 },
    { amt: "0.30", selected: true, delay: 0.15 },
    { amt: "0.08", selected: false, delay: 0.3 },
    { amt: "0.12", selected: true, delay: 0.45 },
  ];
  const ROW_H = 17;
  const startY = 14;
  const CYCLE = 6;

  // Fluid CSS flow animation perfectly synced to the 6s cycle.
  // Each dot takes 2s (33.3% of cycle) to travel the path.
  const styles = `
    @keyframes smith2-flow {
      0%   { offset-distance: 0%;   opacity: 0; transform: scale(0.5); }
      5%   { opacity: 1; transform: scale(1); }
      30%  { opacity: 1; transform: scale(1); }
      33%  { offset-distance: 100%; opacity: 0; transform: scale(0.5); }
      100% { offset-distance: 100%; opacity: 0; transform: scale(0.5); }
    }
  `;

  return (
    <svg
      viewBox="0 0 240 104"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <style>{styles}</style>
      <defs>
        <filter id="sm2-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="sm2-panel-bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={AMBER} stopOpacity="0.04" />
          <stop offset="100%" stopColor={AMBER} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* ------ Left panel: UTXO selector list ------ */}
      <rect
        x="8"
        y="6"
        width="95"
        height="92"
        rx="5"
        fill="url(#sm2-panel-bg)"
        stroke="rgba(245,158,11,0.15)"
        strokeWidth="0.5"
      />
      <text
        x="55"
        y="16"
        textAnchor="middle"
        fontSize="4.5"
        fontFamily="monospace"
        fill={AMBER}
        opacity="0.6"
        letterSpacing="1"
      >
        AVAILABLE UTXOS
      </text>
      <line
        x1="8"
        y1="20"
        x2="103"
        y2="20"
        stroke="rgba(245,158,11,0.08)"
        strokeWidth="0.5"
      />

      {utxos.map((u, i) => {
        const y = startY + i * ROW_H + 11;
        const isSelected = u.selected;
        // Build times arrays: wait -> appear -> hold -> fade
        const t0 = u.delay / (CYCLE * 0.6); // staggered start
        const t1 = t0 + 0.08; // snap in
        return (
          <g key={`utxo-${i}`}>
            {/* Row background highlight for selected */}
            <motion.rect
              x="12"
              y={y - 7}
              width="87"
              height="14"
              rx="2"
              fill={isSelected ? "rgba(245,158,11,0.06)" : "transparent"}
              animate={{ opacity: isSelected ? [0, 0, 1, 1, 0, 0] : [0.3] }}
              transition={
                isSelected
                  ? {
                      duration: CYCLE,
                      repeat: Infinity,
                      times: [0, t0, t1, 0.75, 0.85, 1],
                      ease: "easeOut",
                    }
                  : {}
              }
            />

            {/* Checkbox */}
            <rect
              x="16"
              y={y - 4.5}
              width="9"
              height="9"
              rx="2"
              fill="none"
              stroke={AMBER}
              strokeWidth="0.6"
              opacity={isSelected ? 0.6 : 0.15}
            />

            {/* Animated checkmark for selected rows */}
            {isSelected && (
              <motion.path
                d={`M ${18} ${y} l 2 2.5 l 3.5 -4`}
                fill="none"
                stroke={AMBER}
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: "url(#sm2-glow)" }}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: [0, 0, 1, 1, 0, 0],
                  opacity: [0, 0, 1, 1, 0, 0],
                }}
                transition={{
                  duration: CYCLE,
                  repeat: Infinity,
                  times: [0, t0, t1, 0.75, 0.85, 1],
                  ease: "easeOut",
                }}
              />
            )}

            {/* Dimmed X for unselected */}
            {!isSelected && (
              <g opacity="0.2">
                <line
                  x1="18"
                  y1={y - 2.5}
                  x2="23"
                  y2={y + 2.5}
                  stroke={AMBER}
                  strokeWidth="0.8"
                  strokeLinecap="round"
                />
                <line
                  x1="23"
                  y1={y - 2.5}
                  x2="18"
                  y2={y + 2.5}
                  stroke={AMBER}
                  strokeWidth="0.8"
                  strokeLinecap="round"
                />
              </g>
            )}

            {/* Amount label */}
            <text
              x="32"
              y={y + 3}
              fontSize="6.5"
              fontFamily="monospace"
              fill={AMBER}
              opacity={isSelected ? 0.9 : 0.25}
              fontWeight={isSelected ? "bold" : "normal"}
            >
              {u.amt} BTC
            </text>

            {/* Small bar showing relative size */}
            <rect
              x="72"
              y={y - 1.5}
              width={parseFloat(u.amt) * 36}
              height="3"
              rx="1.5"
              fill={isSelected ? AMBER : "transparent"}
              opacity={isSelected ? 0.2 : 0.05}
              stroke={
                isSelected ? "rgba(245,158,11,0.3)" : "rgba(245,158,11,0.05)"
              }
              strokeWidth="0.4"
            />
          </g>
        );
      })}

      {/* ------ Center: animated connection particles using pure CSS offset-path ------ */}
      {[0, 1, 2].map((i) => {
        // We only draw paths for the 3 selected rows (indices 0, 1, 3). So adjust map to those rows.
        const rowIdx = i === 2 ? 3 : i;
        const y = startY + rowIdx * ROW_H + 11;
        // Fix: path originates at x=104 (right edge of the 95w box at x=8)
        const pathD = `M 104 ${y} C 120 ${y}, 130 52, 142 52`;

        // Match the delay of the checkmark, then add a tiny 0.2s explicit offset so dot fires *after* check
        const delayS = utxos[rowIdx].delay + 0.2;

        // Match the exact timing of the row's checkmark for the path fading in
        const t0 = utxos[rowIdx].delay / (CYCLE * 0.6);
        const t1 = t0 + 0.08;

        return (
          <g key={`flow-${i}`}>
            <motion.path
              d={pathD}
              fill="none"
              stroke="rgba(245,158,11,0.12)"
              strokeWidth="0.6"
              strokeDasharray="2 3"
              animate={{ opacity: [0, 0, 1, 1, 0, 0] }}
              transition={{
                duration: CYCLE,
                repeat: Infinity,
                times: [0, t0, t1, 0.75, 0.85, 1],
                ease: "easeOut",
              }}
            />
            <circle
              r="1.5"
              fill={AMBER}
              style={{
                filter: "url(#sm2-glow)",
                offsetPath: `path('${pathD}')`,
                animation: `smith2-flow ${CYCLE}s linear ${delayS}s infinite backwards`,
              }}
            />
          </g>
        );
      })}

      {/* ------ Right panel: PSBT output ------ */}
      <motion.g
        animate={{ opacity: [0, 0, 1, 1, 0, 0] }}
        transition={{
          duration: CYCLE,
          repeat: Infinity,
          times: [0, 0.35, 0.45, 0.75, 0.88, 1],
          ease: "easeOut",
        }}
      >
        <rect
          x="142"
          y="16"
          width="90"
          height="72"
          rx="5"
          fill="rgba(245,158,11,0.05)"
          stroke="rgba(245,158,11,0.25)"
          strokeWidth="0.6"
        />

        {/* Header */}
        <text
          x="187"
          y="27"
          textAnchor="middle"
          fontSize="5.5"
          fontFamily="monospace"
          fill={AMBER}
          fontWeight="bold"
          letterSpacing="0.5"
        >
          UNSIGNED PSBT
        </text>
        <line
          x1="150"
          y1="31"
          x2="224"
          y2="31"
          stroke="rgba(245,158,11,0.15)"
          strokeWidth="0.5"
        />

        {/* Stat rows */}
        <text
          x="150"
          y="42"
          fontSize="4.5"
          fontFamily="monospace"
          fill={AMBER}
          opacity="0.5"
        >
          inputs
        </text>
        <text
          x="224"
          y="42"
          textAnchor="end"
          fontSize="5"
          fontFamily="monospace"
          fill={AMBER}
          opacity="0.8"
        >
          3
        </text>

        <text
          x="150"
          y="52"
          fontSize="4.5"
          fontFamily="monospace"
          fill={AMBER}
          opacity="0.5"
        >
          outputs
        </text>
        <text
          x="224"
          y="52"
          textAnchor="end"
          fontSize="5"
          fontFamily="monospace"
          fill={AMBER}
          opacity="0.8"
        >
          2
        </text>

        <line
          x1="150"
          y1="56"
          x2="224"
          y2="56"
          stroke="rgba(245,158,11,0.06)"
          strokeWidth="0.4"
        />

        <text
          x="150"
          y="66"
          fontSize="4.5"
          fontFamily="monospace"
          fill={AMBER}
          opacity="0.5"
        >
          size
        </text>
        <text
          x="224"
          y="66"
          textAnchor="end"
          fontSize="5"
          fontFamily="monospace"
          fill={AMBER}
          opacity="0.8"
        >
          142 vB
        </text>

        <line
          x1="150"
          y1="70"
          x2="224"
          y2="70"
          stroke="rgba(245,158,11,0.06)"
          strokeWidth="0.4"
        />

        <text
          x="150"
          y="80"
          fontSize="4.5"
          fontFamily="monospace"
          fill={AMBER}
          fontWeight="bold"
          opacity="0.6"
        >
          total fee
        </text>
        <text
          x="224"
          y="80"
          textAnchor="end"
          fontSize="5.5"
          fontFamily="monospace"
          fill={AMBER}
          fontWeight="bold"
          style={{ filter: "url(#sm2-glow)" }}
        >
          1,420 sat
        </text>
      </motion.g>
    </svg>
  );
}
