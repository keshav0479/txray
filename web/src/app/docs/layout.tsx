import { ReactNode } from "react";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { DocNav } from "@/components/docs/DocNav";
import { DocToc } from "@/components/docs/DocToc";
import { DocsPager } from "@/components/docs/DocsPager";
import { DocsScrollProgress } from "@/components/docs/DocsScrollProgress";
import { DocsCommandPalette } from "@/components/docs/DocsCommandPalette";
import { DocsControls } from "@/components/docs/DocsControls";
import { DocsAudienceProvider } from "@/components/docs/DocsAudience";
import { DocsZenPill } from "@/components/docs/DocsZenPill";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--docs-bg)] text-[var(--docs-text)] docs-font-academic">
      <DocsAudienceProvider>
        <DocsScrollProgress />
        <DocsCommandPalette />
        <DocsZenPill />

        {/* Fixed sidebar - stays in place while content scrolls */}
        <DocsSidebar />

        {/* Main content area - has left margin to account for fixed sidebar */}
        <main
          className="docs-main-content min-h-[calc(100vh-4rem)]"
          style={{ background: "var(--docs-bg-gradient)" }}
        >
          <div className="docs-content-shell mx-auto max-w-[1100px] px-6 lg:px-10 py-10">
            <div className="flex gap-10">
              {/* Main content */}
              <div className="min-w-0 flex-1 max-w-3xl">
                <DocsControls />
                <DocNav />
                <article
                  className="prose prose-invert max-w-none mt-6 text-[16px] leading-7 pb-16
                    prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-[var(--docs-text-heading)]
                    prose-h1:text-[2.5rem] prose-h1:mb-6 prose-h1:mt-0 prose-h1:leading-tight
                    prose-h2:text-[1.75rem] prose-h2:mt-12 prose-h2:mb-4
                    prose-h3:text-[1.25rem] prose-h3:mt-8 prose-h3:mb-3
                    prose-a:text-[var(--docs-link)] prose-a:no-underline prose-a:hover:underline prose-a:transition-colors
                    prose-code:text-[var(--docs-code-text)] prose-code:bg-[var(--docs-code-bg)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:hidden prose-code:after:hidden prose-code:text-[0.9em] prose-code:font-normal
                    prose-pre:bg-[var(--docs-code-bg)] prose-pre:border prose-pre:border-[var(--docs-panel-border)] prose-pre:rounded-xl prose-pre:px-5 prose-pre:py-4
                    prose-p:text-[var(--docs-muted)] prose-li:text-[var(--docs-muted)] prose-strong:text-[var(--docs-text)] prose-strong:font-semibold
                    prose-hr:border-[var(--docs-panel-border)] prose-ul:my-4 prose-ol:my-4 prose-li:my-1
                    prose-blockquote:border-[var(--docs-accent-muted)] prose-blockquote:text-[var(--docs-muted)] prose-blockquote:not-italic"
                >
                  {children}
                </article>
                <DocsPager />
              </div>

              {/* TOC - hidden on smaller screens, hidden in zen */}
              <aside className="docs-toc-wrap hidden xl:block shrink-0">
                <DocToc />
              </aside>
            </div>
          </div>
        </main>
      </DocsAudienceProvider>
    </div>
  );
}
