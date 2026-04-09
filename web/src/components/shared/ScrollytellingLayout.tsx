"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface ScrollytellingLayoutProps {
  graphObject: ReactNode;
  children: ReactNode; // The scrolling story cards
}

export function ScrollytellingLayout({
  graphObject,
  children,
}: ScrollytellingLayoutProps) {
  return (
    <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-12">

      {/* ── MOBILE layout: sticky graph + cards scroll underneath ── */}
      <div className="lg:hidden">
        {/* Sticky graph pane — stays locked below the header */}
        {/* z-index kept low (z-10) so card tooltips (z-[90]) can render above it */}
        <div className="sticky top-16 z-10 w-full h-[36vh] mb-6">
          {/* Clipped background layer only — rounded corners without clipping tooltip children */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl bg-stone-950/80 border border-white/8" />
          {/* Graph layer — override min-h on mobile so it fills the 36vh container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-2xl [&>div]:min-h-0! [&>div]:h-full"
          >
            {graphObject}
          </motion.div>
        </div>

        {/* Scrolling story cards */}
        <div className="flex flex-col gap-32 pb-24">
          {children}
        </div>
      </div>

      {/* ── DESKTOP layout: sticky graph left + cards right ── */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 h-[calc(100vh-6rem)] sticky top-24 z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full shadow-2xl rounded-2xl relative"
          >
            <div className="absolute -inset-1 bg-linear-to-r from-brand-500/20 via-transparent to-brand-500/20 blur-xl opacity-50 rounded-3xl -z-10" />
            {graphObject}
          </motion.div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-32 pb-64 lg:pl-8">
          {children}
        </div>
      </div>

    </div>
  );
}
