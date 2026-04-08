export type DocsNavItem = {
  label: string;
  href: string;
  comingSoon?: boolean;
};

export type DocsNavSection = {
  title: string;
  items: DocsNavItem[];
};

export const DOCS_NAV_SECTIONS: DocsNavSection[] = [
  {
    title: "Getting Started",
    items: [{ label: "Introduction", href: "/docs/getting-started" }],
  },
  {
    title: "Concepts",
    items: [
      { label: "UTXO Model", href: "/docs/concepts/utxo-model" },
      {
        label: "Transaction Structure",
        href: "/docs/concepts/transaction-structure",
      },
      { label: "Privacy Basics", href: "/docs/concepts/privacy-basics" },
    ],
  },
  {
    title: "Heuristics",
    items: [
      {
        label: "Common Input Ownership",
        href: "/docs/heuristics/common-input-ownership",
      },
      { label: "Change Detection", href: "/docs/heuristics/change-detection" },
      {
        label: "Address Clustering",
        href: "/docs/heuristics/address-clustering",
      },
      {
        label: "Wallet Fingerprinting",
        href: "/docs/heuristics/fingerprinting",
      },
    ],
  },
  {
    title: "Tools",
    items: [
      { label: "Lens", href: "/docs/tools/lens" },
      { label: "Sherlock", href: "/docs/tools/sherlock" },
      { label: "Smith", href: "/docs/tools/smith" },
    ],
  },
  {
    title: "Methodology",
    items: [
      { label: "Lens Parsing", href: "/docs/methodology/lens-parsing", comingSoon: true },
      {
        label: "Sherlock Clustering",
        href: "/docs/methodology/sherlock-clustering",
        comingSoon: true,
      },
      { label: "Smith Algorithms", href: "/docs/methodology/smith-algorithms", comingSoon: true },
    ],
  },
  {
    title: "Resources",
    items: [
      { label: "Research Papers", href: "/docs/research", comingSoon: true },
      { label: "Tutorials", href: "/docs/tutorials", comingSoon: true },
    ],
  },
];

export const DOCS_TOC: Record<string, string[]> = {
  "/docs/getting-started": [
    "What is txray?",
    "Quick Start",
    "Installation",
    "Next Steps",
  ],
  "/docs/concepts/utxo-model": [
    "How It Works",
    "Transaction Anatomy",
    "Why It Matters for Privacy",
  ],
  "/docs/heuristics/common-input-ownership": [
    "What This Heuristic Says",
    "Simple Analogy",
    "Why Analysts Use It",
    "When It Fails",
    "How txray Uses It",
    "Confidence Guidance",
  ],
  "/docs/heuristics/change-detection": [
    "Why Change Exists",
    "Simple Analogy",
    "Signals We Check",
    "When It Fails",
    "How txray Scores Change",
  ],
  "/docs/heuristics/address-clustering": [
    "What Clustering Means",
    "Simple Analogy",
    "How Graph Clustering Works",
    "Limits and False Links",
    "How to Read Results",
  ],
  "/docs/heuristics/fingerprinting": [
    "What Wallet Fingerprinting Is",
    "Simple Analogy",
    "Signals We Use",
    "Known Limitations",
    "How to Interpret Matches",
  ],
};
