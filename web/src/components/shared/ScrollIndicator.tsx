"use client";

import { motion } from "framer-motion";
import { type ToolTheme, THEMES } from "@/lib/themes";

interface ScrollIndicatorProps {
  theme: ToolTheme;
  label?: string;
}

/**
 * Unified scroll indicator for all tool pages.
 * Shows a "How it works" label with an animated dot.
 */
export function ScrollIndicator({
  theme,
  label = "How it works",
}: ScrollIndicatorProps) {
  const colors = THEMES[theme];

  return (
    <div className="flex flex-col items-center gap-3 py-16 relative z-10">
      <p className="text-xs uppercase tracking-[0.2em] text-stone-500 font-mono">
        {label}
      </p>
      <motion.div
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: colors.primary }}
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
