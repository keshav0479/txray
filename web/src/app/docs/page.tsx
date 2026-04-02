import Link from "next/link";
import { 
  Rocket, 
  Boxes, 
  Search, 
  Microscope, 
  Wrench, 
  BookOpen,
  ArrowRight,
  Sparkles
} from "lucide-react";

const sections = [
  {
    href: "/docs/getting-started",
    title: "Getting Started",
    description: "Quick start guide, installation, and basic concepts.",
    icon: Rocket,
  },
  {
    href: "/docs/concepts/utxo-model",
    title: "Bitcoin Concepts",
    description: "UTXO model, transaction structure, and privacy fundamentals.",
    icon: Boxes,
  },
  {
    href: "/docs/heuristics/common-input-ownership",
    title: "Heuristics",
    description: "The analysis methodologies behind Sherlock detection.",
    icon: Search,
  },
  {
    href: "/docs/methodology/lens-parsing",
    title: "Methodology",
    description: "How Lens, Sherlock, and Smith actually work under the hood.",
    icon: Microscope,
  },
  {
    href: "/docs/tools/lens",
    title: "Tool Reference",
    description: "Complete reference for Lens, Sherlock, and Smith tools.",
    icon: Wrench,
  },
  {
    href: "/docs/tutorials",
    title: "Tutorials",
    description: "Step-by-step guides for common analysis tasks.",
    icon: BookOpen,
  },
];

export default function DocsIndex() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="pt-2 pb-4">
        <h1 className="text-4xl font-bold text-[var(--docs-text-heading)] mb-4 tracking-tight">
          txray Documentation
        </h1>
        <p className="text-lg text-[var(--docs-muted)] max-w-2xl leading-relaxed">
          Professional Bitcoin transaction analysis toolkit. Learn the methodology, 
          explore the heuristics, and master the tools.
        </p>
      </div>

      {/* Section Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="docs-card group relative p-5 rounded-xl bg-[var(--docs-panel)] border border-[var(--docs-panel-border)] hover:border-[var(--docs-accent-muted)]"
            >
              <div className="mb-3 text-[var(--docs-accent)] transition-colors duration-200">
                <Icon className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h2 className="text-base font-semibold text-[var(--docs-text-heading)] mb-1.5 flex items-center gap-2">
                {section.title}
                <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0 transition-all duration-200" />
              </h2>
              <p className="text-[var(--docs-muted)] text-sm leading-relaxed">
                {section.description}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Why txray */}
      <div className="p-6 rounded-xl bg-[var(--docs-panel)] border border-[var(--docs-panel-border)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-30" style={{ background: "var(--docs-card-glow)" }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-[var(--docs-accent)]" />
            <h2 className="text-lg font-semibold text-[var(--docs-text-heading)]">Why txray?</h2>
          </div>
          <p className="text-[var(--docs-muted)] leading-relaxed max-w-2xl">
            Unlike black-box analytics, txray provides transparent, documented methodologies 
            with academic references. Every heuristic links to its source. Every analysis 
            can be verified.
          </p>
        </div>
      </div>
    </div>
  );
}
