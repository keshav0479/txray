"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { type ToolTheme, THEMES } from "@/lib/themes";

interface BottomCTAProps {
  theme: ToolTheme;
  title: string;
  description: string;
  buttonLabel: string;
  buttonIcon?: React.ReactNode;
  onAction: () => void;
}

/**
 * Unified bottom CTA section for all tool pages.
 */
export function BottomCTA({ 
  theme, 
  title, 
  description, 
  buttonLabel, 
  buttonIcon,
  onAction 
}: BottomCTAProps) {
  const colors = THEMES[theme];
  
  // Build button classes based on theme
  const buttonBgClass = `bg-${colors.tw}-600 hover:bg-${colors.tw}-500`;
  
  return (
    <section className="relative z-10 w-full max-w-2xl mx-auto px-6 py-24 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
          {title}
        </h2>
        <p className="text-stone-400 text-lg mb-8 max-w-md mx-auto">
          {description}
        </p>
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 text-white font-bold px-8 py-4 rounded-xl transition-colors"
          style={{ backgroundColor: colors.primary }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.light}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.primary}
        >
          {buttonIcon}
          {buttonLabel}
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </section>
  );
}
