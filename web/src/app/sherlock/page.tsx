"use client";

import Link from "next/link";
import { SherlockBackground } from "@/components/sherlock/SherlockBackground";
import { UploadCard } from "@/components/sherlock/UploadCard";

export default function SherlockDashboardPage() {
  return (
    <>
      <SherlockBackground />
      <div className="w-full max-w-5xl mx-auto px-6 pt-32 pb-16 z-10 relative">
        {/* ── HEADER ── */}
        <div className="border-b border-white/10 pb-6 mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">Evidence Board</h1>
          <p className="font-mono text-sm text-sherlock-400 tracking-widest uppercase">Select_Block_File_</p>
        </div>

        {/* ── CASE FILES ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Link
            href="/sherlock/blk04330"
            className="group relative flex flex-col rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md p-8 hover:border-sherlock-500/50 hover:bg-black/60 hover:shadow-[0_0_30px_rgba(212,165,70,0.15)] transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-8">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-sherlock-500/80 group-hover:text-sherlock-400 transition-colors">
                Case File #04330
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-sherlock-900/50 group-hover:bg-sherlock-400 group-hover:shadow-[0_0_10px_rgba(212,165,70,0.8)] group-hover:animate-pulse transition-all duration-300" />
            </div>

            <h2 className="text-3xl font-bold text-white mb-8 group-hover:text-sherlock-50 transition-colors tracking-tight">
              blk04330.dat
            </h2>
            
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/5">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Blocks</span>
                <span className="text-white font-mono text-xl">84</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Tx_Count</span>
                <span className="text-white font-mono text-xl">341,792</span>
              </div>
              <div className="flex flex-col whitespace-nowrap">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Heights</span>
                <span className="text-white font-mono text-sm self-end">847,493 → 847,576</span>
              </div>
            </div>
          </Link>

          <Link
            href="/sherlock/blk05051"
            className="group relative flex flex-col rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md p-8 hover:border-sherlock-500/50 hover:bg-black/60 hover:shadow-[0_0_30px_rgba(212,165,70,0.15)] transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-8">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-sherlock-500/80 group-hover:text-sherlock-400 transition-colors">
                Case File #05051
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-sherlock-900/50 group-hover:bg-sherlock-400 group-hover:shadow-[0_0_10px_rgba(212,165,70,0.8)] group-hover:animate-pulse transition-all duration-300" />
            </div>

            <h2 className="text-3xl font-bold text-white mb-8 group-hover:text-sherlock-50 transition-colors tracking-tight">
              blk05051.dat
            </h2>
            
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/5">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Blocks</span>
                <span className="text-white font-mono text-xl">78</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Tx_Count</span>
                <span className="text-white font-mono text-xl">256,523</span>
              </div>
              <div className="flex flex-col whitespace-nowrap">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Heights</span>
                <span className="text-white font-mono text-sm self-end">907,162 → 907,233</span>
              </div>
            </div>
          </Link>
        </div>

        {/* ── UPLOAD ── */}
        <div className="mt-8">
          <UploadCard />
        </div>
      </div>
    </>
  );
}
