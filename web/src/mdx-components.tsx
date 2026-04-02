import type { MDXComponents } from "mdx/types";
import type { ReactNode } from "react";
import { Link as LinkIcon, Lightbulb, AlertTriangle, Code2 } from "lucide-react";
import {
  AudienceBlock,
  AudienceHelpInline,
  AudienceSelector,
  DocsAudienceProvider,
} from "@/components/docs/DocsAudience";

type CalloutVariant = "tip" | "warning" | "example";

const CALLOUT_STYLES: Record<CalloutVariant, {
  border: string;
  bg: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
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
    <div className={`my-6 rounded-xl border ${styles.border} ${styles.bg} px-5 py-4`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${styles.title}`} />
        <p className={`text-xs font-semibold uppercase tracking-wider ${styles.title}`}>
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
    AudienceIntro: AudienceHelpInline,
    AudienceBlock,
    AudienceSelector,
    DocsAudienceProvider,
    h2: H2,
    h3: H3,
    ...components,
  };
}
