"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  AnimatedTrail,
  AnimatedCIOH,
  AnimatedChange,
  AnimatedDots,
} from "./StoryGraphics";

type StoryCard = {
  graphic: React.ComponentType<{ isPlaying: boolean }>;
  step: number;
  title: string;
  description: string;
  theme?: "gold" | "blue";
};

const CARDS: StoryCard[] = [
  {
    graphic: AnimatedTrail,
    step: 1,
    title: "The immutable digital footprint",
    description:
      "Bitcoin operates on a transparent, immutable public ledger. Every transfer, every input, and every output leaves a permanent trace. Sherlock follows these digital footprints, uncovering the truth behind the pseudonyms.",
    theme: "blue",
  },
  {
    graphic: AnimatedCIOH,
    step: 2,
    title: "The Common Input Ownership Heuristic",
    description:
      "When a transaction spends multiple coins together, Sherlock assumes all those inputs belong to the same entity. This is the Common Input Ownership Heuristic (CIOH)—the foundational rule that links isolated addresses into undeniable clusters.",
    theme: "blue",
  },
  {
    graphic: AnimatedChange,
    step: 3,
    title: "Change always returns home",
    description:
      "Just like paying with a ₹500 note for a ₹300 item, Bitcoin sends change back to the sender. Sherlock detects this change output using script type matching, round number analysis, and value heuristics.",
    theme: "blue",
  },
  {
    graphic: AnimatedDots,
    step: 4,
    title: "Sherlock connects the dots",
    description:
      "Using 8 independent heuristics, Sherlock classifies every transaction: simple payments, consolidations, CoinJoins, self-transfers, and more. Patterns emerge from the noise.",
    theme: "blue",
  },
];

function StoryCard({ card, index }: { card: StoryCard; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    margin: "-30% 0px -30% 0px",
    once: false,
  });

  const Graphic = card.graphic;

  const isEven = index % 2 === 0;
  const isBlue = card.theme === "blue";

  // Dynamic theme variables
  const primaryColor = isBlue ? "#3b82f6" : "#d4a546"; // blue-500 vs gold
  const lightColor = isBlue ? "#60a5fa" : "#d4a546"; // blue-400 vs gold
  const glowHex = isBlue ? "59,130,246" : "212,165,70";
  const borderClass = isBlue ? "border-blue-500/40" : "border-brand-500/40";
  const containerBorderClass = isBlue ? "border-blue-500/30" : "border-brand-500/30";

  return (
    <div ref={ref} className="relative flex flex-col md:flex-row items-center justify-between w-full min-h-[50vh] py-16 group">
      {/* 
        THE CONNECTOR LINE FILL
        A line that drops down to connect the nodes 
      */}
      <div className="absolute left-6 md:left-1/2 md:-ml-px top-0 bottom-0 w-0.5">
        <motion.div 
          className="w-full origin-top opacity-30"
          initial={{ scaleY: 0 }}
          animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ height: '100%', backgroundColor: primaryColor }}
        />
      </div>

      {/* Timeline node */}
      <div 
        className="absolute left-4 md:left-1/2 md:-ml-2.25 w-4.5 h-4.5 rounded-full border-4 border-black z-10 transition-colors duration-500 flex items-center justify-center"
        style={{ backgroundColor: isInView ? primaryColor : '#27272a' }}
      >
        {isInView && (
          <motion.div
            className={`absolute rounded-full border ${borderClass} pointer-events-none w-9 h-9`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
          />
        )}
      </div>

      {/* Left Side (Content A) */}
      <div className={`w-full md:w-[45%] pl-16 md:pl-0 flex ${isEven ? 'md:justify-end' : 'md:justify-start'} ${isEven ? 'md:order-1' : 'md:order-2'}`}>
        <motion.div
          initial={{ opacity: 0, x: isEven ? -30 : 30 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0.2, x: isEven ? -30 : 30 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className={`flex flex-col items-start w-full max-w-lg p-6 md:p-8 rounded-3xl transition-all duration-700 ${
            isInView ? "bg-black/60 border border-white/10 backdrop-blur-md shadow-xl" : "bg-transparent border border-transparent"
          }`}
        >
          <div 
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl font-mono text-base font-bold mb-5 transition-colors duration-500"
            style={{ 
              backgroundColor: isInView ? `rgba(${glowHex},0.15)` : 'rgba(255,255,255,0.05)',
              borderWidth: 1,
              borderColor: isInView ? `rgba(${glowHex},0.3)` : 'rgba(255,255,255,0.1)',
              color: isInView ? lightColor : '#a1a1aa',
            }}
          >
            0{card.step}
          </div>
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight leading-tight">
            {card.title}
          </h3>
          <p className="text-zinc-400 leading-relaxed text-lg">
            {card.description}
          </p>
        </motion.div>
      </div>

      {/* Right Side (Graphic B) */}
      <div className={`w-full md:w-[45%] pl-16 md:pl-0 mt-8 md:mt-0 flex ${isEven ? 'md:justify-start' : 'md:justify-end'} ${isEven ? 'md:order-2' : 'md:order-1'}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0.2, scale: 0.95 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className={`w-full max-w-md aspect-4/3 rounded-3xl border flex items-center justify-center p-6 md:p-8 transition-all duration-700 relative overflow-hidden ${
            isInView 
              ? `bg-[#0a0a0f]/90 ${containerBorderClass} backdrop-blur-md` 
              : "bg-zinc-900/40 border-white/5"
          }`}
          style={isInView ? { boxShadow: `0 0 40px -10px rgba(${glowHex}, 0.15)` } : undefined}
        >
          {/* Subtle glow behind the graphic */}
          <div 
            className={`absolute inset-0 transition-opacity duration-700 ${isInView ? "opacity-100" : "opacity-0"}`} 
            style={{ backgroundColor: `rgba(${glowHex},0.04)` }}
          />
          <div className="relative z-10 w-full h-full flex items-center justify-center pointer-events-none">
            <Graphic isPlaying={isInView} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function StorySection() {
  return (
    <section className="w-full max-w-5xl mx-auto py-24 px-6 relative z-10">
      {/* Vertical timeline line (dim background line) */}
      <div className="absolute left-6 md:left-1/2 md:-ml-px top-0 bottom-0 w-0.5 bg-white/5" />

      {CARDS.map((card, i) => (
        <StoryCard key={i} card={card} index={i} />
      ))}
    </section>
  );
}
