"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  X,
  ChevronRight,
  FileCode,
  Copy,
  Check,
  Download,
  Search,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

interface HexTerminalProps {
  rawJsonData: object;
}

/* --- Line-based JSON renderer for performance --- */

interface Section {
  key: string;
  headerLine: string; // e.g.  "vin": [
  contentLines: string[]; // lines inside the array/object
  closingLine: string; // e.g. ],
  itemCount: number;
}

function parseTopLevelSections(json: string): {
  plainLines: string[];
  sections: Section[];
} {
  const lines = json.split("\n");
  const plainLines: string[] = [];
  const sections: Section[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Detect top-level array/object starts like:  "vin": [ or "vout": [
    const match = line.match(/^\s{2}"(\w+)":\s*(\[|\{)\s*$/);
    if (match) {
      const key = match[1];
      const opener = match[2];
      const closer = opener === "[" ? "]" : "}";
      const headerLine = line;
      const contentLines: string[] = [];
      let depth = 1;
      i++;
      while (i < lines.length && depth > 0) {
        const l = lines[i];
        // Count depth changes
        for (const ch of l) {
          if (ch === opener.charAt(0) || ch === "[" || ch === "{") depth++;
          if (ch === closer.charAt(0) || ch === "]" || ch === "}") depth--;
        }
        if (depth > 0) {
          contentLines.push(l);
          i++;
        } else {
          // This is the closing line
          break;
        }
      }
      const closingLine = i < lines.length ? lines[i] : closer;

      // Only make it collapsible if it has significant content
      if (contentLines.length > 5) {
        // Count items (rough: count lines that start with 4 spaces + {)
        const itemCount = contentLines.filter(
          (l) => /^\s{4}\{/.test(l) || /^\s{4}\d/.test(l) || /^\s{4}"/.test(l),
        ).length;
        sections.push({
          key,
          headerLine,
          contentLines,
          closingLine,
          itemCount: itemCount || contentLines.length,
        });
        plainLines.push(`__SECTION__${key}`);
        i++;
        continue;
      }
      // Small section, treat as plain lines
      plainLines.push(headerLine);
      contentLines.forEach((l) => plainLines.push(l));
      plainLines.push(closingLine);
      i++;
      continue;
    }
    plainLines.push(line);
    i++;
  }
  return { plainLines, sections };
}

function highlightLine(line: string): string {
  return line
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"([^"]+)":/g, '<span class="text-[#7dd3fc]">"$1"</span>:')
    .replace(/: "([^"]*?)"/g, ': <span class="text-[#86efac]">"$1"</span>')
    .replace(/: (\d+\.?\d*)/g, ': <span class="text-[#fdba74]">$1</span>')
    .replace(
      /: (true|false|null)/g,
      ': <span class="text-[#c084fc]">$1</span>',
    );
}

/* --- Collapsible Section Component --- */

function CollapsibleSection({
  section,
  searchQuery,
}: {
  section: Section;
  searchQuery: string;
}) {
  const [collapsed, setCollapsed] = useState(() => {
    if (searchQuery) {
      const content = section.contentLines.join("\n");
      if (content.toLowerCase().includes(searchQuery.toLowerCase()))
        return false;
    }
    return section.contentLines.length > 30;
  });

  const headerHtml = highlightLine(section.headerLine);

  if (collapsed) {
    return (
      <div className="group">
        <span
          className="cursor-pointer hover:bg-white/5 rounded inline-block transition-colors"
          onClick={() => setCollapsed(false)}
        >
          <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors select-none">
            ▶{" "}
          </span>
          <span dangerouslySetInnerHTML={{ __html: headerHtml }} />
          <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors text-xs">
            {" "}
            {section.itemCount} items...{" "}
          </span>
          <span className="text-[#a8a8a8]">{section.closingLine.trim()}</span>
        </span>
      </div>
    );
  }

  // Build content HTML all at once (fast string concat)
  const contentHtml = section.contentLines
    .map((line) => {
      const hl = highlightLine(line);
      if (searchQuery) {
        const raw = line.toLowerCase();
        if (raw.includes(searchQuery.toLowerCase())) {
          return `<div class="bg-amber-500/15 -mx-2 px-2 rounded" data-search-match>${hl}</div>`;
        }
      }
      return hl;
    })
    .join("\n");

  return (
    <div>
      <span
        className="cursor-pointer hover:bg-white/5 rounded inline-block transition-colors"
        onClick={() => setCollapsed(true)}
      >
        <span className="text-zinc-500 hover:text-zinc-300 transition-colors select-none">
          ▼{" "}
        </span>
        <span dangerouslySetInnerHTML={{ __html: headerHtml }} />
      </span>
      {"\n"}
      <span dangerouslySetInnerHTML={{ __html: contentHtml }} />
      {"\n"}
      <span
        dangerouslySetInnerHTML={{ __html: highlightLine(section.closingLine) }}
      />
    </div>
  );
}

/* --- Main Component --- */

export function HexTerminal({ rawJsonData }: HexTerminalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);
  const [activeMatchIdx, setActiveMatchIdx] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const rawJson = useMemo(
    () => JSON.stringify(rawJsonData, null, 2),
    [rawJsonData],
  );
  const lineCount = useMemo(() => rawJson.split("\n").length, [rawJson]);

  // Parse top-level sections for collapsibility
  const { plainLines, sections } = useMemo(
    () => parseTopLevelSections(rawJson),
    [rawJson],
  );
  const sectionMap = useMemo(() => {
    const map: Record<string, Section> = {};
    for (const s of sections) map[s.key] = s;
    return map;
  }, [sections]);

  // Count matches
  const matchCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return (rawJson.match(new RegExp(escaped, "gi")) || []).length;
  }, [rawJson, searchQuery]);

  // Navigate matches
  const scrollToMatch = useCallback(
    (direction: "next" | "prev") => {
      if (!bodyRef.current || matchCount === 0) return;
      const marks = bodyRef.current.querySelectorAll("[data-search-match]");
      if (marks.length === 0) return;

      marks.forEach((m) => m.classList.remove("ring-1", "ring-amber-400"));

      let newIdx = activeMatchIdx;
      if (direction === "next") newIdx = (activeMatchIdx + 1) % marks.length;
      else newIdx = (activeMatchIdx - 1 + marks.length) % marks.length;
      setActiveMatchIdx(newIdx);

      const target = marks[newIdx];
      target.classList.add("ring-1", "ring-amber-400");
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [activeMatchIdx, matchCount],
  );

  // Reset match index when search query changes
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setActiveMatchIdx(0), [searchQuery]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(rawJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [rawJson]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([rawJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "txray-lens-output.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [rawJson]);

  const toggleSearch = useCallback(() => {
    setSearchVisible((prev) => {
      if (!prev) setTimeout(() => searchRef.current?.focus(), 100);
      return !prev;
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setSearchVisible(true);
        setTimeout(() => searchRef.current?.focus(), 100);
      }
      if (e.key === "Escape") {
        if (searchVisible) {
          setSearchVisible(false);
          setSearchQuery("");
        } else setIsOpen(false);
      }
      if (e.key === "Enter" && searchVisible && matchCount > 0) {
        e.preventDefault();
        scrollToMatch(e.shiftKey ? "prev" : "next");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, searchVisible, matchCount, scrollToMatch]);

  // Build plain lines HTML
  const plainHtml = useMemo(() => {
    return plainLines.map((line) => {
      if (line.startsWith("__SECTION__")) return line; // placeholder
      const hl = highlightLine(line);
      if (searchQuery) {
        const raw = line.toLowerCase();
        if (raw.includes(searchQuery.toLowerCase())) {
          return `<div class="bg-amber-500/15 -mx-2 px-2 rounded" data-search-match>${hl}</div>`;
        }
      }
      return hl;
    });
  }, [plainLines, searchQuery]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-full bg-surface-card border border-surface-border shadow-2xl hover:border-lens-500/50 hover:bg-surface-hover transition-all text-sm font-medium group"
      >
        <Terminal className="w-4 h-4 text-lens-500" />
        <span className="text-text-primary">View Raw Data</span>
        <ChevronRight className="w-4 h-4 text-text-muted transition-transform group-hover:translate-x-1" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-12 bg-black/60 backdrop-blur-sm"
          >
            <div
              className="absolute inset-0"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden bg-[#0d0d0d] rounded-2xl border border-white/10 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#141414]">
                <div className="flex items-center gap-2 text-xs font-mono text-text-muted">
                  <FileCode className="w-3.5 h-3.5 text-lens-500" />
                  <span>txray lens output</span>
                  <span className="text-text-muted/50">&#x2022;</span>
                  <span className="text-text-muted/50">
                    {(rawJson.length / 1024).toFixed(1)} KB
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleSearch}
                    className={`p-1.5 rounded-md transition-colors ${searchVisible ? "bg-lens-500/20 text-lens-400" : "hover:bg-white/10 text-text-muted hover:text-white"}`}
                    title="Search (Ctrl+F)"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-md hover:bg-white/10 text-text-muted hover:text-white transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="p-1.5 rounded-md hover:bg-white/10 text-text-muted hover:text-white transition-colors"
                    title="Download JSON"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-md hover:bg-white/10 text-text-muted hover:text-white transition-colors ml-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <AnimatePresence>
                {searchVisible && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-b border-white/10 bg-[#141414]"
                  >
                    <div className="px-4 py-2 flex items-center gap-2">
                      <Search className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      <input
                        ref={searchRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search in raw data..."
                        className="flex-1 bg-transparent text-sm font-mono text-white placeholder:text-text-muted/50 outline-none"
                      />
                      {searchQuery && (
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs font-mono text-text-muted/70 mr-1">
                            {matchCount > 0
                              ? `${Math.min(activeMatchIdx + 1, matchCount)}/${matchCount}`
                              : "No matches"}
                          </span>
                          <button
                            onClick={() => scrollToMatch("prev")}
                            disabled={matchCount === 0}
                            className="p-1 rounded hover:bg-white/10 text-text-muted hover:text-white disabled:opacity-30 transition-colors"
                            title="Previous (Shift+Enter)"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => scrollToMatch("next")}
                            disabled={matchCount === 0}
                            className="p-1 rounded hover:bg-white/10 text-text-muted hover:text-white disabled:opacity-30 transition-colors"
                            title="Next (Enter)"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSearchQuery("")}
                            className="p-1 rounded hover:bg-white/10 text-text-muted hover:text-white transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Body */}
              <div
                ref={bodyRef}
                className="flex-1 overflow-auto p-4 sm:p-6 bg-surface-bg"
              >
                <pre className="font-mono text-xs sm:text-sm leading-relaxed text-[#a8a8a8] whitespace-pre-wrap">
                  {plainHtml.map((line, i) => {
                    if (line.startsWith("__SECTION__")) {
                      const key = line.replace("__SECTION__", "");
                      const section = sectionMap[key];
                      if (section)
                        return (
                          <CollapsibleSection
                            key={key}
                            section={section}
                            searchQuery={searchQuery}
                          />
                        );
                      return null;
                    }
                    return (
                      <span
                        key={i}
                        dangerouslySetInnerHTML={{ __html: line + "\n" }}
                      />
                    );
                  })}
                </pre>
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-white/10 bg-[#141414] flex items-center justify-between text-xs font-mono text-text-muted/50">
                <span>
                  JSON &#x2022; {lineCount} lines &#x2022; Click ▶ to expand
                  sections
                </span>
                <span>txray lens v1.0</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
