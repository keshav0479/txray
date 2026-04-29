"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useSpring,
} from "framer-motion";
import {
  Search,
  ArrowRight,
  ArrowUpRight,
  Eye,
  Shield,
  Hammer,
  Zap,
  Blocks,
  Timer,
  PiggyBank,
  BetweenHorizontalStart,
  Rows3,
  Clock3,
} from "lucide-react";
import { FAMOUS_ENTRIES, type FamousEntry } from "@/lib/famous";
import { detectSearchType } from "@/lib/mempool";
import { Footer } from "@/components/shared/Footer";
import { SmithBackground } from "@/components/smith/SmithBackground";
import {
  LensMini,
  SherlockMini,
  SmithMini,
} from "@/components/shared/LandingIllustrations";
import { TiltCard } from "@/components/shared/TiltCard";
import { TxrayLogo } from "@/components/shared/TxrayLogo";
import { useMempool } from "@/context/MempoolContext";
import { Tooltip } from "@/components/ui/Tooltip";

// Curated pool - rotate 3 per day so returning users see variety
const CHIP_POOL_IDS = [
  "genesis",
  "satoshi-to-finney",
  "pizza-tx",
  "segwit-activation",
  "wasabi-coinjoin",
  "first-taproot",
  "mtgox-theft",
];
const CHIP_POOL = FAMOUS_ENTRIES.filter((e) => CHIP_POOL_IDS.includes(e.id));
const dayIndex = Math.floor(Date.now() / 86_400_000); // changes daily
const CHIP_ENTRIES = [0, 1, 2].map(
  (i) => CHIP_POOL[(dayIndex + i) % CHIP_POOL.length],
);

const CAPABILITIES = [
  {
    icon: Eye,
    title: "Structure",
    subtitle: "Lens",
    cta: "Analyze",
    description:
      "See every input, output, script, and byte. Understand exactly how Bitcoin moves value.",
    glow: "group-hover:border-amber-500/30 group-hover:shadow-[0_0_30px_-10px_rgba(245,158,11,0.15)]",
    Illustration: LensMini,
    href: "/lens",
  },
  {
    icon: Shield,
    title: "Privacy",
    subtitle: "Sherlock",
    cta: "Scan",
    description:
      "Analyze coin privacy through fingerprints, heuristics, entropy scoring, and actionable advice.",
    glow: "group-hover:border-amber-500/30 group-hover:shadow-[0_0_30px_-10px_rgba(245,158,11,0.15)]",
    Illustration: SherlockMini,
    href: "/sherlock",
  },
  {
    icon: Hammer,
    title: "Construct",
    subtitle: "Smith",
    cta: "Build",
    description:
      "Construct raw transactions with smart coin selection, fee estimation, and a clear walkthrough.",
    glow: "group-hover:border-amber-500/30 group-hover:shadow-[0_0_30px_-10px_rgba(245,158,11,0.15)]",
    href: "/build",
    Illustration: SmithMini,
  },
];

function FamousChip({ entry }: { entry: FamousEntry }) {
  const href =
    entry.type === "tx"
      ? `/tx/${entry.txid}`
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
  const prevTipHeightRef = useRef<number | null>(null);
  const blockPulseReturnRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [scanOrigin, setScanOrigin] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [scanPulses, setScanPulses] = useState<number[]>([]);
  const [returnPulses, setReturnPulses] = useState<number[]>([]);
  const [holdProgress, setHoldProgress] = useState(0);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1_000));
  const [pulseVisible, setPulseVisible] = useState(false);
  const { tipHeight, fees, mempoolTxCount, lastBlockTimestamp, isConnected } =
    useMempool();

  const blockAgeSec =
    lastBlockTimestamp !== null
      ? Math.max(0, nowSec - lastBlockTimestamp)
      : null;
  const feeSpread =
    fees !== null ? Math.max(0, fees.fastestFee - fees.economyFee) : null;
  const pulseReady =
    isConnected &&
    tipHeight !== null &&
    fees !== null &&
    mempoolTxCount !== null;

  // compute origin from logo position
  const computeOrigin = useCallback(() => {
    if (logoRef.current) {
      const rect = logoRef.current.getBoundingClientRect();
      setScanOrigin({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }
  }, []);

  const startHold = useCallback(() => {
    computeOrigin();
    // INSTANT OUTWARD WAVE
    setScanPulses((prev) => [...prev.slice(-4), Date.now()]);

    if (fadeTimerRef.current) {
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    holdDelayRef.current = setTimeout(() => {
      holdActivatedRef.current = true;
      holdTimerRef.current = setInterval(() => {
        setHoldProgress((prev) => {
          const next = Math.min(1, prev + 0.013);
          holdProgressRef.current = next;
          return next;
        });
      }, 33);
    }, 400);
  }, [computeOrigin]);

  const stopHold = useCallback(() => {
    if (holdDelayRef.current) {
      clearTimeout(holdDelayRef.current);
      holdDelayRef.current = null;
    }
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    // SNAPPY INWARD WAVE (THE ECHO): Only if we reached FULL CHARGE
    if (holdProgressRef.current >= 0.99) {
      setReturnPulses((prev) => [...prev.slice(-4), Date.now()]);
    }

    holdProgressRef.current = 0;

    // fade back
    fadeTimerRef.current = setInterval(() => {
      setHoldProgress((prev) => {
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
      setScanPulses((prev) => prev.filter((t) => now - t < 2500));
      setReturnPulses((prev) => prev.filter((t) => now - t < 1500));
    }, 1000);
    return () => clearInterval(interval);
  }, [scanPulses, returnPulses]);

  // cleanup timers
  useEffect(() => {
    return () => {
      if (holdDelayRef.current) clearTimeout(holdDelayRef.current);
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
      if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
      if (blockPulseReturnRef.current) clearTimeout(blockPulseReturnRef.current);
    };
  }, []);

  // New block mined -> max glow instantly, then slow fade (~4s total)
  useEffect(() => {
    if (tipHeight === null) return;
    if (prevTipHeightRef.current === null) {
      prevTipHeightRef.current = tipHeight;
      return;
    }
    if (tipHeight > prevTipHeightRef.current) {
      // Kill any ongoing fade
      if (fadeTimerRef.current) { clearInterval(fadeTimerRef.current); fadeTimerRef.current = null; }
      if (blockPulseReturnRef.current) clearTimeout(blockPulseReturnRef.current);

      // Instantly max out the hold glow
      holdProgressRef.current = 1;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHoldProgress(1);

      // Hold at full brightness for 1s, then fade slowly over ~3s
      blockPulseReturnRef.current = setTimeout(() => {
        fadeTimerRef.current = setInterval(() => {
          setHoldProgress((prev) => {
            const next = prev - 0.008; // ~3.3s to fade from 1->0 (vs 0.04 for manual release)
            if (next <= 0) {
              if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
              holdActivatedRef.current = false;
              holdProgressRef.current = 0;
              return 0;
            }
            holdProgressRef.current = next;
            return next;
          });
        }, 33);
      }, 1000);
    }
    prevTipHeightRef.current = tipHeight;
  }, [tipHeight]);

  useEffect(() => {
    const id = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1_000));
    }, 1_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (pulseReady) {
      const id = setTimeout(() => setPulseVisible(true), 0);
      return () => clearTimeout(id);
    }
  }, [pulseReady]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("hero-search")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    const type = detectSearchType(q);
    if (type === "txid") router.push(`/tx/${q}`);
    else if (type === "block_height") router.push(`/explore/block/${q}`);
    else if (type === "block_hash") router.push(`/explore/block/${q}`);
    else router.push(`/tx/${q}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* --------- HERO --------- */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-16 relative">
        {/* Hide the global background and use interactive version on landing page */}
        <div className="fixed inset-0 bg-stone-950 z-[-2]" />

        {/* Smith animated BTC mould grid - interactive version for landing page only */}
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
            background:
              "radial-gradient(ellipse 55% 55% at 50% 50%, rgba(12,10,9,0.92) 0%, rgba(12,10,9,0.3) 60%, transparent 100%)",
          }}
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center text-center z-10 max-w-3xl pt-8"
        >
          {/* Logo - hold to charge, click/release to pulse */}
          <motion.button
            ref={logoRef}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
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
                animation:
                  "hero-float 6s ease-in-out infinite, hero-glow 3s ease-in-out infinite",
              }}
            >
              <TxrayLogo
                variant="mark"
                className="w-full h-full text-amber-500"
              />
            </div>
            <style
              dangerouslySetInnerHTML={{
                __html: `
              @keyframes hero-float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-4px); }
              }
              @keyframes hero-glow {
                0%, 100% { filter: drop-shadow(0 0 16px rgba(245,158,11,0.2)) brightness(1); }
                50% { filter: drop-shadow(0 0 32px rgba(245,158,11,0.5)) brightness(1.15); }
              }
            `,
              }}
            />
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
              <Search className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-stone-400 group-focus-within:text-amber-500 transition-colors z-10 pointer-events-none" />
              <input
                id="hero-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter a txid, block height, or block hash..."
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="none"
                autoComplete="off"
                className={`w-full min-w-0 bg-stone-800/40 hover:bg-stone-800/60 backdrop-blur-3xl border border-white/20 hover:border-white/30 rounded-2xl pl-11 sm:pl-12 ${searchQuery.trim() ? "pr-14 sm:pr-28" : "pr-4 sm:pr-28"} py-4 text-base text-white placeholder:text-stone-500 sm:placeholder:text-stone-400 focus:outline-none focus:border-amber-500/60 focus:ring-4 focus:ring-amber-500/20 focus:bg-stone-900/90 search-input transition-all shadow-[0_8px_30px_rgb(0,0,0,0.5)]`}
              />

              {!searchQuery.trim() && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-60 group-focus-within:opacity-0 transition-opacity">
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-stone-400">
                    Ctrl K / Cmd K
                  </span>
                </div>
              )}

              {searchQuery.trim() && (
                <button
                  type="submit"
                  className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 sm:h-auto sm:w-auto items-center justify-center sm:px-4 sm:py-1.5 rounded-xl bg-transparent text-amber-500 border-2 border-amber-500/50 text-sm font-semibold hover:bg-amber-500/10 hover:border-amber-500/80 transition-colors shadow-sm"
                >
                  <span className="hidden sm:inline">Explore</span>
                  <ArrowRight className="w-4 h-4 sm:hidden" />
                  <span className="sr-only sm:hidden">Explore</span>
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
            Browse Bitcoin History <ArrowRight className="w-3 h-3" />
          </Link>
        </motion.div>
      </section>

      {/* --------- LIVE PULSE (Floating Pill) --------- */}
      <section className="relative z-10 pt-4 pb-12">
        <motion.div
          initial={{ opacity: 0, filter: "blur(6px)" }}
          animate={pulseVisible ? { opacity: 1, filter: "blur(0px)" } : { opacity: 0, filter: "blur(6px)" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
            <div
              className={`max-w-6xl w-[calc(100%-2rem)] mx-auto rounded-2xl bg-stone-950/40 backdrop-blur-xl border border-white/5 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] font-mono transition-all duration-500 overflow-visible ${
                isConnected ? "opacity-100" : "opacity-60 animate-pulse"
              }`}
            >
              {/* Mobile + Tablet: 3 high-signal metrics, always horizontal */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-3 lg:hidden">
                <PulseMetric
                  className="h-11 sm:h-12"
                  icon={
                    <Blocks className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-amber-500/80" />
                  }
                >
                  <MetricLabel
                    text="Block"
                    term="Latest Block"
                    definition="The newest confirmed block on Bitcoin"
                    analogy="Like the latest train departure"
                  />
                  {tipHeight !== null ? (
                    <Link
                      href={`/explore/block/${tipHeight}`}
                      className="inline-flex items-center gap-1"
                    >
                      <span className="shimmer-text">
                        <SmoothNumber
                          value={tipHeight}
                          formatter={(value) => `#${value.toLocaleString()}`}
                        />
                      </span>
                      <ArrowUpRight className="w-3 h-3 text-amber-400/60 hidden sm:block" />
                    </Link>
                  ) : (
                    <span className="text-stone-700">--</span>
                  )}
                </PulseMetric>

                <PulseMetric
                  className="h-11 sm:h-12"
                  icon={
                    <Zap className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-amber-500/80" />
                  }
                >
                  <MetricLabel
                    text="Fast"
                    term="Fast Fee"
                    definition="Next block target"
                    analogy="Express shipping"
                  />
                  <SmoothNumber
                    value={fees?.fastestFee ?? null}
                    formatter={(value) => `${value} vB`}
                  />
                </PulseMetric>

                <PulseMetric
                  className="h-11 sm:h-12"
                  icon={
                    <Rows3 className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-amber-500/80" />
                  }
                >
                  <MetricLabel
                    text="Pool"
                    term="Mempool"
                    definition="Waiting txs"
                    analogy="Sorting center"
                  />
                  <SmoothNumber
                    value={mempoolTxCount}
                    formatter={(value) => `${value.toLocaleString()} tx`}
                  />
                </PulseMetric>
              </div>

              {/* Desktop: Balanced grid for elegance */}
              <div className="hidden lg:grid grid-cols-[1.9fr_1fr_1fr_1fr_1.15fr_1.4fr] gap-4 px-4 py-3">
                <PulseMetric
                  icon={<Blocks className="w-3.5 h-3.5 text-amber-500/80" />}
                >
                  <MetricLabel
                    text="Block"
                    term="Latest Block"
                    definition="Newest confirmed block"
                    analogy="Latest train"
                  />
                  <div className="flex items-center justify-end gap-4 overflow-hidden">
                    {tipHeight !== null ? (
                      <Link
                        href={`/explore/block/${tipHeight}`}
                        className="inline-flex items-center gap-1.5"
                      >
                        <span className="shimmer-text">
                          <SmoothNumber
                            value={tipHeight}
                            formatter={(value) => `#${value.toLocaleString()}`}
                          />
                        </span>
                        <ArrowUpRight className="w-3 h-3 text-amber-400/60 shrink-0" />
                      </Link>
                    ) : (
                      <span className="text-stone-700">--</span>
                    )}
                    <span className="flex items-center gap-2 text-[10px] text-stone-500 font-medium">
                      <Clock3 className="w-2.5 h-2.5 text-stone-600" />
                      <span className="w-[10ch] text-right tabular-nums">
                        {blockAgeSec !== null ? formatAge(blockAgeSec) : "--"}
                      </span>
                    </span>
                  </div>
                </PulseMetric>

                <PulseMetric
                  icon={<Zap className="w-3.5 h-3.5 text-amber-500/80" />}
                >
                  <MetricLabel
                    text="Fast"
                    term="Fast Fee"
                    definition="Next block target"
                    analogy="Express"
                  />
                  <SmoothNumber
                    value={fees?.fastestFee ?? null}
                    formatter={(value) => `${value} vB`}
                  />
                </PulseMetric>

                <PulseMetric
                  icon={<Timer className="w-3.5 h-3.5 text-amber-500/80" />}
                >
                  <MetricLabel
                    text="30m"
                    term="Half-Hour"
                    definition="Target: 30 minutes"
                    analogy="Standard"
                  />
                  <SmoothNumber
                    value={fees?.halfHourFee ?? null}
                    formatter={(value) => `${value} vB`}
                  />
                </PulseMetric>

                <PulseMetric
                  icon={<PiggyBank className="w-3.5 h-3.5 text-amber-500/80" />}
                >
                  <MetricLabel
                    text="Cheap"
                    term="Economy"
                    definition="Low priority fee"
                    analogy="Budget shipping"
                  />
                  <SmoothNumber
                    value={fees?.economyFee ?? null}
                    formatter={(value) => `${value} vB`}
                  />
                </PulseMetric>

                <PulseMetric
                  icon={
                    <BetweenHorizontalStart className="w-3.5 h-3.5 text-amber-500/80" />
                  }
                >
                  <MetricLabel
                    text="Spread"
                    term="Gap"
                    definition="Fast vs Economy gap"
                    analogy="Travel peak"
                  />
                  <SmoothNumber
                    value={feeSpread}
                    formatter={(value) => `+${value} vB`}
                    className="text-amber-500/90 font-medium"
                  />
                </PulseMetric>

                <PulseMetric
                  icon={<Rows3 className="w-3.5 h-3.5 text-amber-500/80" />}
                  className="border-amber-500/10 bg-amber-500/5"
                >
                  <MetricLabel
                    text="Pool"
                    term="Mempool"
                    definition="Total waiting txs"
                    analogy="Unsorted queue"
                  />
                  <SmoothNumber
                    value={mempoolTxCount}
                    formatter={(value) => `${value.toLocaleString()} tx`}
                    className="text-white font-medium"
                  />
                </PulseMetric>
              </div>
            </div>
        </motion.div>
      </section>

      {/* --------- CAPABILITIES --------- */}
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

      {/* --------- FOOTER --------- */}
      <Footer />
    </div>
  );
}

// extracted to keep the map() clean
function CapCard({ cap }: { cap: (typeof CAPABILITIES)[number] }) {
  return (
    <div className="flex flex-col h-full">
      {/* Mini illustration - always playing */}
      <div className="w-full h-28 rounded-xl overflow-hidden bg-black/20 border border-white/5 mb-4">
        <cap.Illustration />
      </div>
      <div className="mb-2">
        <h3 className="text-lg font-semibold text-white leading-tight">
          {cap.title}
        </h3>
        <span className="text-[10px] uppercase tracking-widest text-amber-500/50 font-mono">
          {cap.subtitle}
        </span>
      </div>
      <p className="text-sm text-stone-400 leading-relaxed flex-1">
        {cap.description}
      </p>
      {/* CTA - shimmer gradient flows amber->cream->amber */}
      <div className="flex items-center gap-1.5 mt-4">
        <span className="shimmer-text text-[11px] font-mono tracking-wide">
          {cap.cta}
        </span>
        <ArrowUpRight className="w-3 h-3 text-amber-400/60 shrink-0" />
      </div>
    </div>
  );
}

function PulseMetric({
  icon,
  children,
  className = "",
}: {
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`h-14 rounded-xl border border-white/5 bg-white/2 backdrop-blur-sm px-2 sm:px-3.5 flex items-center gap-1.5 sm:gap-3 min-w-0 transition-colors ${className}`}
    >
      <div className="shrink-0 drop-shadow-[0_0_8px_rgba(245,158,11,0.25)]">
        {icon}
      </div>
      <div className="min-w-0 flex-1 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 sm:gap-3 text-[10px] sm:text-xs">
        {children}
      </div>
    </div>
  );
}

function SmoothNumber({
  value,
  formatter,
  className = "",
}: {
  value: number | null;
  formatter: (value: number) => string;
  className?: string;
}) {
  const motionValue = useMotionValue(value ?? 0);
  const spring = useSpring(motionValue, {
    stiffness: 125,
    damping: 24,
    mass: 0.7,
  });
  const [displayValue, setDisplayValue] = useState(value ?? 0);

  useEffect(() => {
    if (value === null) return;
    motionValue.set(value);
  }, [motionValue, value]);

  useEffect(() => {
    if (value === null) return undefined;
    const unsubscribe = spring.on("change", (latest) => {
      setDisplayValue(latest);
    });
    return () => unsubscribe();
  }, [spring, value]);

  if (value === null)
    return (
      <span className={`tabular-nums text-stone-600 ${className}`}>--</span>
    );

  return (
    <span className={`tabular-nums ${className}`}>
      {formatter(Math.round(displayValue))}
    </span>
  );
}

function MetricLabel({
  text,
  term,
  definition,
  analogy,
}: {
  text: string;
  term: string;
  definition: string;
  analogy: string;
}) {
  return (
    <span className="text-stone-400 whitespace-nowrap">
      <span className="sm:hidden">{text}</span>
      <span className="hidden sm:inline">
        <Tooltip
          theme="amber"
          size="compact"
          hideAnalogy
          term={term}
          definition={definition}
          analogy={analogy}
        >
          {text}
        </Tooltip>
      </span>
    </span>
  );
}

function formatAge(totalSeconds: number): string {
  const pad2 = (value: number) => value.toString().padStart(2, "0");
  if (totalSeconds < 60) return `00m ${pad2(totalSeconds)}s`;
  if (totalSeconds < 3_600) {
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return `${pad2(min)}m ${pad2(sec)}s`;
  }
  const hours = Math.floor(totalSeconds / 3_600);
  const mins = Math.floor((totalSeconds % 3_600) / 60);
  if (hours < 100) return `${pad2(hours)}h ${pad2(mins)}m`;
  return `${hours}h`;
}
