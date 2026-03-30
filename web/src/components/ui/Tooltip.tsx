"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TooltipProps {
  children: React.ReactNode;
  term: string;
  definition: string;
  analogy?: string;
}

export function Tooltip({ children, term, definition, analogy = "" }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span 
      className="relative inline-block cursor-help group"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      tabIndex={0}
      role="term"
      aria-describedby={isVisible ? `tooltip-${term.replace(/\s/g, '-')}` : undefined}
    >
      <span className="border-b-[1.5px] border-dotted border-zinc-500 group-hover:border-lens-500 group-hover:text-lens-400 group-focus-within:border-lens-500 group-focus-within:text-lens-400 transition-colors">
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
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-4 rounded-xl shadow-2xl bg-zinc-900 border border-white/10 text-left pointer-events-none block"
          >
            <span className="block text-xs font-bold text-lens-500 uppercase tracking-widest mb-2">
              {term}
            </span>
            <span className="block text-sm text-white mb-2 leading-relaxed">
              {definition}
            </span>
            {analogy && (
              <span className="block text-xs text-zinc-400 italic border-l-2 border-lens-500/50 pl-2">
                {analogy}
              </span>
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
