import type { MDXComponents } from "mdx/types";
import type { ReactNode } from "react";
import {
  Link as LinkIcon,
  Lightbulb,
  AlertTriangle,
  Code2,
  Construction,
} from "lucide-react";
import {
  AudienceBlock,
  AudienceHelpInline,
  AudienceSelector,
  DocsAudienceProvider,
} from "@/components/docs/DocsAudience";

type CalloutVariant = "tip" | "warning" | "example";

const CALLOUT_STYLES: Record<
  CalloutVariant,
  {
    border: string;
    bg: string;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  tip: {
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
    title: "text-blue-400",
    icon: Lightbulb,
  },
  warning: {
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    title: "text-amber-400",
    icon: AlertTriangle,
  },
  example: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    title: "text-emerald-400",
    icon: Code2,
  },
};

function Callout({
  title,
  variant,
  children,
}: {
  title: string;
  variant: CalloutVariant;
  children: ReactNode;
}) {
  const styles = CALLOUT_STYLES[variant];
  const Icon = styles.icon;

  return (
    <div
      className={`my-6 rounded-xl border ${styles.border} ${styles.bg} px-5 py-4`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${styles.title}`} />
        <p
          className={`text-xs font-semibold uppercase tracking-wider ${styles.title}`}
        >
          {title}
        </p>
      </div>
      <div className="text-[var(--docs-text)] text-[15px] leading-relaxed [&>*:last-child]:mb-0 [&>p]:text-[var(--docs-muted)]">
        {children}
      </div>
    </div>
  );
}

function Tip({ children }: { children: ReactNode }) {
  return (
    <Callout title="Tip" variant="tip">
      {children}
    </Callout>
  );
}

function Warning({ children }: { children: ReactNode }) {
  return (
    <Callout title="Warning" variant="warning">
      {children}
    </Callout>
  );
}

function Example({ children }: { children: ReactNode }) {
  return (
    <Callout title="Example" variant="example">
      {children}
    </Callout>
  );
}

function ComingSoon({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="my-8 relative overflow-hidden rounded-2xl border border-[var(--docs-panel-border)] bg-[var(--docs-panel)]">
      {/* subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(var(--docs-accent) 1px, transparent 1px), linear-gradient(90deg, var(--docs-accent) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative px-8 py-12 flex flex-col items-center text-center">
        {/* icon */}
        <div className="w-14 h-14 rounded-2xl bg-[var(--docs-accent)]/10 border border-[var(--docs-accent)]/20 flex items-center justify-center mb-5">
          <Construction className="w-7 h-7 text-[var(--docs-accent)] opacity-80" />
        </div>

        {/* badge */}
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[var(--docs-accent)] mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--docs-accent)] animate-pulse" />
          Coming Soon
        </span>

        {title && (
          <h2 className="text-xl font-bold text-[var(--docs-text-heading)] mb-2">
            {title}
          </h2>
        )}

        {description && (
          <p className="text-[var(--docs-muted)] text-[15px] leading-relaxed max-w-md mb-0">
            {description}
          </p>
        )}

        {children && (
          <div className="mt-4 text-[var(--docs-muted)] text-sm leading-relaxed max-w-md [&>p]:mb-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

function H2(props: React.HTMLAttributes<HTMLHeadingElement>) {
  const id =
    props.id ||
    String(props.children)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");

  return (
    <h2 id={id} className="group scroll-mt-24" {...props}>
      {props.children}
      <a
        href={`#${id}`}
        className="ml-2 opacity-0 group-hover:opacity-60 transition-opacity duration-200 text-[var(--docs-muted)] hover:text-[var(--docs-accent)]"
        aria-label={`Link to ${props.children}`}
      >
        <LinkIcon className="inline h-4 w-4" />
      </a>
    </h2>
  );
}

function H3(props: React.HTMLAttributes<HTMLHeadingElement>) {
  const id =
    props.id ||
    String(props.children)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");

  return (
    <h3 id={id} className="group scroll-mt-24" {...props}>
      {props.children}
      <a
        href={`#${id}`}
        className="ml-2 opacity-0 group-hover:opacity-60 transition-opacity duration-200 text-[var(--docs-muted)] hover:text-[var(--docs-accent)]"
        aria-label={`Link to ${props.children}`}
      >
        <LinkIcon className="inline h-3.5 w-3.5" />
      </a>
    </h3>
  );
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    Tip,
    Warning,
    Example,
    ComingSoon,
    AudienceIntro: AudienceHelpInline,
    AudienceBlock,
    AudienceSelector,
    DocsAudienceProvider,
    h2: H2,
    h3: H3,
    ...components,
  };
}
