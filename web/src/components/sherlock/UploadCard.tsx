"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, AlertTriangle } from "lucide-react";

export function UploadCard() {
  const router = useRouter();
  const [blkFile, setBlkFile] = useState<File | null>(null);
  const [revFile, setRevFile] = useState<File | null>(null);
  const [xorFile, setXorFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!blkFile || !revFile || !xorFile) return;
    setUploading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("blk", blkFile);
      form.append("rev", revFile);
      form.append("xor", xorFile);

      const res = await fetch("/api/sherlock/analyze", {
        method: "POST",
        body: form,
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error?.message || "Analysis failed");
        return;
      }

      router.push(`/sherlock/${data.stem}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  const allSelected = blkFile && revFile && xorFile;

  return (
    <div className="flex flex-col rounded-3xl border border-white/8 bg-stone-950/50 backdrop-blur-xl p-8">
      <div className="text-center mb-6">
        <Upload className="w-10 h-10 text-sherlock-500 mx-auto mb-3 opacity-80" />
        <h3 className="text-xl font-bold text-white mb-2">
          Upload Block Files
        </h3>
        <p className="text-sm text-stone-400">
          Upload Bitcoin Core block files (.dat) for privacy analysis.
        </p>
      </div>

      <div className="space-y-3 flex-1">
        {[
          { label: "BLK File", key: "blk", setter: setBlkFile, file: blkFile },
          { label: "REV File", key: "rev", setter: setRevFile, file: revFile },
          { label: "XOR File", key: "xor", setter: setXorFile, file: xorFile },
        ].map(({ label, setter, file }) => (
          <div key={label} className="space-y-1">
            <label className="text-[10px] font-mono text-stone-500 uppercase tracking-widest">
              {label} <span className="text-red-400">*</span>
            </label>
            <input
              type="file"
              accept=".dat"
              onChange={(e) => setter(e.target.files?.[0] || null)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-stone-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-stone-800 file:text-stone-300 hover:file:bg-stone-700 cursor-pointer transition-colors"
            />
            {file && (
              <p className="text-[10px] font-mono text-sherlock-400/60 ml-1">
                {file.name}
              </p>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-xs text-red-400">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400/50 hover:text-red-300"
          >
            ✕
          </button>
        </div>
      )}

      {!allSelected && (blkFile || revFile || xorFile) && !error && (
        <p className="mt-3 text-[10px] text-amber-400/70 font-mono">
          All three files (BLK, REV, XOR) required.
        </p>
      )}

      <button
        onClick={handleAnalyze}
        disabled={!allSelected || uploading}
        className="mt-6 group w-full flex items-center justify-center gap-2 font-bold px-6 py-4 rounded-xl transition-all duration-300 border bg-transparent border-sherlock-500/50 text-sherlock-400 hover:bg-sherlock-500/10 hover:border-sherlock-400 hover:text-sherlock-300 hover:shadow-[0_0_20px_rgba(212,165,70,0.3),inset_0_0_10px_rgba(212,165,70,0.1)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-transparent disabled:hover:border-sherlock-500/50 disabled:hover:text-sherlock-400 text-sm"
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing…
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 opacity-80 group-hover:opacity-100 transition-opacity" />
            Run Analysis
          </>
        )}
      </button>
    </div>
  );
}
