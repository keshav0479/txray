"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, ChevronRight } from "lucide-react";

interface UTXOBox {
  id: string;
  value: string;
  address: string;
  status: "unspent" | "spent" | "new";
}

interface TransactionDiagramProps {
  title?: string;
  description?: string;
  inputs: UTXOBox[];
  outputs: UTXOBox[];
  fee?: string;
  autoPlay?: boolean;
}

export function TransactionDiagram({
  title = "Transaction Flow",
  description,
  inputs,
  outputs,
  fee,
  autoPlay = false,
}: TransactionDiagramProps) {
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  const steps = [
    { label: "Initial State", description: "UTXOs waiting to be spent" },
    { label: "Select Inputs", description: "Choose which UTXOs to spend" },
    { label: "Create Outputs", description: "Define new UTXOs for recipients" },
    { label: "Complete", description: "Transaction confirmed on blockchain" },
  ];

  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      setStep(0);
    }
  };

  const reset = () => {
    setStep(0);
    setIsPlaying(false);
  };

  // Auto-advance steps
  useState(() => {
    if (isPlaying) {
      const timer = setInterval(() => {
        setStep((s) => (s < steps.length - 1 ? s + 1 : 0));
      }, 2000);
      return () => clearInterval(timer);
    }
  });

  const getInputStyle = (index: number) => {
    if (step === 0) return "border-[var(--docs-panel-border)] bg-[var(--docs-panel)]";
    if (step >= 1) return "border-blue-500/50 bg-blue-500/10 ring-2 ring-blue-500/30";
    return "border-[var(--docs-panel-border)] bg-[var(--docs-panel)]";
  };

  const getOutputStyle = (index: number) => {
    if (step < 2) return "border-[var(--docs-panel-border)] bg-[var(--docs-panel)] opacity-40";
    if (step >= 2) return "border-emerald-500/50 bg-emerald-500/10 ring-2 ring-emerald-500/30";
    return "border-[var(--docs-panel-border)] bg-[var(--docs-panel)]";
  };

  return (
    <div className="my-8 rounded-2xl border border-[var(--docs-panel-border)] bg-[var(--docs-panel)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--docs-panel-border)] flex items-center justify-between">
        <div>
          <h4 className="text-base font-semibold text-[var(--docs-text)]">{title}</h4>
          {description && (
            <p className="text-sm text-[var(--docs-muted)] mt-0.5">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-lg border border-[var(--docs-panel-border)] text-[var(--docs-muted)] hover:text-[var(--docs-text)] hover:bg-[var(--docs-panel-hover)] transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={reset}
            className="p-2 rounded-lg border border-[var(--docs-panel-border)] text-[var(--docs-muted)] hover:text-[var(--docs-text)] hover:bg-[var(--docs-panel-hover)] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Diagram */}
      <div className="p-6">
        <div className="flex items-center justify-between gap-4">
          {/* Inputs */}
          <div className="flex-1 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--docs-muted)] mb-3">
              Inputs (UTXOs being spent)
            </p>
            {inputs.map((input, i) => (
              <motion.div
                key={input.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`p-3 rounded-xl border transition-all duration-300 ${getInputStyle(i)}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono text-[var(--docs-text)]">{input.value}</span>
                  {step >= 1 && (
                    <span className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold">
                      Selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--docs-muted)] mt-1 font-mono truncate">
                  {input.address}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Arrow */}
          <div className="flex flex-col items-center gap-2 px-4">
            <motion.div
              animate={{
                scale: step >= 2 ? [1, 1.2, 1] : 1,
                opacity: step >= 1 ? 1 : 0.3,
              }}
              transition={{ duration: 0.3 }}
            >
              <ChevronRight className="w-8 h-8 text-[var(--docs-accent)]" />
            </motion.div>
            {fee && step >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-amber-400 font-mono"
              >
                Fee: {fee}
              </motion.div>
            )}
          </div>

          {/* Outputs */}
          <div className="flex-1 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--docs-muted)] mb-3">
              Outputs (New UTXOs)
            </p>
            {outputs.map((output, i) => (
              <motion.div
                key={output.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ 
                  opacity: step >= 2 ? 1 : 0.4, 
                  x: 0,
                  scale: step >= 3 ? [1, 1.02, 1] : 1
                }}
                transition={{ delay: i * 0.1 }}
                className={`p-3 rounded-xl border transition-all duration-300 ${getOutputStyle(i)}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono text-[var(--docs-text)]">{output.value}</span>
                  {step >= 3 && (
                    <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">
                      Confirmed
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--docs-muted)] mt-1 font-mono truncate">
                  {output.address}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="px-5 py-4 border-t border-[var(--docs-panel-border)] bg-[var(--docs-bg)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i === step
                    ? "bg-[var(--docs-accent)] scale-125"
                    : i < step
                    ? "bg-[var(--docs-accent)]/50"
                    : "bg-[var(--docs-panel-border)]"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--docs-muted)]">
              <span className="text-[var(--docs-text)] font-medium">{steps[step].label}</span>
              {" — "}{steps[step].description}
            </span>
            <button
              onClick={nextStep}
              className="px-3 py-1.5 rounded-lg bg-[var(--docs-accent)]/10 text-[var(--docs-accent)] text-sm font-medium hover:bg-[var(--docs-accent)]/20 transition-colors"
            >
              {step === steps.length - 1 ? "Restart" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
