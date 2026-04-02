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
  onAction,
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
          className="group inline-flex items-center gap-2 font-bold px-8 py-4 rounded-xl transition-all duration-300 border bg-transparent"
          style={{
            borderColor: `rgba(${colors.rgb}, 0.5)`,
            color: colors.primary,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `rgba(${colors.rgb}, 0.1)`;
            e.currentTarget.style.color = colors.light;
            e.currentTarget.style.borderColor = colors.light;
            e.currentTarget.style.boxShadow = `0 0 20px rgba(${colors.rgb}, 0.3), inset 0 0 10px rgba(${colors.rgb}, 0.1)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = colors.primary;
            e.currentTarget.style.borderColor = `rgba(${colors.rgb}, 0.5)`;
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <span className="opacity-90 group-hover:opacity-100 transition-opacity">
            {buttonIcon}
          </span>
          <span className="tracking-wide text-lg">{buttonLabel}</span>
          <ArrowRight className="w-5 h-5 opacity-80 group-hover:translate-x-1 group-hover:opacity-100 transition-all duration-300" />
        </button>
      </motion.div>
    </section>
  );
}
