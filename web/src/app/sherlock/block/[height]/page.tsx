"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Footer } from "@/components/shared/Footer";
import { ContentScanLoader } from "@/components/sherlock/ContentScanLoader";

export default function SherlockBlockPage({
  params,
}: {
  params: Promise<{ height: string }>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [dataReady, setDataReady] = useState(false);
  const [stem, setStem] = useState<string | null>(null);

  useEffect(() => {
    params.then(async (p) => {
      try {
        const res = await fetch(`/api/sherlock/block/${p.height}`);
        const json = await res.json();

        if (!json.ok) {
          setError(json.error?.message || "Failed to analyze block");
          return;
        }

        setStem(json.stem);
        setDataReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to analyze block");
      }
    });
  }, [params]);

  const handleLoaderComplete = useCallback(() => {
    if (stem) {
      router.push(`/sherlock/${stem}`);
    }
  }, [stem, router]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              Analysis Failed
            </h2>
            <p className="text-stone-400 text-sm mb-6">{error}</p>
            <Link
              href="/sherlock"
              className="px-6 py-2 rounded-full bg-sherlock-600 text-white font-semibold text-sm hover:bg-sherlock-500 transition-colors"
            >
              Back to Sherlock
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <ContentScanLoader
      dataReady={dataReady}
      onComplete={handleLoaderComplete}
    />
  );
}
