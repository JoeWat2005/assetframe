"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

// Dark code block with a copy button — used across the developer docs for install commands
// and example requests.
export default function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — no-op */
    }
  };
  return (
    <div className="mt-3">
      {label && <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>}
      <div className="relative">
        <pre className="overflow-x-auto rounded-xl border border-line bg-navy p-4 pr-20 text-[13px] leading-relaxed text-[#e6edf6]">
          <code>{code}</code>
        </pre>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy to clipboard"
          className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-white/20"
        >
          {copied ? <><Check className="size-3.5" aria-hidden="true" /> Copied</> : <><Copy className="size-3.5" aria-hidden="true" /> Copy</>}
        </button>
      </div>
    </div>
  );
}
