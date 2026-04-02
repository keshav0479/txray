"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { BookOpen, BarChart3, Terminal } from "lucide-react";

type Audience = "beginner" | "analyst" | "builder";

const STORAGE_KEY = "txray-docs-audience";

const AUDIENCE_CONFIG: Record<Audience, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  beginner: { label: "Beginner", icon: BookOpen },
  analyst: { label: "Analyst", icon: BarChart3 },
  builder: { label: "Builder", icon: Terminal },
};

const AudienceContext = createContext<{
  audience: Audience;
  setAudience: (value: Audience) => void;
} | null>(null);

function useAudienceState() {
  const [audience, setAudience] = useState<Audience>("beginner");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Audience | null;
    if (saved === "beginner" || saved === "analyst" || saved === "builder") {
      setAudience(saved);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, audience);
  }, [audience]);

  return { audience, setAudience };
}

export function DocsAudienceProvider({ children }: { children: React.ReactNode }) {
  const state = useAudienceState();
  const value = useMemo(() => state, [state.audience, state.setAudience]);

  return <AudienceContext.Provider value={value}>{children}</AudienceContext.Provider>;
}

export function AudienceSelector() {
  const ctx = useContext(AudienceContext);

  if (!ctx) {
    return null;
  }

  return (
    <div className="flex rounded-lg border border-[var(--docs-panel-border)] bg-[var(--docs-panel)] p-0.5">
      {(Object.keys(AUDIENCE_CONFIG) as Audience[]).map((key) => {
        const { label, icon: Icon } = AUDIENCE_CONFIG[key];
        const active = ctx.audience === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => ctx.setAudience(key)}
            className={`docs-focus-ring inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-200 ${
              active
                ? "bg-[var(--docs-accent)]/15 text-[var(--docs-accent)] shadow-sm"
                : "text-[var(--docs-muted)] hover:text-[var(--docs-text)]"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function AudienceHelpInline() {
  const ctx = useContext(AudienceContext);

  if (!ctx) {
    return null;
  }

  const { label, icon: Icon } = AUDIENCE_CONFIG[ctx.audience];

  return (
    <div className="my-6 rounded-xl border border-[var(--docs-panel-border)] bg-[var(--docs-panel)] px-5 py-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-[var(--docs-accent)]" />
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--docs-muted)]">
          Viewing as {label}
        </p>
      </div>
      <p className="text-sm text-[var(--docs-muted)] leading-relaxed">
        Content adapts based on your selected audience level. Change it from the controls above.
      </p>
    </div>
  );
}

export function AudienceIntro() {
  const ctx = useContext(AudienceContext);

  if (!ctx) {
    return null;
  }

  return (
    <div className="my-6 rounded-xl border border-[var(--docs-panel-border)] bg-[var(--docs-panel)] px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--docs-muted)] mb-1">
        Current audience: <span className="text-[var(--docs-accent)]">{ctx.audience}</span>
      </p>
      <p className="text-sm text-[var(--docs-muted)]">
        Switch audience from the control bar to adapt this page.
      </p>
    </div>
  );
}

export function AudienceBlock({
  for: target,
  title,
  children,
}: {
  for: Audience;
  title: string;
  children: React.ReactNode;
}) {
  const ctx = useContext(AudienceContext);

  if (!ctx || ctx.audience !== target) {
    return null;
  }

  const { icon: Icon } = AUDIENCE_CONFIG[target];

  return (
    <div className="my-6 rounded-xl border border-[var(--docs-accent)]/30 bg-[var(--docs-accent)]/5 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-[var(--docs-accent)]" />
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--docs-accent)]">{title}</p>
      </div>
      <div className="text-[var(--docs-text)] text-[15px] leading-relaxed [&>*:last-child]:mb-0">{children}</div>
    </div>
  );
}
