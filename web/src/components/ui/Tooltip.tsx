"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TooltipProps {
  children: React.ReactNode;
  term: string;
  definition: string;
  analogy?: string;
  theme?: "lens" | "amber";
  size?: "default" | "compact";
  hideAnalogy?: boolean;
}

export function Tooltip({
  children,
  term,
  definition,
  analogy = "",
  theme = "lens",
  size = "default",
  hideAnalogy = false,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const isCompact = size === "compact";
  const accent =
    theme === "amber"
      ? {
          underline:
            "group-hover:border-amber-500 group-hover:text-amber-400 group-focus-within:border-amber-500 group-focus-within:text-amber-400",
          title: "text-amber-500",
          analogy: "border-amber-500/50",
        }
      : {
          underline:
            "group-hover:border-lens-500 group-hover:text-lens-400 group-focus-within:border-lens-500 group-focus-within:text-lens-400",
          title: "text-lens-500",
          analogy: "border-lens-500/50",
        };

  return (
    <span 
      className="relative inline-block cursor-help group z-30"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      tabIndex={0}
      role="term"
      aria-describedby={isVisible ? `tooltip-${term.replace(/\s/g, '-')}` : undefined}
    >
      <span className={`border-b-[1.5px] border-dotted border-zinc-500 transition-colors ${accent.underline}`}>
        {children}
      </span>

      <AnimatePresence>
        {isVisible && (
          <motion.span
            id={`tooltip-${term.replace(/\s/g, '-')}`}
            role="tooltip"
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-[90] bottom-full left-1/2 -translate-x-1/2 mb-3 rounded-xl shadow-2xl bg-zinc-900/95 border border-white/15 text-left pointer-events-none block backdrop-blur-sm ${
              isCompact ? "w-52 p-3" : "w-64 p-4"
            }`}
          >
            <span
              className={`block font-bold uppercase tracking-widest ${
                isCompact ? "text-[10px] mb-1.5" : "text-xs mb-2"
              } ${accent.title}`}
            >
              {term}
            </span>
            <span className={`block text-white leading-relaxed ${isCompact ? "text-xs mb-0" : "text-sm mb-2"}`}>
              {definition}
            </span>
            {analogy && !hideAnalogy && (
              <span className={`block text-xs text-zinc-400 italic border-l-2 pl-2 mt-2 ${accent.analogy}`}>
                {analogy}
              </span>
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
