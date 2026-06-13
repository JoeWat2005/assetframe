"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { OpenCall } from "@/lib/content";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function PickList({
  value, onChange, placeholder, options,
}: { value: string; onChange: (v: string) => void; placeholder: string; options: [string, string][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-auto sm:min-w-[150px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export default function OpenCallsBrowser({
  open, assetClass = {},
}: { open: OpenCall[]; assetClass?: Record<string, string> }) {
  const [q, setQ] = useState("");
  const [asset, setAsset] = useState("all");
  const [date, setDate] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const assetOf = (c: OpenCall) => assetClass[c.symbol] || "Other";
  const dateOf = (c: OpenCall) => (c.windowEnd || "").slice(0, 10);

  const assetOptions = useMemo<[string, string][]>(
    () => [["all", "All assets"], ...Array.from(new Set(open.map(assetOf))).filter(Boolean).sort().map((a) => [a, a] as [string, string])],
    [open] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const dateOptions = useMemo<[string, string][]>(
    () => [["all", "All dates"], ...Array.from(new Set(open.map(dateOf))).filter(Boolean).sort().reverse().map((d) => [d, d] as [string, string])],
    [open] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return open.filter((c) => {
      if (asset !== "all" && assetOf(c) !== asset) return false;
      if (date !== "all" && dateOf(c) !== date) return false;
      if (needle) {
        const hay = `${c.instrument} ${c.symbol} ${c.view} ${(c.predictions || []).map((p) => p.text).join(" ")}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [open, q, asset, date]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drop expanded rows that are no longer visible (so they don't reopen on return).
  useEffect(() => {
    const visible = new Set(filtered.map((c) => c.reportId));
    setExpanded((prev) => {
      for (const id of prev) if (!visible.has(id)) return new Set([...prev].filter((x) => visible.has(x)));
      return prev;
    });
  }, [filtered]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const active = q || asset !== "all" || date !== "all";
  const clearAll = () => { setQ(""); setAsset("all"); setDate("all"); };

  if (open.length === 0) {
    return <p className="text-sm text-muted-foreground">No open calls right now — the next edition opens the next set.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search calls or predictions…"
          className="sm:max-w-xs"
        />
        <PickList value={asset} onChange={setAsset} placeholder="All assets" options={assetOptions} />
        <PickList value={date} onChange={setDate} placeholder="All dates" options={dateOptions} />
        {active && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-muted-foreground">Clear</Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} open call{filtered.length === 1 ? "" : "s"}
        {active ? " match your filters" : ""} · click a row to see its predictions
      </p>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        {filtered.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No open calls match — try clearing the filters.</p>
        ) : (
          filtered.map((c) => {
            const isOpen = expanded.has(c.reportId);
            const panelId = `call-${c.reportId}`;
            return (
              <div key={c.reportId} className="border-b border-line last:border-0">
                <button
                  onClick={() => toggle(c.reportId)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-tile/60"
                >
                  <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-ink">{c.instrument}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {c.symbol} · {assetOf(c)} · {c.view}
                    </div>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <div className="text-xs text-muted-foreground">
                      Conf. {c.confidence} · {c.n} call{c.n === 1 ? "" : "s"}{c.nManual ? ` (+${c.nManual} manual)` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">scores after {c.windowEnd} UTC</div>
                  </div>
                  <Badge style={{ backgroundColor: "#9a6700" }} className="shrink-0 border-transparent text-white">
                    Pending
                  </Badge>
                </button>

                {isOpen && (
                  <div id={panelId} className="border-t border-line bg-tile/30 px-3 py-3 sm:pl-10">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Individual predictions
                    </div>
                    {(c.predictions || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No per-prediction detail stored for this call yet.</p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {c.predictions.map((p) => (
                          <li key={p.id} className="flex gap-2.5 rounded-lg border border-line bg-white p-2.5 text-sm">
                            <span className="mt-0.5 inline-flex h-5 shrink-0 items-center rounded-md bg-navy px-1.5 text-[11px] font-bold text-white">
                              {p.id || "•"}
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
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
                    <p className="mt-2 text-xs text-muted-foreground">
                      Graded Hit / Miss / No-trigger against the tape after {c.windowEnd} UTC.
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
