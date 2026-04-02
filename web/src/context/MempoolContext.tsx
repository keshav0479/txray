"use client";

import { createContext, useContext } from "react";
import { useMempoolWS, type UseMempoolWSResult } from "@/hooks/useMempoolWS";

const MempoolContext = createContext<UseMempoolWSResult | null>(null);

export function MempoolProvider({ children }: { children: React.ReactNode }) {
  const value = useMempoolWS();
  return (
    <MempoolContext.Provider value={value}>{children}</MempoolContext.Provider>
  );
}

export function useMempool(): UseMempoolWSResult {
  const ctx = useContext(MempoolContext);
  if (!ctx) throw new Error("useMempool must be used within MempoolProvider");
  return ctx;
}
