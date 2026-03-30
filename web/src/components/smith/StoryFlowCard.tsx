"use client";

import { useRef, useState, useEffect, useCallback, memo } from "react";
import { motion, useScroll, useTransform, useSpring, useMotionValueEvent } from "framer-motion";

// Blue accent palette
const ACCENT = "#3b82f6";
const ACCENT_LIGHT = "#60a5fa";
const ACCENT_GLOW = "rgba(59, 130, 246, 0.15)";
const ACCENT_BORDER = "rgba(59, 130, 246, 0.3)";

// ------------------------------------------------------------------
// StoryFlowCard — wrapped in React.memo to prevent unnecessary re-renders.
// Only the card whose `isActive` changed will re-render.
// ------------------------------------------------------------------
interface StoryFlowCardProps {
  index: number;
  title: string;
  description: string;
  Graphic: React.ComponentType<{ isPlaying: boolean }>;
  isActive: boolean;
}

const StoryFlowCard = memo(function StoryFlowCard({ 
  index, title, description, Graphic, isActive 
}: StoryFlowCardProps) {
  return (
    <div className="w-screen h-screen shrink-0 flex items-center justify-center px-6 md:px-16">
      <div className="w-full max-w-5xl flex flex-col md:flex-row items-center gap-8 md:gap-12">
        
        {/* LEFT: Text — solid bg, NO backdrop-blur (GPU killer) */}
        <div className="w-full md:w-1/2 z-10">
          <div className={`p-6 md:p-10 rounded-3xl border transition-all duration-700 ${
            isActive 
              ? "bg-black/70 border-white/10" 
              : "bg-black/50 border-white/5"
          }`}>
            <div 
              className="inline-flex items-center justify-center w-11 h-11 rounded-2xl font-mono text-lg font-bold mb-5"
              style={{ 
                backgroundColor: `${ACCENT}15`,
                borderWidth: 1,
                borderColor: `${ACCENT}33`,
                color: ACCENT_LIGHT,
              }}
            >
              0{index}
            </div>
            
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-white leading-tight mb-3">
              {title}
            </h2>
            
            <p className="text-base md:text-lg text-zinc-400 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* RIGHT: Animated Graphic — NO backdrop-blur */}
        <div className="w-full md:w-1/2 flex items-center justify-center z-10">
          <div 
            className={`w-full max-w-md aspect-4/3 rounded-3xl border flex items-center justify-center p-6 md:p-8 transition-all duration-700 overflow-hidden relative ${
              isActive 
                ? "bg-[#0a0c10]/90" 
                : "bg-[#080a0e]/50 border-white/5"
            }`}
            style={isActive ? { 
              borderColor: ACCENT_BORDER,
              boxShadow: `0 0 40px -10px ${ACCENT_GLOW}`,
            } : undefined}
          >
            <div 
              className={`absolute inset-0 transition-opacity duration-700 ${isActive ? "opacity-100" : "opacity-0"}`} 
              style={{ backgroundColor: `${ACCENT}08` }}
            />
            <div className="relative z-10 w-full h-full flex items-center justify-center">
              <Graphic isPlaying={isActive} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// ------------------------------------------------------------------
// HorizontalStory — the main scroll-jacked horizontal section
// ------------------------------------------------------------------
interface HorizontalStoryProps {
  cards: Array<{
    index: number;
    title: string;
    description: string;
    Graphic: React.ComponentType<{ isPlaying: boolean }>;
  }>;
}

export function HorizontalStory({ cards }: HorizontalStoryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardCount = cards.length;
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const isSnapping = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Viewport width for pixel-based transforms
  useEffect(() => {
    const updateWidth = () => setViewportWidth(window.innerWidth);
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Pixel-based horizontal transform (GPU composited, no layout thrashing)
  // rawX = discrete scroll-driven position
  // x = spring-smoothed for silky fluid motion between discrete scroll ticks
  const maxShiftPx = -(cardCount - 1) * viewportWidth;
  const rawX = useTransform(scrollYProgress, [0, 1], [0, maxShiftPx]);
  const x = useSpring(rawX, { stiffness: 100, damping: 30, mass: 0.5 });

  // ---- Utility: scroll to a specific card index ----
  const scrollToCard = useCallback((targetIndex: number) => {
    if (!containerRef.current) return;
    const clamped = Math.max(0, Math.min(cardCount - 1, targetIndex));
    const containerTop = containerRef.current.offsetTop;
    const scrollableDistance = containerRef.current.offsetHeight - window.innerHeight;
    const cardScrollHeight = scrollableDistance / (cardCount - 1);
    const targetScroll = containerTop + clamped * cardScrollHeight;

    isSnapping.current = true;
    window.scrollTo({ top: targetScroll, behavior: "smooth" });
    setTimeout(() => { isSnapping.current = false; }, 600);
  }, [cardCount]);

  // ---- Snap to nearest card on scroll-end (150ms debounce) ----
  const snapToNearestCard = useCallback(() => {
    if (!containerRef.current || isSnapping.current) return;
    
    const containerTop = containerRef.current.offsetTop;
    const containerHeight = containerRef.current.offsetHeight;
    const scrollableDistance = containerHeight - window.innerHeight;
    const currentScroll = window.scrollY - containerTop;
    
    if (currentScroll < -10 || currentScroll > scrollableDistance + 10) return;
    
    const cardScrollHeight = scrollableDistance / (cardCount - 1);
    const nearestIndex = Math.round(currentScroll / cardScrollHeight);
    const clampedIndex = Math.max(0, Math.min(cardCount - 1, nearestIndex));
    const targetScroll = containerTop + clampedIndex * cardScrollHeight;
    
    if (Math.abs(window.scrollY - targetScroll) > 5) {
      scrollToCard(clampedIndex);
    }
  }, [cardCount, scrollToCard]);

  // ---- Scroll-end detection ----
  useEffect(() => {
    const handleScroll = () => {
      if (isSnapping.current) return;
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(snapToNearestCard, 150);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, [snapToNearestCard]);

  // ---- Arrow key navigation ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current) return;
      
      // Only respond to arrow keys when the horizontal section is in view
      const containerTop = containerRef.current.offsetTop;
      const containerBottom = containerTop + containerRef.current.offsetHeight;
      const currentScroll = window.scrollY;
      
      if (currentScroll < containerTop - 100 || currentScroll > containerBottom) return;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        scrollToCard(activeCardIndex + 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        scrollToCard(activeCardIndex - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCardIndex, scrollToCard]);

  // ---- Track active card from scroll progress ----
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const newIndex = Math.min(Math.floor(v * cardCount), cardCount - 1);
    if (newIndex !== activeCardIndex) {
      setActiveCardIndex(newIndex);
    }
  });

  return (
    <div 
      ref={containerRef} 
      style={{ height: `${cardCount * 100}vh` }}
      className="relative"
    >
      <div className="sticky top-0 h-screen w-screen overflow-hidden">
        
        {/* Horizontal track — GPU accelerated */}
        <motion.div 
          className="flex h-full"
          style={{ 
            x,
            width: `${cardCount * 100}vw`,
            willChange: "transform",
          }}
        >
          {cards.map((card, i) => (
            <StoryFlowCard 
              key={card.index} 
              index={card.index}
              title={card.title}
              description={card.description}
              Graphic={card.Graphic}
              isActive={activeCardIndex === i}
            />
          ))}
        </motion.div>

        {/* Clickable progress dots */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
          {cards.map((_, i) => (
            <button 
              key={i}
              onClick={() => scrollToCard(i)}
              aria-label={`Go to card ${i + 1}`}
              className={`rounded-full transition-all duration-500 cursor-pointer hover:opacity-80 ${
                activeCardIndex === i 
                  ? "w-8 h-2" 
                  : "w-2 h-2 bg-zinc-700 hover:bg-zinc-500"
              }`}
              style={activeCardIndex === i ? { backgroundColor: ACCENT } : undefined}
            />
          ))}
        </div>

        {/* Edge arrows — decreasing-size chevrons with flowing blue pulse */}
        {activeCardIndex > 0 && (
          <button
            onClick={() => scrollToCard(activeCardIndex - 1)}
            aria-label="Previous card"
            className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-20 flex items-center gap-0.5 cursor-pointer group"
          >
            {/* Chevrons decrease in size, blue flows right-to-left (toward left) */}
            {[14, 18, 22].map((size, i) => (
              <motion.svg
                key={i}
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                animate={{ opacity: [0.1, 0.5, 0.1] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: (2 - i) * 0.25, // flows right-to-left: rightmost lights first
                }}
                style={{ color: ACCENT }}
                className="group-hover:!opacity-60"
              >
                <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
            ))}
          </button>
        )}
        {activeCardIndex < cardCount - 1 && (
          <button
            onClick={() => scrollToCard(activeCardIndex + 1)}
            aria-label="Next card"
            className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-20 flex items-center gap-0.5 cursor-pointer group"
          >
            {/* Chevrons decrease in size, blue flows left-to-right (toward right) */}
            {[22, 18, 14].map((size, i) => (
              <motion.svg
                key={i}
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                animate={{ opacity: [0.1, 0.5, 0.1] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.25, // flows left-to-right: leftmost lights first
                }}
                style={{ color: ACCENT }}
                className="group-hover:!opacity-60"
              >
                <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
            ))}
          </button>
        )}
      </div>
    </div>
  );
}
