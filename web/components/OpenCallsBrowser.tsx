"use client";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { OpenCall } from "@/lib/content";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function OpenCallsBrowser({ open }: { open: OpenCall[] }) {
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return open;
    return open.filter((c) => {
      const hay = `${c.instrument} ${c.symbol} ${c.view} ${(c.predictions || []).map((p) => p.text).join(" ")}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [open, q]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (open.length === 0) {
    return <p className="text-sm text-muted">No open calls right now — the next edition opens the next set.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search open calls or predictions…"
        className="sm:max-w-sm"
      />
      <p className="text-sm text-muted">
        {filtered.length} open call{filtered.length === 1 ? "" : "s"}
        {q ? " match your search" : ""} · click a row to see its predictions
      </p>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        {filtered.length === 0 ? (
          <p className="p-4 text-sm text-muted">No open calls match your search.</p>
        ) : (
          filtered.map((c) => {
            const isOpen = expanded.has(c.reportId);
            return (
              <div key={c.reportId} className="border-b border-line last:border-0">
                <button
                  onClick={() => toggle(c.reportId)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-tile/60"
                >
                  <ChevronDown className={cn("size-4 shrink-0 text-muted transition-transform", isOpen && "rotate-180")} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-ink">{c.instrument}</div>
                    <div className="truncate text-xs text-muted">{c.symbol} · {c.view}</div>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <div className="text-xs text-muted">
                      Conf. {c.confidence} · {c.n} call{c.n === 1 ? "" : "s"}{c.nManual ? ` (+${c.nManual} manual)` : ""}
                    </div>
                    <div className="text-xs text-muted">scores after {c.windowEnd} UTC</div>
                  </div>
                  <Badge style={{ backgroundColor: "#9a6700" }} className="shrink-0 border-transparent text-white">
                    Pending
                  </Badge>
                </button>

                {isOpen && (
                  <div className="border-t border-line bg-tile/30 px-3 py-3 sm:pl-10">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      Individual predictions
                    </div>
                    {(c.predictions || []).length === 0 ? (
                      <p className="text-sm text-muted">No per-prediction detail stored for this call yet.</p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {c.predictions.map((p) => (
                          <li key={p.id} className="flex gap-2.5 rounded-lg border border-line bg-white p-2.5 text-sm">
                            <span className="mt-0.5 inline-flex h-5 shrink-0 items-center rounded-md bg-navy px-1.5 text-[11px] font-bold text-white">
                              {p.id || "•"}
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                                  {p.type.replace(/_/g, " ")}
                                </span>
                                {p.manual && <Badge variant="secondary" className="text-[10px]">manual</Badge>}
                              </div>
                              <p className="mt-0.5">{p.text}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-2 text-xs text-muted">
                      Each prediction is graded Hit / Miss / No-trigger against the tape after {c.windowEnd} UTC.
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
