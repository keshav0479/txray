"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Copy, Check, RotateCcw, Terminal, Code2 } from "lucide-react";

interface CodePlaygroundProps {
  title?: string;
  description?: string;
  code: string;
  language?: string;
  editable?: boolean;
  expectedOutput?: string;
  hints?: string[];
}

export function CodePlayground({
  title = "Code Example",
  description,
  code: initialCode,
  language = "javascript",
  editable = true,
  expectedOutput,
  hints = [],
}: CodePlaygroundProps) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);

  const runCode = useCallback(async () => {
    setIsRunning(true);
    setOutput(null);

    // Simulate code execution with a delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      // For demo purposes, we'll just show the expected output or a mock result
      // In a real implementation, this could use a sandboxed eval or API
      if (expectedOutput) {
        setOutput(expectedOutput);
      } else {
        setOutput("// Code executed successfully\n// Output would appear here");
      }
    } catch (err) {
      setOutput(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setIsRunning(false);
    }
  }, [expectedOutput]);

  const copyCode = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const resetCode = useCallback(() => {
    setCode(initialCode);
    setOutput(null);
  }, [initialCode]);

  const nextHint = useCallback(() => {
    if (hintIndex < hints.length - 1) {
      setHintIndex(hintIndex + 1);
    }
    setShowHint(true);
  }, [hintIndex, hints.length]);

  return (
    <div className="my-8 rounded-2xl border border-[var(--docs-panel-border)] bg-[var(--docs-panel)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--docs-panel-border)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/10">
            <Code2 className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-[var(--docs-text)]">
              {title}
            </h4>
            {description && (
              <p className="text-sm text-[var(--docs-muted)] mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[var(--docs-muted)] px-2 py-1 rounded bg-[var(--docs-bg)]">
            {language}
          </span>
        </div>
      </div>

      {/* Code Editor */}
      <div className="relative">
        <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
          <button
            onClick={copyCode}
            className="p-2 rounded-lg bg-[var(--docs-bg)]/80 backdrop-blur border border-[var(--docs-panel-border)] text-[var(--docs-muted)] hover:text-[var(--docs-text)] transition-colors"
            title="Copy code"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
          {editable && code !== initialCode && (
            <button
              onClick={resetCode}
              className="p-2 rounded-lg bg-[var(--docs-bg)]/80 backdrop-blur border border-[var(--docs-panel-border)] text-[var(--docs-muted)] hover:text-[var(--docs-text)] transition-colors"
              title="Reset code"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="bg-[var(--docs-bg)] p-4">
          {editable ? (
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full min-h-[200px] bg-transparent font-mono text-sm text-[var(--docs-text)] resize-y focus:outline-none leading-relaxed"
              spellCheck={false}
            />
          ) : (
            <pre className="font-mono text-sm text-[var(--docs-text)] whitespace-pre-wrap leading-relaxed">
              {code}
            </pre>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 py-3 border-t border-[var(--docs-panel-border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={runCode}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 font-medium text-sm hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Terminal className="w-4 h-4" />
                </motion.div>
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Code
              </>
            )}
          </button>

          {hints.length > 0 && (
            <button
              onClick={nextHint}
              className="px-4 py-2 rounded-lg border border-[var(--docs-panel-border)] text-[var(--docs-muted)] text-sm hover:text-[var(--docs-text)] hover:bg-[var(--docs-panel-hover)] transition-colors"
            >
              {showHint ? `Hint ${hintIndex + 1}/${hints.length}` : "Show Hint"}
            </button>
          )}
        </div>

        {editable && (
          <span className="text-xs text-[var(--docs-muted)]">
            Try editing the code above
          </span>
        )}
      </div>

      {/* Hint */}
      <AnimatePresence>
        {showHint && hints[hintIndex] && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-3 border-t border-[var(--docs-panel-border)] bg-amber-500/5">
              <div className="flex items-start gap-2">
                <span className="text-amber-400 text-sm">💡</span>
                <p className="text-sm text-[var(--docs-text)]">
                  {hints[hintIndex]}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Output */}
      <AnimatePresence>
        {output && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--docs-panel-border)]">
              <div className="px-5 py-2 bg-[var(--docs-bg)] border-b border-[var(--docs-panel-border)]">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[var(--docs-muted)]" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--docs-muted)]">
                    Output
                  </span>
                </div>
              </div>
              <div className="p-4 bg-[var(--docs-bg)]">
                <pre className="font-mono text-sm text-emerald-400 whitespace-pre-wrap">
                  {output}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
