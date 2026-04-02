"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { type ToolTheme, THEMES, getThemeStyles } from "@/lib/themes";

interface TimelineCardProps {
  /** Which tool theme to use */
  theme: ToolTheme;
  /** Step number (1-indexed, displayed as "01", "02", etc.) */
  step: number;
  /** Card title */
  title: string;
  /** Card description */
  description: string;
  /** Animated graphic component */
  Graphic: React.ComponentType<{ isPlaying: boolean }>;
  /** Whether this is the last card (affects line length) */
  isLast?: boolean;
}

/**
 * Unified timeline card component for all txray tools.
 *
 * Based on Sherlock's StorySection implementation.
 * Alternates content/graphic sides on even/odd indices.
 */
export function TimelineCard({
  theme,
  step,
  title,
  description,
  Graphic,
  isLast = false,
}: TimelineCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    margin: "-30% 0px -30% 0px",
    once: false,
  });

  const index = step - 1; // Convert to 0-indexed for layout calculation
  const isEven = index % 2 === 0;

  const colors = THEMES[theme];
  const styles = getThemeStyles(theme);

  return (
    <div
      ref={ref}
      className="relative flex flex-col md:flex-row items-center justify-between w-full min-h-[50vh] py-16 group"
    >
      {/* Connector line fill */}
      <div className="absolute left-6 md:left-1/2 md:-ml-px top-0 bottom-0 w-0.5">
        <motion.div
          className="w-full origin-top opacity-30"
          initial={{ scaleY: 0 }}
          animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            height: isLast ? "50%" : "100%",
            backgroundColor: colors.primary,
          }}
        />
      </div>

      {/* Timeline node */}
      <div
        className="absolute left-4 md:left-1/2 md:-ml-2.25 w-4.5 h-4.5 rounded-full border-4 border-black z-10 transition-colors duration-500 flex items-center justify-center"
        style={{
          backgroundColor: isInView ? styles.nodeActive : styles.nodeInactive,
        }}
      >
        {isInView && (
          <motion.div
            className="absolute rounded-full pointer-events-none w-9 h-9"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
            style={{
              borderWidth: 1,
              borderColor: styles.badgeBorderActive,
            }}
          />
        )}
      </div>

      {/* Left Side (Content A) */}
      <div
        className={`w-full md:w-[45%] pl-16 md:pl-0 flex ${isEven ? "md:justify-end" : "md:justify-start"} ${isEven ? "md:order-1" : "md:order-2"}`}
      >
        <motion.div
          initial={{ opacity: 0, x: isEven ? -30 : 30 }}
          animate={
            isInView
              ? { opacity: 1, x: 0 }
              : { opacity: 0.2, x: isEven ? -30 : 30 }
          }
          transition={{ duration: 0.6, delay: 0.1 }}
          className={`flex flex-col items-start w-full max-w-lg p-6 md:p-8 rounded-3xl transition-all duration-700 ${
            isInView
              ? "bg-black/60 backdrop-blur-md border border-white/5"
              : "bg-transparent border border-transparent"
          }`}
          style={
            isInView
              ? { boxShadow: `0 0 50px -15px ${styles.glow}` }
              : undefined
          }
        >
          {/* Step badge */}
          <div
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl font-mono text-base font-bold mb-5 transition-colors duration-500"
            style={{
              backgroundColor: isInView
                ? styles.badgeBgActive
                : styles.badgeBgInactive,
              borderWidth: 1,
              borderColor: isInView
                ? styles.badgeBorderActive
                : styles.badgeBorderInactive,
              color: isInView ? styles.textActive : styles.textInactive,
            }}
          >
            {step.toString().padStart(2, "0")}
          </div>

          <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight leading-tight">
            {title}
          </h3>
          <p className="text-zinc-400 leading-relaxed text-lg">{description}</p>
        </motion.div>
      </div>

      {/* Right Side (Graphic B) */}
      <div
        className={`w-full md:w-[45%] pl-16 md:pl-0 mt-8 md:mt-0 flex ${isEven ? "md:justify-start" : "md:justify-end"} ${isEven ? "md:order-2" : "md:order-1"}`}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={
            isInView ? { opacity: 1, scale: 1 } : { opacity: 0.2, scale: 0.95 }
          }
          transition={{ duration: 0.6, delay: 0.2 }}
          className={`w-full max-w-md aspect-4/3 rounded-3xl flex items-center justify-center p-6 md:p-8 transition-all duration-700 relative overflow-hidden ${
            isInView
              ? "bg-[#0a0a0f]/90 backdrop-blur-md border border-white/5"
              : "bg-zinc-900/40 border border-transparent"
          }`}
          style={
            isInView
              ? { boxShadow: `0 0 70px -10px ${styles.glow}` }
              : undefined
          }
        >
          {/* Subtle glow behind the graphic */}
          <div
            className={`absolute inset-0 transition-opacity duration-700 ${isInView ? "opacity-100" : "opacity-0"}`}
            style={{ backgroundColor: styles.subtleGlow }}
          />
          <div className="relative z-10 w-full h-full flex items-center justify-center pointer-events-none">
            <Graphic isPlaying={isInView} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

interface TimelineSectionProps {
  /** Which tool theme to use */
  theme: ToolTheme;
  /** Array of card data */
  cards: Array<{
    title: string;
    description: string;
    Graphic: React.ComponentType<{ isPlaying: boolean }>;
  }>;
}

/**
 * Complete timeline section with background line and all cards.
 * Drop-in replacement for StorySection, VerticalStory, etc.
 */
export function TimelineSection({ theme, cards }: TimelineSectionProps) {
  return (
    <section className="w-full max-w-5xl mx-auto py-24 px-6 relative z-10">
      {/* Vertical timeline line (dim background line) */}
      <div className="absolute left-6 md:left-1/2 md:-ml-px top-0 bottom-0 w-0.5 bg-white/5" />

      {cards.map((card, i) => (
        <TimelineCard
          key={i}
          theme={theme}
          step={i + 1}
          title={card.title}
          description={card.description}
          Graphic={card.Graphic}
          isLast={i === cards.length - 1}
        />
      ))}
    </section>
  );
}
