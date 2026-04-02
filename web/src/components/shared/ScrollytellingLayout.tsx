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
    <div className="relative w-full max-w-7xl mx-auto min-h-screen grid grid-cols-1 lg:grid-cols-12 gap-8 px-6 py-12">
      {/* 
        LEFT PANE (Sticky Graph)
        Takes up 7 cols on large screens, sits sticky at the top of the viewport
      */}
      <div className="lg:col-span-7 h-[60vh] lg:h-[calc(100vh-6rem)] sticky top-24 z-10 hidden md:block">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full h-full shadow-2xl rounded-2xl relative"
        >
          {/* Subtle Outer Glow */}
          <div className="absolute -inset-1 bg-linear-to-r from-brand-500/20 via-transparent to-brand-500/20 blur-xl opacity-50 rounded-3xl -z-10" />
          {graphObject}
        </motion.div>
      </div>

      {/* 
        RIGHT PANE (Scrolling Story)
        Takes up 5 cols. The user scrolls this to progress the "story"
      */}
      <div className="lg:col-span-5 flex flex-col gap-32 pb-64 lg:pl-8">
        {children}
      </div>
    </div>
  );
}
