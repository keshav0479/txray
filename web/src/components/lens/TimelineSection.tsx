"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface TimelineSectionProps {
  index: number;
  title: string;
  description: string;
  Graphic: React.ComponentType<{ isPlaying: boolean }>;
  isLast?: boolean;
}

export function TimelineSection({ index, title, description, Graphic, isLast }: TimelineSectionProps) {
  const isEven = index % 2 === 0;

  // Ref for the whole section to trigger animations
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { margin: "-30% 0px -30% 0px", once: false });

  // The isPlaying state derives directly from isInView.
  const isPlaying = isInView;

  return (
    <div
      ref={sectionRef}
      className="relative flex flex-col md:flex-row items-center justify-between w-full min-h-[50vh] py-16"
    >
      {/*
        THE CONNECTOR LINE FILL
        A line that drops down to connect the nodes
      */}
      <div className="absolute left-[24px] md:left-1/2 md:-ml-[1px] top-0 bottom-0 w-[2px]">
        <motion.div
          className="w-full bg-lens-500 origin-top"
          initial={{ scaleY: 0 }}
          animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ height: isLast ? '50%' : '100%' }}
        />
      </div>

      {/*
        THE CENTER NODE
      */}
      <div className="absolute left-[16px] md:left-1/2 md:-ml-[9px] w-[18px] h-[18px] rounded-full border-4 border-black bg-zinc-800 z-10 flex items-center justify-center transition-colors duration-500"
           style={{ backgroundColor: isInView ? '#F59E0B' : '#27272a' }}>
        {isInView && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
            className="absolute rounded-full bg-lens-500 inset-0 pointer-events-none"
          />
        )}
      </div>

      {/*
        LEFT SIDE (Content A)
      */}
      <div className={`w-full md:w-[45%] pl-16 md:pl-0 flex ${isEven ? 'md:justify-end' : 'md:justify-start'} ${isEven ? 'md:order-1' : 'md:order-2'}`}>
        <motion.div
          initial={{ opacity: 0, x: isEven ? -50 : 50 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: isEven ? -50 : 50 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className={`flex flex-col gap-6 max-w-lg ${isEven ? 'md:text-right md:items-end' : 'md:text-left md:items-start'}`}
        >
          <span className="text-lens-500 font-mono text-base tracking-widest font-bold">
            0{index + 1}
          </span>
          <h3 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight">
            {title}
          </h3>
          <p className="text-lg md:text-xl text-zinc-400 leading-relaxed">
            {description}
          </p>
        </motion.div>
      </div>

      {/*
        RIGHT SIDE (Content B / The Graphic Placeholder)
      */}
      <div className={`w-full md:w-[45%] pl-16 md:pl-0 mt-12 md:mt-0 flex ${isEven ? 'md:justify-start' : 'md:justify-end'} ${isEven ? 'md:order-2' : 'md:order-1'}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className={`w-full max-w-md aspect-square rounded-3xl border ${isInView ? 'border-lens-500/30 bg-lens-500/5' : 'border-white/10 bg-zinc-900/50'} backdrop-blur-sm flex items-center justify-center relative overflow-hidden group transition-all duration-700`}
        >
          {/* Subtle glow behind the graphic */}
          <div className="absolute inset-0 bg-lens-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="relative z-10 w-full h-full flex items-center justify-center pointer-events-none p-8">
            <Graphic isPlaying={isPlaying} />
          </div>

        </motion.div>
      </div>

    </div>
  );
}
