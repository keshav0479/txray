"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StoryCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  isActive?: boolean;
}

export function StoryCard({ title, icon, children, isActive = false }: StoryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20% 0px -20% 0px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex flex-col gap-6 p-8 rounded-3xl border transition-all duration-700",
        isActive 
          ? "border-brand-500/30 bg-surface-card shadow-[0_0_40px_-10px_rgba(59,130,246,0.15)]" 
          : "border-surface-border bg-surface-card/40 opacity-50 hover:opacity-100"
      )}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className={cn(
            "p-2 rounded-xl border transition-colors duration-500",
            isActive ? "bg-brand-500/10 border-brand-500/30 text-brand-500" : "bg-white/5 border-white/10 text-text-secondary"
          )}>
            {icon}
          </div>
        )}
        <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
          {title}
        </h2>
      </div>

      <div className="text-lg text-text-secondary leading-relaxed">
        {children}
      </div>
    </motion.div>
  );
}
