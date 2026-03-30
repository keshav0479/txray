"use client";

import { SherlockBackground } from "@/components/sherlock/SherlockBackground";

export default function SherlockPage() {
  return (
    <>
      <SherlockBackground />
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-2xl p-12 max-w-lg text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Sherlock</h1>
          <p className="text-zinc-400">
            Privacy analysis coming in next commit.
          </p>
        </div>
      </div>
    </>
  );
}
