"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import createGlobe from "cobe";

interface GraphicProps {
  isPlaying: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AnimatedGlobe(_props: GraphicProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phiRef = useRef(0);
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Marker locations for global Bitcoin network nodes
    const markerLocations: [number, number][] = [
      [40.7128, -74.006],    // New York
      [51.5074, -0.1278],    // London
      [35.6762, 139.6503],   // Tokyo
      [1.3521, 103.8198],    // Singapore
      [-33.8688, 151.2093],  // Sydney
      [37.7749, -122.4194],  // San Francisco
      [25.2048, 55.2708],    // Dubai
      [19.076, 72.8777],     // Mumbai
      [-23.5505, -46.6333],  // São Paulo
      [-1.2921, 36.8219],    // Nairobi
      [52.52, 13.405],       // Berlin
      [37.5665, 126.978],    // Seoul
      [28.6139, 77.209],     // Delhi
      [12.9716, 77.5946],    // Bangalore
      [6.5244, 3.3792],      // Lagos
      [-33.9249, 18.4241],   // Cape Town
      [-34.6037, -58.3816],  // Buenos Aires
      [19.4326, -99.1332],   // Mexico City
      [43.6532, -79.3832],   // Toronto
      [-6.2088, 106.8456],   // Jakarta
    ];

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 600,
      height: 600,
      phi: 0,
      theta: 0.25,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 2,
      baseColor: [0.12, 0.20, 0.45],      // Blue-ish globe surface
      markerColor: [0.23, 0.51, 0.96],     // Bright blue markers
      glowColor: [0.06, 0.10, 0.30],       // Dark blue glow
      markers: markerLocations.map((location, i) => ({
        location,
        size: 0.05 + Math.sin(i) * 0.02,
      })),
    });

    globeRef.current = globe;

    // Animation loop to rotate the globe and pulse markers
    let frame = 0;
    const animate = () => {
      phiRef.current += 0.002; // Slow rotation
      frame += 1;
      const t = frame * 0.02;

      globe.update({
        phi: phiRef.current,
        markers: markerLocations.map((location, i) => ({
          location,
          size: 0.03 + Math.abs(Math.sin(t + i * 0.8)) * 0.06,
        })),
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      globe.destroy();
      globeRef.current = null;
    };
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        width={600}
        height={600}
        style={{ 
          width: "100%", 
          height: "100%",
          maxWidth: "300px",
          maxHeight: "300px",
          objectFit: "contain"
        }}
      />
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
                fill="rgba(30, 58, 138, 0.4)" // brand-900 / dark blue fill
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
                fill="#93c5fd" // brand-300
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
                fill="#60a5fa" // brand-400
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
                  stroke="#2563eb" // brand-600
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
                    stroke="#1d4ed8" // brand-700
                    strokeWidth="2"
                    strokeDasharray="3 2"
                  />
                  {/* Arrow tip */}
                  <motion.path
                    d={`M ${x + 111} 66 L ${x + 115} 70 L ${x + 111} 74`}
                    stroke="#1d4ed8" // brand-700
                    strokeWidth="2"
                    fill="none"
                  />
                </motion.g>
              )}

              {/* Confirmation glow pulse */}
              <motion.rect
                x={x - 2} y="18" width="104" height="104" rx="14"
                stroke="#60a5fa" // Bright blue glow
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
    { id: 'm1', x: 130, y: 20, isWinner: false, label: "Node A" },   // Top left
    { id: 'm2', x: 290, y: 20, isWinner: true, label: "Node B" },    // Top right (Winner)
    { id: 'm3', x: 130, y: 180, isWinner: false, label: "Node C" },  // Bottom left
    { id: 'm4', x: 290, y: 180, isWinner: false, label: "Node D" },  // Bottom right
  ];

  const targetBlock = { x: 210, y: 100, w: 45, h: 50 };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 340 240" className="w-full h-full" fill="none">
        {/* Master fade wrapper — fades entire scene at cycle boundary for seamless loop */}
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
          const mX = miner.x + 20; // Center of miner
          const mY = miner.y + 20;
          const bX = targetBlock.x + targetBlock.w / 2; // Center of target block
          const bY = targetBlock.y + targetBlock.h / 2;
          
          return (
            <g key={`laser-${miner.id}`}>
              {/* Racing lasers (all miners 0-4s) - ALWAYS BLUE */}
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

              {/* Winning laser locking in (winner only, 4-6s) - BLUE */}
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
                    times: [0, 0.4, 0.4, 0.6, 0.6, 1], // Active 4s to 6s
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
          {/* Block lock icon or hash target */}
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
            {/* Server Rack Body */}
            <motion.rect
              x={miner.x} y={miner.y} width="40" height="40" rx="4"
              stroke="#3b82f6" strokeWidth="2" fill="rgba(30, 58, 138, 0.5)"
              animate={isPlaying ? {
                // Winner turns brighter blue at 4s. Others dim at 4s.
                stroke: miner.isWinner ? ["#3b82f6", "#3b82f6", "#60a5fa", "#60a5fa", "#3b82f6"] : "#3b82f6",
                fill: miner.isWinner ? ["rgba(30,58,138,0.5)", "rgba(30,58,138,0.5)", "rgba(96,165,250,0.2)", "rgba(96,165,250,0.2)", "rgba(30,58,138,0.5)"] : "rgba(30,58,138,0.5)",
                opacity: miner.isWinner ? 1 : [1, 1, 0.3, 0.3, 1],
              } : {}}
              transition={{ duration: cycle, times: [0, 0.4, 0.41, 0.95, 1], repeat: Infinity }}
            />
            {/* Blinking LEDs on servers */}
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
            
            {/* Node Labels */}
            <motion.text
              x={miner.x + 20} y={miner.y - 8} textAnchor="middle" fontSize="10" fill="#93c5fd"
              animate={isPlaying ? { 
                opacity: miner.isWinner ? 1 : [1, 1, 0.3, 0.3, 1],
                fill: miner.isWinner ? ["#93c5fd", "#93c5fd", "#bfdbfe", "#bfdbfe", "#93c5fd"] : "#93c5fd"
              } : {}}
              transition={{ duration: cycle, times: [0, 0.4, 0.41, 0.95, 1], repeat: Infinity }}
            >{miner.label}</motion.text>
            
            {/* Hashing text floating above miners (0-4s) */}
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

        {/* The Bitcoin Block Reward (Shoots from block to winner at 6-7.5s) */}
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
          <text x="232.5" y="129" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">₿</text>
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

        {/* Existing Mempool Transactions (Bobbing then flying into block) */}
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
            times: [0, 0.15, 0.4, 0.55, 0.7, 0.75, 0.9, 1], // Drops in 0-0.15
            ease: "easeInOut",
            repeat: Infinity
          }}
        />

        {/* Bundling Beam / Arrow (Active 0.35 to 0.6) */}
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

        {/* Solid Block Overlap (Hides individual Txs when bundled) */}
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
          <text x="35" y="80" fill="#93c5fd" fontSize="10">Version: 4 • Time: 2024-05-12 14:30:00</text>

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
