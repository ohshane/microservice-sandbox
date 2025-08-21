// @ts-nocheck
"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";

type CodeProps = {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  node?: unknown;
  /** compatibility with react-markdown props signature */
  [key: string]: unknown;
};

function getLanguage(className?: string) {
  if (!className) return "";
  const m = className.match(/language-([\w+-]+)/i);
  return m?.[1] ?? "";
}

function CodeHeader({
  lang,
  onCopy,
  copied,
}: {
  lang: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-black/10 bg-black/5 px-2 py-1 text-[11px] font-medium">
      <span className="">
        {lang || "text"}
      </span>
      <button
        type="button"
        onClick={onCopy}
        className="cursor-pointer rounded border border-black/20 bg-black/5 px-1.5 py-0.1 font-mono text-[11px] text-black/70 transition hover:bg-black/10 active:scale-[0.97]"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-[0.875em]">
      {children}
    </code>
  );
}

function BlockShell({
  lang,
  copied,
  onCopy,
  children,
}: {
  lang: string;
  copied: boolean;
  onCopy: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="group my-4 w-full overflow-hidden rounded-xl border border-black/10 bg-white">
      <CodeHeader lang={lang} onCopy={onCopy} copied={copied} />
      {children}
    </div>
  );
}

export default function Code(props: CodeProps) {
  const { inline = false, className, children } = props;
  const raw = useMemo(() => String(children ?? ""), [children]);
  const lang = useMemo(() => getLanguage(className as string | undefined), [className]);

  // Heuristic: treat as inline when no language and no newline.
  const isMultiline = /\n/.test(raw);
  const isBlock = Boolean(lang) || isMultiline;

  const [copied, setCopied] = useState<boolean>(false);
  const handleCopy = useCallback(() => {
    if (!navigator?.clipboard) return;
    navigator.clipboard
      .writeText(raw)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => {});
  }, [raw]);

  // Memoize to avoid re-highlight churn
  const codeValue = useMemo(() => raw.replace(/\n$/, ""), [raw]);

  if (!isBlock) {
    return <InlineCode>{children}</InlineCode>;
  }

  return (
    <BlockShell lang={lang} copied={copied} onCopy={handleCopy}>
      <SyntaxHighlighter
        language={lang || undefined}
        style={oneLight as any}
        wrapLongLines
        showLineNumbers
        lineNumberStyle={{ opacity: 0.55, minWidth: "2.5em", paddingRight: "0.75em" }}
        PreTag="div"
        codeTagProps={{ className: "font-mono" }}
        className="text-[13px] sm:text-sm"
        customStyle={{
          background: "#f6f8fa",
          margin: 0,
          padding: "0.75rem",
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          lineHeight: 1.65,
        }}
      >
        {codeValue}
      </SyntaxHighlighter>
    </BlockShell>
  );
}