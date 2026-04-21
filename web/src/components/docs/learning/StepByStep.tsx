"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Circle,
  BookOpen,
  RotateCcw,
} from "lucide-react";

interface Step {
  title: string;
  content: React.ReactNode;
  image?: string;
  code?: string;
}

interface StepByStepProps {
  title: string;
  description?: string;
  steps: Step[];
  onComplete?: () => void;
}

export function StepByStep({
  title,
  description,
  steps,
  onComplete,
}: StepByStepProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isComplete, setIsComplete] = useState(false);

  const goToStep = useCallback(
    (index: number) => {
      if (index >= 0 && index < steps.length) {
        setCurrentStep(index);
      }
    },
    [steps.length],
  );

  const nextStep = useCallback(() => {
    // Mark current step as completed
    setCompletedSteps((prev) => new Set([...prev, currentStep]));

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsComplete(true);
      onComplete?.();
    }
  }, [currentStep, steps.length, onComplete]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setIsComplete(false);
  }, []);

  const progress = ((completedSteps.size / steps.length) * 100).toFixed(0);

  return (
    <div className="my-8 rounded-2xl border border-[var(--docs-panel-border)] bg-[var(--docs-panel)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--docs-panel-border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <BookOpen className="w-4 h-4 text-blue-400" />
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
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--docs-muted)]">
              {progress}% complete
            </span>
            <button
              onClick={reset}
              className="p-2 rounded-lg border border-[var(--docs-panel-border)] text-[var(--docs-muted)] hover:text-[var(--docs-text)] hover:bg-[var(--docs-panel-hover)] transition-colors"
              title="Reset tutorial"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-1.5 bg-[var(--docs-bg)] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Step indicators */}
      <div className="px-5 py-3 border-b border-[var(--docs-panel-border)] bg-[var(--docs-bg)]">
        <div className="flex items-center gap-1 overflow-x-auto">
          {steps.map((step, index) => (
            <button
              key={index}
              onClick={() => goToStep(index)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all ${
                index === currentStep
                  ? "bg-[var(--docs-accent)]/10 text-[var(--docs-accent)]"
                  : completedSteps.has(index)
                    ? "text-emerald-400 hover:bg-[var(--docs-panel-hover)]"
                    : "text-[var(--docs-muted)] hover:bg-[var(--docs-panel-hover)] hover:text-[var(--docs-text)]"
              }`}
            >
              {completedSteps.has(index) ? (
                <Check className="w-4 h-4" />
              ) : (
                <Circle
                  className={`w-4 h-4 ${index === currentStep ? "fill-current" : ""}`}
                />
              )}
              <span className="font-medium">{index + 1}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {isComplete ? (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center"
              >
                <Check className="w-8 h-8 text-emerald-400" />
              </motion.div>
              <h3 className="text-xl font-semibold text-[var(--docs-text)] mb-2">
                Tutorial Complete!
              </h3>
              <p className="text-[var(--docs-muted)] mb-4">
                You&apos;ve successfully completed all {steps.length} steps.
              </p>
              <button
                onClick={reset}
                className="px-4 py-2 rounded-lg border border-[var(--docs-panel-border)] text-[var(--docs-muted)] hover:text-[var(--docs-text)] hover:bg-[var(--docs-panel-hover)] transition-colors"
              >
                Start Over
              </button>
            </motion.div>
          ) : (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-semibold text-[var(--docs-accent)]">
                  Step {currentStep + 1} of {steps.length}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-[var(--docs-text)] mb-4">
                {steps[currentStep].title}
              </h3>

              <div className="prose prose-sm max-w-none text-[var(--docs-text)] prose-p:text-[var(--docs-text)] prose-strong:text-[var(--docs-text)]">
                {steps[currentStep].content}
              </div>

              {steps[currentStep].image && (
                <div className="mt-4 rounded-xl overflow-hidden border border-[var(--docs-panel-border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={steps[currentStep].image}
                    alt={steps[currentStep].title}
                    className="w-full"
                  />
                </div>
              )}

              {steps[currentStep].code && (
                <div className="mt-4 rounded-xl overflow-hidden border border-[var(--docs-panel-border)] bg-[var(--docs-bg)]">
                  <pre className="p-4 font-mono text-sm text-[var(--docs-text)] overflow-x-auto">
                    {steps[currentStep].code}
                  </pre>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      {!isComplete && (
        <div className="px-5 py-4 border-t border-[var(--docs-panel-border)] flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--docs-panel-border)] text-[var(--docs-muted)] hover:text-[var(--docs-text)] hover:bg-[var(--docs-panel-hover)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <span className="text-sm text-[var(--docs-muted)]">
            {currentStep + 1} / {steps.length}
          </span>

          <button
            onClick={nextStep}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--docs-accent)]/10 text-[var(--docs-accent)] font-medium hover:bg-[var(--docs-accent)]/20 transition-colors"
          >
            {currentStep === steps.length - 1 ? "Complete" : "Next"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
