"use client";

import { SmithBackground } from "@/components/smith/SmithBackground";

export default function SmithPage() {
  return (
    <>
      <SmithBackground />
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-2xl p-12 max-w-lg text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Smith</h1>
          <p className="text-zinc-400">
            PSBT builder coming in next commit.
          </p>
        </div>
      </div>
    </>
  );
}
