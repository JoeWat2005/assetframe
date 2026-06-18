"use client";
import { useState, useTransition } from "react";
import { Copy, Check, RefreshCw, Trash2, KeyRound } from "lucide-react";
import { regenerateMyApiKey, revokeMyApiKey } from "@/lib/api-key-actions";
import type { ApiKeyStatus } from "@/lib/api-key-actions";

type Props = { initial: ApiKeyStatus };

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "Never";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function ApiKeyManager({ initial }: Props) {
  const [status, setStatus] = useState<ApiKeyStatus>(initial);
  const [fullKey, setFullKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const copyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const handleGenerate = () => {
    if (status.hasKey) {
      if (!confirm("This will invalidate your current key. All API calls using it will stop working. Continue?")) return;
    }
    setError(null);
    startTransition(async () => {
      const res = await regenerateMyApiKey();
      if (res.ok) {
        setFullKey(res.key);
        // Derive the masked prefix: af_live_ + first 6 chars of random part
        const prefix = res.key.slice(0, "af_live_".length + 6);
        setStatus({ hasKey: true, prefix, createdAt: new Date(), lastUsedAt: null });
      } else {
        setError(res.error);
      }
    });
  };

  const handleRevoke = () => {
    if (!confirm("Revoke your API key? All API calls using it will stop working immediately.")) return;
    setError(null);
    startTransition(async () => {
      const res = await revokeMyApiKey();
      if (res.ok) {
        setFullKey(null);
        setStatus({ hasKey: false });
      } else {
        setError(res.error);
      }
    });
  };

  const dismissKey = () => setFullKey(null);

  const btn =
    "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50";

  return (
    <div>
      {/* --- Newly generated key (shown once) --- */}
      {fullKey && (
        <div className="mb-4 rounded-xl border border-[#b6d7a8] bg-[#f3faf3] p-4">
          <p className="mb-2 text-sm font-semibold text-[#1e6823]">
            Copy your API key now — it won&rsquo;t be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg border border-line bg-white px-3 py-2 font-mono text-[13px] text-navy">
              {fullKey}
            </code>
            <button
              type="button"
              onClick={() => copyKey(fullKey)}
              className={`${btn} border border-navy text-navy hover:bg-tile shrink-0`}
            >
              {copied ? <><Check className="size-4" aria-hidden="true" /> Copied</> : <><Copy className="size-4" aria-hidden="true" /> Copy</>}
            </button>
          </div>
          <button
            type="button"
            onClick={dismissKey}
            className="mt-3 text-xs text-muted-foreground underline hover:text-navy"
          >
            I&rsquo;ve saved it — dismiss
          </button>
        </div>
      )}

      {/* --- Key exists (masked) --- */}
      {status.hasKey && !fullKey && (
        <div className="mb-4 space-y-1">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <code className="font-mono text-sm text-navy">{status.prefix}••••••••</code>
          </div>
          <p className="text-xs text-muted-foreground">
            Created {formatDate(status.createdAt)}
            {" · "}Last used {formatDate(status.lastUsedAt)}
          </p>
        </div>
      )}

      {/* --- No key yet --- */}
      {!status.hasKey && !fullKey && (
        <p className="mb-4 text-sm text-muted-foreground">
          Authenticate REST API calls with:{" "}
          <code className="rounded bg-tile px-1 py-0.5 font-mono text-[13px]">Authorization: Bearer af_live_…</code>
        </p>
      )}

      {/* --- Action buttons --- */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending}
          className={`${btn} bg-navy text-white hover:opacity-90`}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          {isPending
            ? "Working…"
            : status.hasKey
              ? "Regenerate"
              : "Generate API key"}
        </button>

        {status.hasKey && (
          <button
            type="button"
            onClick={handleRevoke}
            disabled={isPending}
            className={`${btn} border border-[#b91c1c] text-[#b91c1c] hover:bg-[#fef2f2]`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Revoke
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-[#b91c1c]">{error}</p>}
    </div>
  );
}
