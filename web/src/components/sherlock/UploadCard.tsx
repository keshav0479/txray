"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, AlertTriangle, FolderOpen } from "lucide-react";

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

      const res = await fetch("/api/sherlock/analyze", { method: "POST", body: form });
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
    <div className="flex flex-col rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md p-8 border-dashed border-blue-500/20 hover:border-blue-500/40 transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-blue-500/60">
          Upload Custom Block
        </span>
        <FolderOpen className="w-4 h-4 text-blue-500/40" />
      </div>

      <h2 className="text-2xl font-bold text-white/70 mb-6 tracking-tight">
        Analyze Your Block
      </h2>

      <div className="space-y-3 flex-1">
        {[
          { label: "BLK File", key: "blk", setter: setBlkFile, file: blkFile },
          { label: "REV File", key: "rev", setter: setRevFile, file: revFile },
          { label: "XOR File", key: "xor", setter: setXorFile, file: xorFile },
        ].map(({ label, setter, file }) => (
          <div key={label} className="space-y-1">
            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              {label} <span className="text-red-400">*</span>
            </label>
            <input
              type="file"
              accept=".dat"
              onChange={(e) => setter(e.target.files?.[0] || null)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-zinc-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700 cursor-pointer transition-colors"
            />
            {file && (
              <p className="text-[10px] font-mono text-blue-400/60 ml-1">{file.name}</p>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-xs text-red-400">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400/50 hover:text-red-300">✕</button>
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
        className="mt-6 w-full flex items-center justify-center gap-2 bg-blue-600/80 text-white font-bold px-6 py-3.5 rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing…
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Run Analysis
          </>
        )}
      </button>
    </div>
  );
}
