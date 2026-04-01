"use client";

import { motion } from "framer-motion";

interface GraphicProps {
  isPlaying: boolean;
}

/**
 * Replaces the original cobe-based AnimatedGlobe with a pure SVG
 * spinning wireframe network to avoid the heavy cobe dependency.
 */
export function AnimatedGlobe({ isPlaying }: GraphicProps) {
  const cycle = 12;
  // Network node positions (simulating a globe-like distribution)
  const nodes = [
    { x: 170, y: 40 },  // top
    { x: 60, y: 90 },   // upper-left
    { x: 280, y: 90 },  // upper-right
    { x: 120, y: 160 }, // mid-left
    { x: 220, y: 160 }, // mid-right
    { x: 170, y: 120 }, // center
    { x: 80, y: 200 },  // lower-left
    { x: 260, y: 200 }, // lower-right
    { x: 170, y: 220 }, // bottom
  ];

  // Edges connecting the nodes
  const edges = [
    [0, 1], [0, 2], [0, 5],
    [1, 3], [1, 5],
    [2, 4], [2, 5],
    [3, 5], [3, 6], [3, 8],
    [4, 5], [4, 7], [4, 8],
    [6, 8], [7, 8],
  ];

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 340 260" className="w-full h-full" fill="none">
        {/* Outer circle (globe outline) */}
        <motion.circle
          cx="170" cy="130" r="110"
          stroke="#1e3a8a" strokeWidth="1.5" fill="none"
          initial={{ opacity: 0 }}
          animate={isPlaying ? { opacity: [0, 0.5, 0.5] } : { opacity: 0 }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Network edges */}
        {edges.map(([a, b], i) => (
          <motion.line
            key={`e-${i}`}
            x1={nodes[a].x} y1={nodes[a].y}
            x2={nodes[b].x} y2={nodes[b].y}
            stroke="#3b82f6" strokeWidth="1"
            initial={{ opacity: 0 }}
            animate={isPlaying ? {
              opacity: [0, 0, 0.6, 0.6, 0],
            } : { opacity: 0 }}
            transition={{
              duration: cycle,
              times: [0, (i * 0.04), (i * 0.04 + 0.08), 0.85, 1],
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
        ))}

        {/* Network nodes */}
        {nodes.map((n, i) => (
          <motion.circle
            key={`n-${i}`}
            cx={n.x} cy={n.y} r="5"
            fill="#60a5fa"
            initial={{ opacity: 0, scale: 0 }}
            animate={isPlaying ? {
              opacity: [0, 0, 1, 1, 0],
              scale: [0, 0, 1, 1, 0],
            } : { opacity: 0 }}
            transition={{
              duration: cycle,
              times: [0, (i * 0.05), (i * 0.05 + 0.06), 0.85, 1],
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
        ))}

        {/* Pulse traveling along edges */}
        {[0, 3, 7, 12].map((edgeIdx, pi) => {
          const [a, b] = edges[edgeIdx];
          return (
            <motion.circle
              key={`pulse-${pi}`}
              r="3"
              fill="#f59e0b"
              initial={{ opacity: 0 }}
              animate={isPlaying ? {
                cx: [nodes[a].x, nodes[b].x, nodes[b].x],
                cy: [nodes[a].y, nodes[b].y, nodes[b].y],
                opacity: [0, 1, 0],
              } : { opacity: 0 }}
              transition={{
                duration: 2,
                delay: pi * 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}

export function AnimatedBlocks({ isPlaying }: GraphicProps) {
  const blocks = [
    { hash: "#a7f3", prevHash: "0000" },
    { hash: "#c4e1", prevHash: "#a7f3" },
    { hash: "#9b2d", prevHash: "#c4e1" },
  ];

  // Total animation cycle: ~8s
  // Block 1 appears at 0s, chain at 1s, Block 2 at 2s, chain at 3s, Block 3 at 4s, glow at 6s, reset at 8s
  const cycleDuration = 8;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 340 140" className="w-full h-full" fill="none">
        {blocks.map((block, i) => {
          const x = 10 + i * 115;
          const blockDelay = i * 1.8;

          return (
            <g key={i}>
              {/* Block rectangle */}
              <motion.rect
                x={x} y="20" width="100" height="100" rx="12"
                stroke="#3b82f6"
                strokeWidth="1.5"
                fill="rgba(30, 58, 138, 0.4)"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isPlaying ? {
                  opacity: [0, 0, 1, 1, 1, 1, 1, 0],
                  scale: [0.8, 0.8, 1, 1, 1, 1, 1, 0.8],
                } : { opacity: 0 }}
                transition={{
                  duration: cycleDuration,
                  times: [0, blockDelay / cycleDuration, (blockDelay + 0.4) / cycleDuration, 0.65, 0.75, 0.85, 0.92, 1],
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />

              {/* Block header label */}
              <motion.text
                x={x + 50} y="44" textAnchor="middle"
                fontSize="11" fontFamily="monospace" fontWeight="500"
                fill="#93c5fd"
                initial={{ opacity: 0 }}
                animate={isPlaying ? {
                  opacity: [0, 0, 1, 1, 1, 1, 1, 0],
                } : { opacity: 0 }}
                transition={{
                  duration: cycleDuration,
                  times: [0, blockDelay / cycleDuration, (blockDelay + 0.5) / cycleDuration, 0.65, 0.75, 0.85, 0.92, 1],
                  repeat: Infinity,
                }}
              >
                Block {i + 1}
              </motion.text>

              {/* Hash text */}
              <motion.text
                x={x + 50} y="62" textAnchor="middle"
                fontSize="10" fontFamily="monospace"
                fill="#60a5fa"
                initial={{ opacity: 0 }}
                animate={isPlaying ? {
                  opacity: [0, 0, 0.8, 0.8, 0.8, 0.8, 0.8, 0],
                } : { opacity: 0 }}
                transition={{
                  duration: cycleDuration,
                  times: [0, blockDelay / cycleDuration, (blockDelay + 0.6) / cycleDuration, 0.65, 0.75, 0.85, 0.92, 1],
                  repeat: Infinity,
                }}
              >
                {block.hash}
              </motion.text>

              {/* Transaction lines inside block */}
              {[78, 90, 102].map((lineY, li) => (
                <motion.line
                  key={li}
                  x1={x + 18} y1={lineY} x2={x + 82 - li * 8} y2={lineY}
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  initial={{ opacity: 0 }}
                  animate={isPlaying ? {
                    opacity: [0, 0, 0.6, 0.6, 0.6, 0.6, 0.6, 0],
                  } : { opacity: 0 }}
                  transition={{
                    duration: cycleDuration,
                    times: [0, (blockDelay + 0.3 + li * 0.15) / cycleDuration, (blockDelay + 0.6 + li * 0.15) / cycleDuration, 0.65, 0.75, 0.85, 0.92, 1],
                    repeat: Infinity,
                  }}
                />
              ))}

              {/* Chain link arrow to next block */}
              {i < 2 && (
                <motion.g
                  initial={{ opacity: 0 }}
                  animate={isPlaying ? {
                    opacity: [0, 0, 0, 1, 1, 1, 1, 0],
                  } : { opacity: 0 }}
                  transition={{
                    duration: cycleDuration,
                    times: [0, (blockDelay + 0.8) / cycleDuration, (blockDelay + 1.0) / cycleDuration, (blockDelay + 1.4) / cycleDuration, 0.75, 0.85, 0.92, 1],
                    repeat: Infinity,
                  }}
                >
                  {/* Dashed link line */}
                  <motion.line
                    x1={x + 102} y1="70" x2={x + 113} y2="70"
                    stroke="#1d4ed8"
                    strokeWidth="2"
                    strokeDasharray="3 2"
                  />
                  {/* Arrow tip */}
                  <motion.path
                    d={`M ${x + 111} 66 L ${x + 115} 70 L ${x + 111} 74`}
                    stroke="#1d4ed8"
                    strokeWidth="2"
                    fill="none"
                  />
                </motion.g>
              )}

              {/* Confirmation glow pulse */}
              <motion.rect
                x={x - 2} y="18" width="104" height="104" rx="14"
                stroke="#60a5fa"
                strokeWidth="2"
                fill="none"
                initial={{ opacity: 0 }}
                animate={isPlaying ? {
                  opacity: [0, 0, 0, 0, 0.8, 0, 0, 0],
                } : { opacity: 0 }}
                transition={{
                  duration: cycleDuration,
                  times: [0, 0.6, 0.68, 0.72, 0.78, 0.88, 0.95, 1],
                  repeat: Infinity,
                }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function AnimatedMiners({ isPlaying }: GraphicProps) {
  // 10s animation cycle.
  const cycle = 10;

  const miners = [
    { id: 'm1', x: 130, y: 20, isWinner: false, label: "Node A" },
    { id: 'm2', x: 290, y: 20, isWinner: true, label: "Node B" },
    { id: 'm3', x: 130, y: 180, isWinner: false, label: "Node C" },
    { id: 'm4', x: 290, y: 180, isWinner: false, label: "Node D" },
  ];

  const targetBlock = { x: 210, y: 100, w: 45, h: 50 };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 340 240" className="w-full h-full" fill="none">
        {/* Master fade wrapper */}
        <motion.g
          animate={isPlaying ? {
            opacity: [0, 1, 1, 1, 0],
          } : { opacity: 1 }}
          transition={{ duration: cycle, times: [0, 0.03, 0.5, 0.92, 1], repeat: Infinity }}
        >
        {/* Existing Blockchain (far left side) */}
        <rect x="20" y="100" width="45" height="50" rx="6" stroke="#1e3a8a" strokeWidth="2" fill="rgba(30, 58, 138, 0.4)" />
        <rect x="80" y="100" width="45" height="50" rx="6" stroke="#3b82f6" strokeWidth="2" fill="rgba(30, 58, 138, 0.4)" />
        <line x1="65" y1="125" x2="80" y2="125" stroke="#3b82f6" strokeWidth="2" strokeDasharray="2 2" />

        {/* Lasers from miners to target block */}
        {miners.map((miner) => {
          const mX = miner.x + 20;
          const mY = miner.y + 20;
          const bX = targetBlock.x + targetBlock.w / 2;
          const bY = targetBlock.y + targetBlock.h / 2;

          return (
            <g key={`laser-${miner.id}`}>
              {/* Racing lasers (all miners 0-4s) */}
              <motion.line
                x1={mX} y1={mY} x2={bX} y2={bY}
                stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 6"
                initial={{ opacity: 0 }}
                animate={isPlaying ? {
                  opacity: [0, 0, 0.6, 0.6, 0, 0],
                  strokeDashoffset: [20, 20, 0, -20, -20, -20]
                } : { opacity: 0 }}
                transition={{
                  duration: cycle,
                  times: [0, 0.03, 0.05, 0.4, 0.41, 1],
                  repeat: Infinity,
                  ease: "linear"
                }}
              />

              {/* Winning laser locking in (winner only, 4-6s) */}
              {miner.isWinner && (
                <motion.line
                  x1={mX} y1={mY} x2={bX} y2={bY}
                  stroke="#60a5fa" strokeWidth="3"
                  initial={{ opacity: 0 }}
                  animate={isPlaying ? {
                    opacity: [0, 0, 1, 1, 0, 0],
                  } : { opacity: 0 }}
                  transition={{
                    duration: cycle,
                    times: [0, 0.4, 0.4, 0.6, 0.6, 1],
                    repeat: Infinity,
                  }}
                />
              )}
            </g>
          );
        })}

        {/* The Target Empty Block */}
        <motion.g
          animate={isPlaying ? {
            x: [0, 0, 0, 0, -70, -70],
          } : { x: 0 }}
          transition={{ duration: cycle, times: [0, 0.6, 0.75, 0.85, 0.9, 1], repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.rect
            x={targetBlock.x} y={targetBlock.y} width={targetBlock.w} height={targetBlock.h} rx="6"
            stroke="#60a5fa" strokeWidth="2" strokeDasharray="4 4"
            fill="rgba(30, 58, 138, 0.1)"
            animate={isPlaying ? {
              strokeDasharray: ["4 4", "4 4", "0 0", "0 0", "0 0"],
              stroke: ["#60a5fa", "#60a5fa", "#60a5fa", "#3b82f6", "#3b82f6"],
              fill: ["rgba(30,58,138,0.1)", "rgba(30,58,138,0.1)", "rgba(96,165,250,0.2)", "rgba(30,58,138,0.4)", "rgba(30,58,138,0.4)"]
            } : {}}
            transition={{ duration: cycle, times: [0, 0.4, 0.41, 0.75, 1], repeat: Infinity }}
          />
          <motion.text
            x={targetBlock.x + targetBlock.w / 2} y={targetBlock.y + 30} textAnchor="middle" fill="#93c5fd" fontSize="20"
            animate={isPlaying ? { opacity: [1, 1, 0, 0] } : { opacity: 1 }}
            transition={{ duration: cycle, times: [0, 0.4, 0.41, 1], repeat: Infinity }}
          >?</motion.text>

          <motion.text
            x={targetBlock.x + targetBlock.w / 2} y={targetBlock.y + 30} textAnchor="middle" fill="#93c5fd" fontSize="12" fontWeight="bold" fontFamily="monospace"
            initial={{ opacity: 0 }}
            animate={isPlaying ? { opacity: [0, 0, 1, 1, 0] } : { opacity: 0 }}
            transition={{ duration: cycle, times: [0, 0.4, 0.41, 0.9, 0.91], repeat: Infinity }}
          >#c9a2</motion.text>
        </motion.g>

        {/* Chain Link appearing between new block and existing chain */}
        <motion.line
          x1="125" y1="125" x2="140" y2="125" stroke="#3b82f6" strokeWidth="2" strokeDasharray="2 2"
          initial={{ opacity: 0 }}
          animate={isPlaying ? { opacity: [0, 0, 0, 1, 1, 0] } : { opacity: 0 }}
          transition={{ duration: cycle, times: [0, 0.75, 0.85, 0.9, 0.91, 1], repeat: Infinity }}
        />

        {/* The Miners (Server Racks) */}
        {miners.map((miner, i) => (
          <g key={miner.id}>
            <motion.rect
              x={miner.x} y={miner.y} width="40" height="40" rx="4"
              stroke="#3b82f6" strokeWidth="2" fill="rgba(30, 58, 138, 0.5)"
              animate={isPlaying ? {
                stroke: miner.isWinner ? ["#3b82f6", "#3b82f6", "#60a5fa", "#60a5fa", "#3b82f6"] : "#3b82f6",
                fill: miner.isWinner ? ["rgba(30,58,138,0.5)", "rgba(30,58,138,0.5)", "rgba(96,165,250,0.2)", "rgba(96,165,250,0.2)", "rgba(30,58,138,0.5)"] : "rgba(30,58,138,0.5)",
                opacity: miner.isWinner ? 1 : [1, 1, 0.3, 0.3, 1],
              } : {}}
              transition={{ duration: cycle, times: [0, 0.4, 0.41, 0.95, 1], repeat: Infinity }}
            />
            <motion.circle
              cx={miner.x + 30} cy={miner.y + 10} r="2"
              fill="#60a5fa"
              animate={isPlaying ? { opacity: [1, 0, 1] } : { opacity: 1 }}
              transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }}
            />
            <motion.circle
              cx={miner.x + 30} cy={miner.y + 20} r="2"
              fill="#60a5fa"
              animate={isPlaying ? { opacity: [1, 0, 1] } : { opacity: 1 }}
              transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.2 }}
            />

            <motion.text
              x={miner.x + 20} y={miner.y - 8} textAnchor="middle" fontSize="10" fill="#93c5fd"
              animate={isPlaying ? {
                opacity: miner.isWinner ? 1 : [1, 1, 0.3, 0.3, 1],
                fill: miner.isWinner ? ["#93c5fd", "#93c5fd", "#bfdbfe", "#bfdbfe", "#93c5fd"] : "#93c5fd"
              } : {}}
              transition={{ duration: cycle, times: [0, 0.4, 0.41, 0.95, 1], repeat: Infinity }}
            >{miner.label}</motion.text>

            <motion.text
              x={miner.x + 20} y={miner.y + 55} textAnchor="middle" fontSize="10" fontFamily="monospace" fill="#60a5fa"
              initial={{ opacity: 0 }}
              animate={isPlaying ? {
                opacity: [0, 1, 1, 0, 0]
              } : { opacity: 0 }}
              transition={{ duration: cycle, times: [0, 0.05, 0.39, 0.4, 1], repeat: Infinity }}
            >
              {miner.isWinner ? "0x000..." : "0x4f2..."}
            </motion.text>
          </g>
        ))}

        {/* The Bitcoin Block Reward */}
        <motion.g
          initial={{ opacity: 0, scale: 0 }}
          animate={isPlaying ? {
            opacity: [0, 0, 1, 1, 0, 0],
            scale: [0, 0, 1, 1, 1, 0],
            x: [0, 0, 0, 310 - 232.5, 310 - 232.5, 0],
            y: [0, 0, 0, 40 - 125, 40 - 125, 0]
          } : { opacity: 0 }}
          transition={{
            duration: cycle,
            times: [0, 0.6, 0.61, 0.75, 0.82, 0.83],
            repeat: Infinity,
            ease: "easeOut"
          }}
        >
          <circle cx="232.5" cy="125" r="10" fill="#f59e0b" />
          <text x="232.5" y="129" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">&#x20bf;</text>
        </motion.g>
        </motion.g>
      </svg>
    </div>
  );
}

export function AnimatedTransaction({ isPlaying }: GraphicProps) {
  const cycle = 8;

  const mempoolTxs = [
    { id: 0, x: 30, y: 100, bx: 228, by: 98 },
    { id: 1, x: 70, y: 80, bx: 246, by: 98 },
    { id: 2, x: 50, y: 115, bx: 264, by: 98 },
    { id: 3, x: 80, y: 125, bx: 237, by: 116 },
    { id: 4, x: 40, y: 140, bx: 255, by: 116 },
  ];

  const newTx = { x: 65, y: 145, startY: 30, bx: 273, by: 116 };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 340 240" className="w-full h-full" fill="none">

        {/* Mempool Container */}
        <motion.rect
          x="15" y="70" width="100" height="110" rx="10"
          stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="4 4"
        />
        <text x="65" y="55" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="12" fontFamily="monospace">Mempool</text>

        {/* Existing Mempool Transactions */}
        {mempoolTxs.map((tx) => (
          <motion.rect
            key={tx.id}
            width="14" height="14" rx="3"
            stroke="#3b82f6" strokeWidth="1.5"
            fill="rgba(59,130,246,0.2)"
            initial={{ opacity: 0, x: tx.x, y: tx.y }}
            animate={isPlaying ? {
              opacity: [0, 1, 1, 1, 1, 0, 0, 0],
              x: [tx.x, tx.x, tx.x, tx.bx, tx.bx, tx.bx, tx.bx, tx.x],
              y: [tx.y, tx.y, tx.y, tx.by, tx.by, tx.by, tx.by, tx.y],
              scale: [0.8, 1, 1, 1, 1, 1, 0, 0.8]
            } : { opacity: 0 }}
            transition={{
              duration: cycle,
              times: [0, 0.05, 0.4, 0.55, 0.7, 0.75, 0.9, 1],
              ease: "easeInOut",
              repeat: Infinity
            }}
          />
        ))}

        {/* The New Highlighted Transaction dropping in */}
        <motion.rect
          width="14" height="14" rx="3"
          stroke="#f59e0b" strokeWidth="2"
          fill="rgba(245,158,11,0.3)"
          initial={{ opacity: 0, x: newTx.x, y: newTx.startY }}
          animate={isPlaying ? {
            opacity: [0, 1, 1, 1, 1, 1, 0, 0],
            x: [newTx.x, newTx.x, newTx.x, newTx.bx, newTx.bx, newTx.bx, newTx.bx, newTx.x],
            y: [newTx.startY, newTx.y, newTx.y, newTx.by, newTx.by, newTx.by, newTx.by, newTx.startY],
            scale: [0.8, 1, 1, 1, 1, 1, 0, 0.8]
          } : { opacity: 0 }}
          transition={{
            duration: cycle,
            times: [0, 0.15, 0.4, 0.55, 0.7, 0.75, 0.9, 1],
            ease: "easeInOut",
            repeat: Infinity
          }}
        />

        {/* Bundling Beam / Arrow */}
        <motion.path
          d="M 125 125 Q 170 125 210 125"
          stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4" fill="none"
          initial={{ opacity: 0 }}
          animate={isPlaying ? {
            opacity: [0, 0, 1, 1, 0, 0, 0],
            strokeDashoffset: [20, 20, 0, -20, -20, -20, 20]
          } : { opacity: 0 }}
          transition={{
            duration: cycle,
            times: [0, 0.35, 0.45, 0.6, 0.65, 0.9, 1],
            ease: "linear",
            repeat: Infinity
          }}
        />
        <motion.polygon
          points="205,120 215,125 205,130"
          fill="#3b82f6"
          initial={{ opacity: 0 }}
          animate={isPlaying ? {
            opacity: [0, 0, 1, 1, 0, 0, 0]
          } : { opacity: 0 }}
          transition={{
            duration: cycle,
            times: [0, 0.35, 0.45, 0.6, 0.65, 0.9, 1],
            repeat: Infinity
          }}
        />

        {/* The Target Empty Block */}
        <motion.rect
          x="220" y="90" width="75" height="55" rx="6"
          stroke="#60a5fa" strokeWidth="2" strokeDasharray="4 4"
          fill="rgba(30, 58, 138, 0.1)"
          initial={{ opacity: 0 }}
          animate={isPlaying ? {
            opacity: [0, 1, 1, 1, 1, 0, 0],
            strokeDasharray: ["4 4", "4 4", "4 4", "0 0", "0 0", "0 0", "4 4"],
            stroke: ["#60a5fa", "#60a5fa", "#60a5fa", "#3b82f6", "#3b82f6", "#3b82f6", "#60a5fa"],
            fill: ["rgba(30,58,138,0.1)", "rgba(30,58,138,0.1)", "rgba(30,58,138,0.1)", "rgba(30,58,138,0.6)", "rgba(30,58,138,0.6)", "rgba(30,58,138,0.1)", "rgba(30,58,138,0.1)"]
          } : { opacity: 0 }}
          transition={{
            duration: cycle,
            times: [0, 0.05, 0.55, 0.6, 0.8, 0.9, 1],
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Block Header Text appearing */}
        <motion.text
          x="257.5" y="80" textAnchor="middle" fill="#93c5fd" fontSize="12" fontFamily="monospace" fontWeight="bold"
          initial={{ opacity: 0 }}
          animate={isPlaying ? {
            opacity: [0, 0, 0, 1, 1, 0, 0, 0]
          } : { opacity: 0 }}
          transition={{
            duration: cycle,
            times: [0, 0.55, 0.6, 0.65, 0.8, 0.9, 0.95, 1],
            repeat: Infinity
          }}
        >
          Block #840
        </motion.text>

        {/* Solid Block Overlap */}
        <motion.rect
          x="220" y="90" width="75" height="55" rx="6"
          stroke="#3b82f6" strokeWidth="2"
          fill="rgba(30, 58, 138, 0.8)"
          initial={{ opacity: 0 }}
          animate={isPlaying ? {
            opacity: [0, 0, 0, 1, 1, 0, 0, 0]
          } : { opacity: 0 }}
          transition={{
            duration: cycle,
            times: [0, 0.55, 0.6, 0.65, 0.8, 0.9, 0.95, 1],
            repeat: Infinity
          }}
        />

        {/* Pulse effect on bundled block */}
        <motion.rect
          x="218" y="88" width="79" height="59" rx="8"
          stroke="#60a5fa" strokeWidth="2"
          fill="none"
          initial={{ opacity: 0 }}
          animate={isPlaying ? {
            opacity: [0, 0, 0, 0.8, 0, 0, 0]
          } : { opacity: 0 }}
          transition={{
            duration: cycle,
            times: [0, 0.6, 0.65, 0.7, 0.85, 0.9, 1],
            repeat: Infinity
          }}
        />

      </svg>
    </div>
  );
}

export function AnimatedLens({ isPlaying }: GraphicProps) {
  const cycle = 8;
  const hexRows = [
    "010000000000000000000000000000000000000000000000000000000000",
    "3ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e",
    "ac529241b21245fa87563dfa823145464523fa9a12c4bbf942a123fbbba2",
    "3ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e",
    "12a9cbf45ba253fa2847cbaeafe82f45cc35b7e8d64ebfc3e45cb4ed9cba",
    "8ab9f902ac21baef4834ff24a2cbeaf139fcbcda241badcefaafeabcde2f",
    "3ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e",
    "12a9cbf45ba253fa2847cbaeafe82f45cc35b7e8d64ebfc3e45cb4ed9cba",
    "8ab9f902ac21baef4834ff24a2cbeaf139fcbcda241badcefaafeabcde2f",
    "ac529241b21245fa87563dfa823145464523fa9a12c4bbf942a123fbbba2",
    "3ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e",
    "12a9cbf45ba253fa2847cbaeafe82f45cc35b7e8d64ebfc3e45cb4ed9cba",
  ];

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 340 240" className="w-full h-full" fill="none">

        <defs>
          <clipPath id="ui-clip">
            <motion.rect
              y="0" height="240"
              initial={{ x: 0, width: 0 }}
              animate={isPlaying ? { width: [0, 340, 340, 0] } : {}}
              transition={{ duration: cycle, times: [0, 0.7, 0.9, 1], repeat: Infinity, ease: "easeInOut" }}
            />
          </clipPath>
          <clipPath id="hex-clip">
            <motion.rect
              y="0" height="240"
              initial={{ x: 0, width: 340 }}
              animate={isPlaying ? { x: [0, 340, 340, 0], width: [340, 0, 0, 340] } : {}}
              transition={{ duration: cycle, times: [0, 0.7, 0.9, 1], repeat: Infinity, ease: "easeInOut" }}
            />
          </clipPath>
        </defs>

        {/* BACKGROUND: RAW HEX DATA */}
        <g clipPath="url(#hex-clip)">
          {hexRows.map((row, i) => (
             <text key={i} x="5" y={15 + i * 20} fill="#1e3a8a" fontSize="10" fontFamily="monospace" letterSpacing="1">
               {row}
             </text>
          ))}
        </g>

        {/* FOREGROUND: STRUCTURED UI */}
        <g clipPath="url(#ui-clip)">
          {/* Header Card */}
          <rect x="20" y="20" width="300" height="70" rx="8" fill="rgba(15, 23, 42, 0.8)" stroke="#3b82f6" strokeWidth="2" />
          <text x="35" y="45" fill="#f59e0b" fontSize="14" fontWeight="bold">Block Header</text>
          <text x="35" y="65" fill="#93c5fd" fontSize="12" fontFamily="monospace">Hash: 00000000000000000003b4...</text>
          <text x="35" y="80" fill="#93c5fd" fontSize="10">Version: 4 &bull; Time: 2024-05-12 14:30:00</text>

          {/* Tx Card 1 */}
          <rect x="20" y="105" width="140" height="50" rx="6" fill="rgba(15, 23, 42, 0.8)" stroke="#60a5fa" strokeWidth="1" strokeDasharray="4 4" />
          <text x="30" y="125" fill="#fff" fontSize="12" fontWeight="bold">Tx 1 <tspan fill="#f59e0b" fontWeight="normal">(Coinbase)</tspan></text>
          <text x="30" y="145" fill="#60a5fa" fontSize="10">Reward: 3.125 BTC</text>

          {/* Tx Card 2 */}
          <rect x="180" y="105" width="140" height="50" rx="6" fill="rgba(15, 23, 42, 0.8)" stroke="#60a5fa" strokeWidth="1" strokeDasharray="4 4" />
          <text x="190" y="125" fill="#fff" fontSize="12" fontWeight="bold">Tx 2</text>
          <text x="190" y="145" fill="#60a5fa" fontSize="10">Value: 0.50 BTC</text>

          {/* Extra generic lines to fill space */}
          <rect x="20" y="170" width="140" height="50" rx="6" fill="rgba(15, 23, 42, 0.8)" stroke="#1e3a8a" strokeWidth="1" />
          <text x="30" y="193" fill="#3b82f6" fontSize="10">Tx 3 ...</text>

          <rect x="180" y="170" width="140" height="50" rx="6" fill="rgba(15, 23, 42, 0.8)" stroke="#1e3a8a" strokeWidth="1" />
          <text x="190" y="193" fill="#3b82f6" fontSize="10">Tx 4 ...</text>
        </g>

        {/* THE SCANNER BEAM */}
        <motion.g
          initial={{ x: 0 }}
          animate={isPlaying ? { x: [0, 340, 340, 0] } : {}}
          transition={{ duration: cycle, times: [0, 0.7, 0.9, 1], repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Vertical Laser Line */}
          <line
            x1="0" y1="0" x2="0" y2="240"
            stroke="#f59e0b" strokeWidth="2"
            style={{ filter: "drop-shadow(0 0 6px #f59e0b)" }}
          />
          {/* Gradient Scanner Glow Behind Laser */}
          <rect
            x="-40" y="0" width="40" height="240"
            fill="url(#scanGlow)"
          />
        </motion.g>

        {/* Glow Def */}
        <defs>
          <linearGradient id="scanGlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(245, 158, 11, 0)" />
            <stop offset="100%" stopColor="rgba(245, 158, 11, 0.3)" />
          </linearGradient>
        </defs>

      </svg>
    </div>
  );
}
