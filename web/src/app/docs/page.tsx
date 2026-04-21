import Link from "next/link";
import {
  Rocket,
  Boxes,
  Search,
  Microscope,
  Wrench,
  BookOpen,
  ArrowRight,
  Eye,
  Shield,
  Hammer,
  HelpCircle,
  Lightbulb,
  FileText,
  ExternalLink,
} from "lucide-react";

/**
 * txray has THREE tools that form a learning journey:
 *
 * LENS -> Understand (decode transactions at byte level)
 * SHERLOCK -> Analyze (detect patterns, privacy leaks)
 * SMITH -> Build (create better PSBTs)
 *
 * The docs index should reflect this progression,
 * NOT push any single tool.
 */

const intents = [
  {
    question: "Decode a transaction",
    description: "Parse raw bytes, understand structure, see what's inside",
    href: "/docs/tools/lens",
    icon: Eye,
  },
  {
    question: "Learn Bitcoin privacy",
    description: "Understand what leaks, why it matters, how analysis works",
    href: "/docs/concepts/privacy-basics",
    icon: Shield,
  },
  {
    question: "Analyze patterns",
    description: "Apply heuristics, detect change outputs, cluster addresses",
    href: "/docs/heuristics/common-input-ownership",
    icon: Search,
  },
  {
    question: "Build transactions",
    description: "Create PSBTs with better privacy and fee control",
    href: "/docs/tools/smith",
    icon: Hammer,
  },
];

const sections = [
  {
    href: "/docs/getting-started",
    title: "Getting Started",
    description:
      "Installation, first steps, and how the three tools work together.",
    icon: Rocket,
  },
  {
    href: "/docs/concepts/utxo-model",
    title: "Concepts",
    description: "UTXO model, transaction structure, and privacy fundamentals.",
    icon: Boxes,
  },
  {
    href: "/docs/heuristics/common-input-ownership",
    title: "Heuristics",
    description:
      "The detection methods: ownership, change, clustering, fingerprinting.",
    icon: Search,
  },
  {
    href: "/docs/methodology/lens-parsing",
    title: "Methodology",
    description: "How each tool works under the hood. The math and the papers.",
    icon: Microscope,
  },
  {
    href: "/docs/tools/lens",
    title: "Tools",
    description: "Reference guides for Lens, Sherlock, and Smith.",
    icon: Wrench,
  },
  {
    href: "/docs/tutorials",
    title: "Tutorials",
    description:
      "Hands-on guides: analyze the Pizza transaction, detect CoinJoins, and more.",
    icon: BookOpen,
  },
];

/**
 * SVG showing the three-tool journey:
 * LENS (understand) -> SHERLOCK (analyze) -> SMITH (build)
 *
 * This represents txray's unique value: integrated toolkit for learning
 */
function ToolkitJourneySVG() {
  return (
    <svg
      viewBox="0 0 400 140"
      className="w-full max-w-md"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* LENS - Understand */}
      <g>
        <rect
          x="20"
          y="40"
          width="100"
          height="60"
          rx="12"
          stroke="var(--docs-accent)"
          strokeWidth="2"
          fill="var(--docs-panel)"
        />
        <text
          x="70"
          y="65"
          textAnchor="middle"
          fill="var(--docs-accent)"
          fontSize="14"
          fontWeight="600"
        >
          LENS
        </text>
        <text
          x="70"
          y="85"
          textAnchor="middle"
          fill="var(--docs-muted)"
          fontSize="11"
        >
          understand
        </text>
      </g>

      {/* Arrow 1 */}
      <g className="opacity-60">
        <path
          d="M 125 70 L 150 70"
          stroke="var(--docs-accent)"
          strokeWidth="2"
          strokeDasharray="4 2"
        />
        <polygon points="150,70 144,66 144,74" fill="var(--docs-accent)" />
      </g>

      {/* SHERLOCK - Analyze */}
      <g>
        <rect
          x="155"
          y="40"
          width="100"
          height="60"
          rx="12"
          stroke="var(--docs-accent)"
          strokeWidth="2"
          fill="var(--docs-panel)"
        />
        <text
          x="205"
          y="65"
          textAnchor="middle"
          fill="var(--docs-accent)"
          fontSize="14"
          fontWeight="600"
        >
          SHERLOCK
        </text>
        <text
          x="205"
          y="85"
          textAnchor="middle"
          fill="var(--docs-muted)"
          fontSize="11"
        >
          analyze
        </text>
      </g>

      {/* Arrow 2 */}
      <g className="opacity-60">
        <path
          d="M 260 70 L 285 70"
          stroke="var(--docs-accent)"
          strokeWidth="2"
          strokeDasharray="4 2"
        />
        <polygon points="285,70 279,66 279,74" fill="var(--docs-accent)" />
      </g>

      {/* SMITH - Build */}
      <g>
        <rect
          x="290"
          y="40"
          width="100"
          height="60"
          rx="12"
          stroke="var(--docs-accent)"
          strokeWidth="2"
          fill="var(--docs-panel)"
        />
        <text
          x="340"
          y="65"
          textAnchor="middle"
          fill="var(--docs-accent)"
          fontSize="14"
          fontWeight="600"
        >
          SMITH
        </text>
        <text
          x="340"
          y="85"
          textAnchor="middle"
          fill="var(--docs-muted)"
          fontSize="11"
        >
          build
        </text>
      </g>

      {/* Labels above */}
      <text
        x="70"
        y="25"
        textAnchor="middle"
        fill="var(--docs-muted)"
        fontSize="10"
        fontWeight="500"
      >
        DECODE
      </text>
      <text
        x="205"
        y="25"
        textAnchor="middle"
        fill="var(--docs-muted)"
        fontSize="10"
        fontWeight="500"
      >
        DETECT
      </text>
      <text
        x="340"
        y="25"
        textAnchor="middle"
        fill="var(--docs-muted)"
        fontSize="10"
        fontWeight="500"
      >
        FORGE
      </text>

      {/* Subtitle */}
      <text
        x="200"
        y="130"
        textAnchor="middle"
        fill="var(--docs-muted)"
        fontSize="11"
      >
        Three tools. One learning journey.
      </text>
    </svg>
  );
}

export default function DocsIndex() {
  return (
    <div className="space-y-14 pb-16">
      {/* Hero */}
      <div className="pt-4 pb-6">
        <div className="flex flex-col lg:flex-row items-center gap-10">
          {/* Text */}
          <div className="flex-1">
            <h1 className="text-4xl lg:text-5xl font-bold text-[var(--docs-text-heading)] mb-4 tracking-tight leading-tight">
              Learn Bitcoin Transactions
            </h1>
            <p className="text-lg text-[var(--docs-muted)] max-w-xl leading-relaxed mb-6">
              txray is a toolkit for understanding Bitcoin at every level - from
              raw bytes to privacy patterns to building better transactions.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/docs/getting-started"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 border-[var(--docs-accent)] text-[var(--docs-accent)] font-medium hover:bg-[var(--docs-accent)]/10 transition-colors no-underline"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/docs/concepts/utxo-model"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--docs-panel-border)] text-[var(--docs-muted)] font-medium hover:text-[var(--docs-text)] hover:border-[var(--docs-text)]/30 transition-colors no-underline"
              >
                Learn Concepts
              </Link>
            </div>
          </div>

          {/* Visual - Three Tool Journey */}
          <div className="flex-1 flex justify-center">
            <ToolkitJourneySVG />
          </div>
        </div>
      </div>

      {/* Intent-Based Navigation */}
      <div>
        <h2 className="text-xl font-semibold text-[var(--docs-text-heading)] mb-2 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-[var(--docs-accent)]" />
          What would you like to do?
        </h2>
        <p className="text-[var(--docs-muted)] text-sm mb-5">
          Choose based on your goal, not the tool.
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          {intents.map((intent) => {
            const Icon = intent.icon;
            return (
              <Link
                key={intent.href}
                href={intent.href}
                className="group flex items-start gap-4 p-4 rounded-xl border border-[var(--docs-panel-border)] bg-[var(--docs-panel)]/50 hover:bg-[var(--docs-panel)] hover:border-[var(--docs-accent-muted)] transition-all"
              >
                <div className="p-2 rounded-lg bg-[var(--docs-accent)]/10 shrink-0">
                  <Icon className="w-4 h-4 text-[var(--docs-accent)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-[var(--docs-text)] mb-0.5 flex items-center gap-2">
                    {intent.question}
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                  </h3>
                  <p className="text-sm text-[var(--docs-muted)] leading-relaxed">
                    {intent.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Documentation Sections */}
      <div>
        <h2 className="text-xl font-semibold text-[var(--docs-text-heading)] mb-5">
          Documentation
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.href}
                href={section.href}
                className="group p-5 rounded-xl bg-[var(--docs-panel)] border border-[var(--docs-panel-border)] hover:border-[var(--docs-accent-muted)] transition-all"
              >
                <div className="text-[var(--docs-accent)] mb-3">
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <h3 className="text-base font-semibold text-[var(--docs-text-heading)] mb-1.5 flex items-center gap-2">
                  {section.title}
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-50 group-hover:translate-x-0 transition-all" />
                </h3>
                <p className="text-[var(--docs-muted)] text-sm leading-relaxed">
                  {section.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Why txray */}
      <div className="p-6 rounded-xl bg-[var(--docs-panel)] border border-[var(--docs-panel-border)]">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-[var(--docs-accent)]" />
          <h2 className="text-lg font-semibold text-[var(--docs-text-heading)]">
            Why txray?
          </h2>
        </div>

        <div className="space-y-3 text-[var(--docs-muted)] leading-relaxed">
          <p>
            Most blockchain analysis tools are black boxes. You get a score or a
            label, but no explanation of <em>why</em>.
          </p>
          <p>
            txray is different. Every heuristic is documented. Every detection
            method cites its source. You can see the reasoning, verify it, and
            learn from it.
          </p>
          <p className="text-[var(--docs-text)]">
            This isn&apos;t just an analysis tool - it&apos;s an educational
            toolkit for understanding Bitcoin privacy at every level.
          </p>
        </div>

        <div className="mt-5 pt-5 border-t border-[var(--docs-panel-border)] flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="text-[var(--docs-muted)]">
            <span className="text-[var(--docs-text)] font-medium">
              Open source
            </span>{" "}
            - MIT licensed
          </span>
          <span className="text-[var(--docs-muted)]">
            <span className="text-[var(--docs-text)] font-medium">
              Transparent
            </span>{" "}
            - see the math
          </span>
          <span className="text-[var(--docs-muted)]">
            <span className="text-[var(--docs-text)] font-medium">
              Educational
            </span>{" "}
            - learn, not just analyze
          </span>
        </div>
      </div>

      {/* Footer Links */}
      <div className="flex items-center justify-center gap-6 pt-4 text-sm text-[var(--docs-muted)]">
        <Link
          href="/docs/research"
          className="flex items-center gap-1.5 hover:text-[var(--docs-text)] transition-colors"
        >
          <FileText className="w-4 h-4" />
          Research & References
        </Link>
        <a
          href="https://github.com/keshav0479/txray"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:text-[var(--docs-text)] transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          View on GitHub
        </a>
      </div>
    </div>
  );
}
