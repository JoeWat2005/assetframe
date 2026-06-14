"use client";
import { useMemo, useState } from "react";
import type { Edition } from "@/lib/content";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import EditionToggle from "./EditionToggle";

const VIS: [string, string][] = [["all", "All"], ["live", "Live"], ["hidden", "Hidden"]];

// Filterable editions list: search by instrument/ticker/class/date and filter by
// visibility, so an admin can find a specific edition and unpublish/restore it fast.
export default function EditionsBrowser({ editions }: { editions: Edition[] }) {
  const [q, setQ] = useState("");
  const [vis, setVis] = useState("all");

  const filtered = useMemo(
    () =>
      editions.filter((e) => {
        if (vis === "live" && e.hidden) return false;
        if (vis === "hidden" && !e.hidden) return false;
        if (q) {
          const hay = `${e.instrument} ${e.ticker} ${e.assetClass} ${e.reportDate}`.toLowerCase();
          if (!hay.includes(q.toLowerCase())) return false;
        }
        return true;
      }),
    [editions, q, vis]
  );

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Search instrument, ticker, class…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={vis} onValueChange={setVis}>
          <SelectTrigger className="w-full sm:w-auto sm:min-w-[130px]">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {VIS.map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {editions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-tile/40 px-4 py-8 text-center text-sm text-muted-foreground">
          Nothing to show — no editions published yet.
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-tile/40 px-4 py-8 text-center text-sm text-muted-foreground">
          Nothing to show — no editions match your search.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          {filtered.map((e) => (
            <div
              key={`${e.date}/${e.slug}`}
              className="flex items-center justify-between gap-3 border-b border-line p-3 text-sm last:border-0"
            >
              <span className="min-w-0 truncate">
                <b>{e.instrument}</b> <span className="text-muted-foreground">{e.ticker}</span>
                <span className="ml-2 whitespace-nowrap text-muted-foreground">
                  {e.reportDate} · {e.hasPro ? "Pro ✓" : "free only"}
                </span>
              </span>
              <EditionToggle id={`${e.date}/${e.slug}`} hidden={e.hidden} />
            </div>
          ))}
        </div>
      )}

      {editions.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {filtered.length} of {editions.length} editions
        </p>
      )}
    </div>
  );
}
