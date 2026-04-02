"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  X,
  HelpCircle,
  RotateCcw,
  ChevronRight,
  Trophy,
} from "lucide-react";

interface QuizOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

interface QuizQuestion {
  question: string;
  options: QuizOption[];
  explanation?: string;
}

interface QuizProps {
  title?: string;
  questions: QuizQuestion[];
  showProgress?: boolean;
  allowRetry?: boolean;
}

export function Quiz({
  title = "Knowledge Check",
  questions,
  showProgress = true,
  allowRetry = true,
}: QuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [answers, setAnswers] = useState<
    Record<number, { selected: string; correct: boolean }>
  >({});

  const question = questions[currentQuestion];
  const correctOption = question?.options.find((o) => o.isCorrect);

  const submitAnswer = useCallback(() => {
    if (!selectedAnswer || isAnswered) return;

    const isCorrect =
      question.options.find((o) => o.id === selectedAnswer)?.isCorrect || false;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion]: { selected: selectedAnswer, correct: isCorrect },
    }));

    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
    }

    setIsAnswered(true);
  }, [selectedAnswer, isAnswered, question, currentQuestion]);

  const nextQuestion = useCallback(() => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setIsComplete(true);
    }
  }, [currentQuestion, questions.length]);

  const reset = useCallback(() => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setCorrectCount(0);
    setIsComplete(false);
    setAnswers({});
  }, []);

  const score = Math.round((correctCount / questions.length) * 100);

  const getOptionStyle = (option: QuizOption) => {
    if (!isAnswered) {
      return selectedAnswer === option.id
        ? "border-[var(--docs-accent)] bg-[var(--docs-accent)]/10 ring-2 ring-[var(--docs-accent)]/30"
        : "border-[var(--docs-panel-border)] hover:border-[var(--docs-accent)]/50 hover:bg-[var(--docs-panel-hover)]";
    }

    if (option.isCorrect) {
      return "border-emerald-500/50 bg-emerald-500/10 ring-2 ring-emerald-500/30";
    }

    if (selectedAnswer === option.id && !option.isCorrect) {
      return "border-red-500/50 bg-red-500/10 ring-2 ring-red-500/30";
    }

    return "border-[var(--docs-panel-border)] opacity-50";
  };

  return (
    <div className="my-8 rounded-2xl border border-[var(--docs-panel-border)] bg-[var(--docs-panel)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--docs-panel-border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <HelpCircle className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-[var(--docs-text)]">
                {title}
              </h4>
              {showProgress && !isComplete && (
                <p className="text-sm text-[var(--docs-muted)] mt-0.5">
                  Question {currentQuestion + 1} of {questions.length}
                </p>
              )}
            </div>
          </div>
          {allowRetry && (
            <button
              onClick={reset}
              className="p-2 rounded-lg border border-[var(--docs-panel-border)] text-[var(--docs-muted)] hover:text-[var(--docs-text)] hover:bg-[var(--docs-panel-hover)] transition-colors"
              title="Reset quiz"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress bar */}
        {showProgress && !isComplete && (
          <div className="mt-4 h-1.5 bg-[var(--docs-bg)] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-400"
              initial={{ width: 0 }}
              animate={{
                width: `${((currentQuestion + 1) / questions.length) * 100}%`,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {isComplete ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  score >= 70 ? "bg-emerald-500/10" : "bg-amber-500/10"
                }`}
              >
                <Trophy
                  className={`w-10 h-10 ${score >= 70 ? "text-emerald-400" : "text-amber-400"}`}
                />
              </motion.div>

              <h3 className="text-2xl font-bold text-[var(--docs-text)] mb-2">
                {score}%
              </h3>
              <p className="text-[var(--docs-muted)] mb-2">
                You got {correctCount} out of {questions.length} questions
                correct
              </p>
              <p className="text-sm text-[var(--docs-muted)] mb-6">
                {score >= 90
                  ? "Excellent! You really know your stuff!"
                  : score >= 70
                    ? "Good job! You have a solid understanding."
                    : score >= 50
                      ? "Not bad! Review the concepts and try again."
                      : "Keep learning! Review the material and retry."}
              </p>

              {/* Question summary */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {questions.map((_, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full ${
                      answers[index]?.correct ? "bg-emerald-400" : "bg-red-400"
                    }`}
                  />
                ))}
              </div>

              {allowRetry && (
                <button
                  onClick={reset}
                  className="px-6 py-2.5 rounded-lg bg-[var(--docs-accent)]/10 text-[var(--docs-accent)] font-medium hover:bg-[var(--docs-accent)]/20 transition-colors"
                >
                  Try Again
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="text-lg font-semibold text-[var(--docs-text)] mb-6">
                {question.question}
              </h3>

              <div className="space-y-3">
                {question.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => !isAnswered && setSelectedAnswer(option.id)}
                    disabled={isAnswered}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${getOptionStyle(option)}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--docs-text)]">
                        {option.text}
                      </span>
                      {isAnswered && (
                        <span>
                          {option.isCorrect ? (
                            <Check className="w-5 h-5 text-emerald-400" />
                          ) : selectedAnswer === option.id ? (
                            <X className="w-5 h-5 text-red-400" />
                          ) : null}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Explanation */}
              <AnimatePresence>
                {isAnswered && question.explanation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 p-4 rounded-xl bg-[var(--docs-bg)] border border-[var(--docs-panel-border)]">
                      <p className="text-sm text-[var(--docs-muted)]">
                        <span className="font-semibold text-[var(--docs-text)]">
                          Explanation:
                        </span>{" "}
                        {question.explanation}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      {!isComplete && (
        <div className="px-5 py-4 border-t border-[var(--docs-panel-border)] flex items-center justify-between">
          <div className="text-sm text-[var(--docs-muted)]">
            {isAnswered ? (
              answers[currentQuestion]?.correct ? (
                <span className="text-emerald-400">Correct!</span>
              ) : (
                <span className="text-red-400">
                  Incorrect. The answer was: {correctOption?.text}
                </span>
              )
            ) : (
              "Select an answer"
            )}
          </div>

          {isAnswered ? (
            <button
              onClick={nextQuestion}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--docs-accent)]/10 text-[var(--docs-accent)] font-medium hover:bg-[var(--docs-accent)]/20 transition-colors"
            >
              {currentQuestion === questions.length - 1
                ? "See Results"
                : "Next"}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={submitAnswer}
              disabled={!selectedAnswer}
              className="px-4 py-2 rounded-lg bg-[var(--docs-accent)]/10 text-[var(--docs-accent)] font-medium hover:bg-[var(--docs-accent)]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Answer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
