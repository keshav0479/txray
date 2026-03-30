"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Eye, Shield, Hammer } from "lucide-react";

const TOOLS = [
  {
    href: "/lens",
    title: "Lens",
    icon: Eye,
    description: "Parse and visualize Bitcoin transactions and blocks",
    brand: "lens",
    glow: "glow-lens",
  },
  {
    href: "/sherlock",
    title: "Sherlock",
    icon: Shield,
    description: "Privacy heuristics, wallet fingerprinting, entropy analysis",
    brand: "sherlock",
    glow: "glow-sherlock",
  },
  {
    href: "/smith",
    title: "Smith",
    icon: Hammer,
    description: "Build PSBTs with coin selection and fee estimation",
    brand: "lens",
    glow: "glow-lens",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 relative">
      {/* Subtle grid background */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center text-center z-10"
      >
        <span className="text-6xl mb-6">⟐</span>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white mb-4">
          txray
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 max-w-lg mb-16 leading-relaxed">
          See through Bitcoin transactions.
          <br />
          Parse, analyze, fingerprint, build.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full z-10">
        {TOOLS.map((tool, i) => (
          <motion.div
            key={tool.href}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
          >
            <Link
              href={tool.href}
              className={`group glass-card ${tool.glow} rounded-2xl p-8 flex flex-col gap-4 transition-all hover:scale-[1.02] active:scale-[0.98]`}
            >
              <tool.icon className={`w-8 h-8 text-${tool.brand}-400`} />
              <h2 className="text-2xl font-bold text-white">{tool.title}</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {tool.description}
              </p>
              <div className="flex items-center gap-1.5 text-sm text-zinc-500 group-hover:text-zinc-300 transition-colors mt-auto">
                Open
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.8 }}
        className="mt-16 text-xs text-zinc-600 z-10"
      >
        8 crates · 318 tests · zero backend · runs in your browser
      </motion.p>
    </div>
  );
}
