"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  ArrowRight,
  Eye,
  Shield,
  Hammer,
  Zap,
  Blocks,
  TrendingUp,
} from "lucide-react";
import { FAMOUS_ENTRIES, type FamousEntry } from "@/lib/famous";
import { detectSearchType, fetchFees, fetchTipHeight } from "@/lib/mempool";
import { Footer } from "@/components/shared/Footer";
import { SmithBackground } from "@/components/smith/SmithBackground";
import { LensMini, SherlockMini, SmithMini } from "@/components/shared/LandingIllustrations";
import { TiltCard } from "@/components/shared/TiltCard";
import { TxrayLogo } from "@/components/shared/TxrayLogo";

// pick a cleaner subset of famous entries for the landing chips
const CHIP_ENTRIES = FAMOUS_ENTRIES.filter((e) =>
  ["pizza-tx", "segwit-activation", "first-taproot"].includes(e.id),
);

const CAPABILITIES = [
  {
    icon: Eye,
    title: "Structure",
    subtitle: "Lens",
    description:
      "See every input, output, script, and byte. Understand how Bitcoin actually moves value.",
    color: "text-stone-300",
    border: "border-white/10",
    bg: "bg-white/5",
    glow: "group-hover:border-amber-500/30 group-hover:shadow-[0_0_30px_-10px_rgba(245,158,11,0.15)]",
    Illustration: LensMini,
    href: "/lens",
  },
  {
    icon: Shield,
    title: "Privacy",
    subtitle: "Sherlock",
    description:
      "Know your coin's privacy. Fingerprints, heuristics, entropy scoring, and actionable advice.",
    color: "text-stone-300",
    border: "border-white/10",
    bg: "bg-white/5",
    glow: "group-hover:border-amber-500/30 group-hover:shadow-[0_0_30px_-10px_rgba(245,158,11,0.15)]",
    Illustration: SherlockMini,
    href: "/sherlock",
  },
  {
    icon: Hammer,
    title: "Build",
    subtitle: "Smith",
    description:
      "Construct unsigned transactions with smart coin selection, fee estimation, and educational walkthrough.",
    color: "text-stone-300",
    border: "border-white/10",
    bg: "bg-white/5",
    glow: "group-hover:border-amber-500/30 group-hover:shadow-[0_0_30px_-10px_rgba(245,158,11,0.15)]",
    href: "/build",
    Illustration: SmithMini,
  },
];

function FamousChip({ entry }: { entry: FamousEntry }) {
  const href =
    entry.type === "tx"
      ? `/explore/tx/${entry.txid}`
      : `/explore/block/${entry.height}`;

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-white/5 text-stone-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all shrink-0"
    >
      {entry.name}
      <ArrowRight className="w-3 h-3 opacity-50" />
    </Link>
  );
}

export default function HomePage() {
  const router = useRouter();
  const logoRef = useRef<HTMLButtonElement>(null);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdActivatedRef = useRef(false);
  const holdProgressRef = useRef(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [tipHeight, setTipHeight] = useState<number | null>(null);
  const [fees, setFees] = useState<{
    fastestFee: number;
    halfHourFee: number;
    economyFee: number;
  } | null>(null);
  const [scanOrigin, setScanOrigin] = useState<{ x: number; y: number } | null>(null);
  const [scanPulses, setScanPulses] = useState<number[]>([]);
  const [returnPulses, setReturnPulses] = useState<number[]>([]);
  const [holdProgress, setHoldProgress] = useState(0);

  // compute origin from logo position
  const computeOrigin = useCallback(() => {
    if (logoRef.current) {
      const rect = logoRef.current.getBoundingClientRect();
      setScanOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }
  }, []);

  const startHold = useCallback(() => {
    computeOrigin();
    // INSTANT OUTWARD WAVE
    setScanPulses(prev => [...prev.slice(-4), Date.now()]);
    
    if (fadeTimerRef.current) { clearInterval(fadeTimerRef.current); fadeTimerRef.current = null; }
    holdDelayRef.current = setTimeout(() => {
      holdActivatedRef.current = true;
      holdTimerRef.current = setInterval(() => {
        setHoldProgress(prev => {
          const next = Math.min(1, prev + 0.013);
          holdProgressRef.current = next;
          return next;
        });
      }, 33);
    }, 400);
  }, [computeOrigin]);

  const stopHold = useCallback(() => {
    if (holdDelayRef.current) { clearTimeout(holdDelayRef.current); holdDelayRef.current = null; }
    if (holdTimerRef.current) { clearInterval(holdTimerRef.current); holdTimerRef.current = null; }

    // SNAPPY INWARD WAVE (THE ECHO): Only if we reached FULL CHARGE
    if (holdProgressRef.current >= 0.99) {
        setReturnPulses(prev => [...prev.slice(-4), Date.now()]);
    }

    holdProgressRef.current = 0;

    // fade back
    fadeTimerRef.current = setInterval(() => {
      setHoldProgress(prev => {
        const next = prev - 0.04;
        if (next <= 0) {
          if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
          holdActivatedRef.current = false;
          return 0;
        }
        return next;
      });
    }, 33);
  }, []);

  const handleClick = useCallback(() => {
    // Punches handled in pointer events for instant feel
  }, []);

  // cleanup pulses
  useEffect(() => {
    if (scanPulses.length === 0 && returnPulses.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setScanPulses(prev => prev.filter(t => now - t < 2500));
      setReturnPulses(prev => prev.filter(t => now - t < 1500));
    }, 1000);
    return () => clearInterval(interval);
  }, [scanPulses, returnPulses]);

  // cleanup timers
  useEffect(() => {
    return () => {
      if (holdDelayRef.current) clearTimeout(holdDelayRef.current);
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
      if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
    };
  }, []);

  // fetch live network stats
  useEffect(() => {
    fetchTipHeight()
      .then(setTipHeight)
      .catch(() => {});
    fetchFees()
      .then(setFees)
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    const type = detectSearchType(q);
    if (type === "txid") router.push(`/explore/tx/${q}`);
    else if (type === "block_height") router.push(`/explore/block/${q}`);
    else if (type === "block_hash") router.push(`/explore/block/${q}`);
    else router.push(`/explore/tx/${q}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── HERO ─── */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-16 relative">
        {/* Smith animated BTC mould grid */}
        <SmithBackground 
          scanPulses={scanPulses} 
          returnPulses={returnPulses} 
          scanOriginX={scanOrigin?.x} 
          scanOriginY={scanOrigin?.y} 
          holdProgress={holdProgress}
        />

        {/* Hero-specific vignette */}
        <div 
          className="absolute inset-0 pointer-events-none z-1" 
          style={{ 
            background: "radial-gradient(ellipse 55% 55% at 50% 50%, rgba(12,10,9,0.92) 0%, rgba(12,10,9,0.3) 60%, transparent 100%)" 
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center text-center z-10 max-w-3xl pt-8"
        >
          {/* Logo - hold to charge, click/release to pulse */}
          <motion.button
            ref={logoRef}
            initial={{ scale: 0.5, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.1 }}
            onClick={handleClick}
            onPointerDown={startHold}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            className="mb-8 cursor-pointer group"
            aria-label="Trigger X-Ray scan"
          >
            <div
              className="w-16 h-16 transition-all duration-300"
              style={{
                animation: "hero-float 6s ease-in-out infinite, hero-glow 3s ease-in-out infinite",
              }}
            >
              <TxrayLogo variant="mark" className="w-full h-full text-amber-500" />
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes hero-float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-4px); }
              }
              @keyframes hero-glow {
                0%, 100% { filter: drop-shadow(0 0 16px rgba(245,158,11,0.2)) brightness(1); }
                50% { filter: drop-shadow(0 0 32px rgba(245,158,11,0.5)) brightness(1.15); }
              }
            `}} />
          </motion.button>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter mb-5 leading-[1.1]">
            <span className="text-stone-400">See the story behind</span>
            <br />
            <span className="text-white">every Bitcoin transaction.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-stone-400 mb-10 leading-relaxed max-w-md">
            Privacy analysis, wallet fingerprinting, and transaction
            construction. Built right into your browser.
          </p>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            className="w-full max-w-lg mb-6 relative"
          >
            {/* Subtle glow specifically behind search */}
            <div className="absolute inset-0 bg-white/5 blur-xl rounded-full" />
            
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-amber-500 transition-colors" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter a txid, block height, or block hash..."
                className="w-full bg-stone-900/80 backdrop-blur-xl border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-stone-500 focus:outline-none focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/20 search-input transition-all shadow-2xl shadow-black/40"
              />
              {searchQuery.trim() && (
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-amber-600/20 text-amber-500 border border-amber-500/20 text-sm font-semibold hover:bg-amber-500/30 hover:text-amber-400 transition-colors"
                >
                  Explore
                </button>
              )}
            </div>
          </form>

          {/* Famous transaction chips */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {CHIP_ENTRIES.map((entry) => (
              <FamousChip key={entry.id} entry={entry} />
            ))}
          </div>

          <Link
            href="/explore/famous"
            className="text-[11px] uppercase tracking-widest font-mono text-stone-500 hover:text-amber-500 transition-colors mt-2 flex items-center gap-1"
          >
            Browse all famous <ArrowRight className="w-3 h-3" />
          </Link>
        </motion.div>
      </section>

      {/* ─── LIVE PULSE (Floating Pill) ─── */}
      {(tipHeight || fees) && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="relative z-10 pt-4 pb-8"
        >
          <div className="max-w-max mx-auto px-8 py-3 rounded-full bg-surface-card/70 backdrop-blur-md border border-white/5 shadow-xl flex items-center justify-center gap-6 sm:gap-10 text-xs font-mono">
            {tipHeight && (
              <div className="flex items-center gap-2">
                <Blocks className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-stone-500">Block</span>
                <Link
                  href={`/explore/block/${tipHeight}`}
                  className="text-white hover:text-amber-500 transition-colors"
                >
                  #{tipHeight.toLocaleString()}
                </Link>
              </div>
            )}
            {fees && (
              <>
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-stone-500">Fast</span>
                  <span className="text-white">
                    {fees.fastestFee} sat/vB
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-stone-500" />
                  <span className="text-stone-500">Normal</span>
                  <span className="text-stone-300">
                    {fees.halfHourFee} sat/vB
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-stone-500">Economy</span>
                  <span className="text-stone-400">
                    {fees.economyFee} sat/vB
                  </span>
                </div>
              </>
            )}
          </div>
        </motion.section>
      )}

      {/* ─── CAPABILITIES ─── */}
      <section className="relative z-10 bg-transparent px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center mb-12"
          >
            <div className="inline-block text-center px-8 py-6 rounded-3xl bg-stone-950/50 backdrop-blur-xl border border-white/8 shadow-xl">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
                Three perspectives, one transaction
              </h2>
              <p className="text-stone-400 max-w-md mx-auto">
                Every transaction gets X-rayed from structure, privacy, and
                construction angles.
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CAPABILITIES.map((cap, i) => (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <TiltCard className="h-full">
                  <Link
                    href={cap.href}
                    className={`group flex flex-col gap-4 p-6 h-full rounded-3xl border border-white/8 bg-stone-950/50 backdrop-blur-xl shadow-lg hover:border-white/10 hover:bg-stone-950/70 transition-all duration-300 ${cap.glow}`}
                  >
                    <CapCard cap={cap} />
                  </Link>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="relative z-10 bg-transparent px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-center mb-12"
          >
            <div className="inline-block text-center px-8 py-6 rounded-3xl bg-stone-950/50 backdrop-blur-xl border border-white/8 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
                How it works
              </h2>
              <p className="text-stone-400">
                No sign-up. No backend. Everything runs in your browser.
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Search",
                desc: "Enter any txid, block height, or block hash. Or pick a famous transaction.",
              },
              {
                step: "2",
                title: "Analyze",
                desc: "Live data from mempool.space. Privacy heuristics, wallet fingerprints, and structure analysis run client-side.",
              },
              {
                step: "3",
                title: "Understand",
                desc: "Scrollytelling cards explain every detail with real-world analogies. Go as deep as you want.",
              },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="text-center sm:text-left p-6 sm:p-8 rounded-3xl bg-stone-950/50 backdrop-blur-xl border border-white/8 shadow-xl"
              >
                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-sm font-bold text-amber-500 font-mono mb-4 mx-auto sm:mx-0">
                  {s.step}
                </div>
                <h3 className="text-base font-semibold text-white mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-stone-500 leading-relaxed">
                  {s.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <Footer />
    </div>
  );
}

// extracted to keep the map() clean
function CapCard({
  cap,
}: {
  cap: (typeof CAPABILITIES)[number];
}) {
  return (
    <>
      {/* Mini illustration */}
      <div className="w-full h-28 rounded-xl overflow-hidden bg-black/20 border border-white/5 mb-4">
        <cap.Illustration />
      </div>
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-xl ${cap.bg} border ${cap.border}`}
        >
          <cap.icon className={`w-5 h-5 ${cap.color}`} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">
            {cap.title}
          </h3>
          <span className="text-[10px] uppercase tracking-widest text-stone-500 font-mono">
            {cap.subtitle}
          </span>
        </div>
      </div>
      <p className="text-sm text-stone-400 leading-relaxed">
        {cap.description}
      </p>
    </>
  );
}
