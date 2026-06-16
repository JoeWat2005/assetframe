"use client";
import { useMemo, useState, useTransition } from "react";
import type { FeedbackRow } from "@/lib/feedback";
import { setFeedbackStatus } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const STATUSES: [string, string][] = [
  ["new", "New"], ["triaged", "Triaged"], ["planned", "Planned"], ["done", "Done"], ["declined", "Declined"],
];
const CAT_LABEL: Record<string, string> = {
  feature: "Feature", bug: "Bug", data: "Data", general: "General", other: "Other",
};
const SORTS: [string, string][] = [["newest", "Newest first"], ["oldest", "Oldest first"]];
const PAGE = 20;
const tsMs = (ts: string) => {
  const t = Date.parse(ts.replace(" ", "T") + ":00Z"); // "YYYY-MM-DD HH:MI" is UTC
  return Number.isNaN(t) ? 0 : t;
};

export default function FeedbackInbox({ rows: initial }: { rows: FeedbackRow[] }) {
  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(0);
  const [, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);

  const cats = useMemo(() => Array.from(new Set(rows.map((r) => r.category))).sort(), [rows]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (cat !== "all" && r.category !== cat) return false;
        if (status !== "all" && r.status !== status) return false;
        if (q) {
          const hay = `${r.email} ${r.message} ${r.category}`.toLowerCase();
          if (!hay.includes(q.toLowerCase())) return false;
        }
        return true;
      }),
    [rows, q, cat, status]
  );

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => (sort === "oldest" ? tsMs(a.createdAt) - tsMs(b.createdAt) : tsMs(b.createdAt) - tsMs(a.createdAt)));
    return arr;
  }, [filtered, sort]);

  // No reset-page effect: safePage below clamps an out-of-range page when filters shrink the
  // list, which avoids a setState-in-effect and is enough here.
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * PAGE, safePage * PAGE + PAGE);

  const change = (id: string, next: string) => {
    setSavingId(id);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: next } : r)));
    startTransition(async () => { await setFeedbackStatus(id, next); setSavingId(null); });
  };

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Input
          aria-label="Search feedback"
          placeholder="Search message, email, category…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger aria-label="Category" className="w-full sm:w-auto sm:min-w-[150px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All categories</SelectItem>
              {cats.map((c) => <SelectItem key={c} value={c}>{CAT_LABEL[c] ?? c}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Status" className="w-full sm:w-auto sm:min-w-[140px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger aria-label="Sort by" className="w-full sm:w-auto sm:min-w-[150px]">
            <SelectValue placeholder="Newest first" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {SORTS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No feedback yet. Submissions from the public form will appear here.</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matching feedback.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full overflow-hidden rounded-xl border border-line bg-white text-sm">
              <thead className="bg-tile text-navy">
                <tr>
                  <th className="p-3 text-left">When (UTC)</th>
                  <th className="p-3 text-left">Category</th>
                  <th className="p-3 text-left">Message</th>
                  <th className="p-3 text-left">From</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.id} className="border-t border-line align-top">
                    <td className="whitespace-nowrap p-3 font-mono text-[12px] text-muted-foreground">{r.createdAt}</td>
                    <td className="whitespace-nowrap p-3 font-semibold text-navy">{CAT_LABEL[r.category] ?? r.category}</td>
                    <td className="p-3 text-ink"><span className="block max-w-md whitespace-pre-wrap">{r.message}</span></td>
                    <td className="p-3">
                      {r.email
                        ? <a href={`mailto:${r.email}`} className="text-navy underline underline-offset-2">{r.email}</a>
                        : <span className="text-muted-foreground">anonymous</span>}
                    </td>
                    <td className="p-3">
                      <Select value={r.status} onValueChange={(v) => change(r.id, v)} disabled={savingId === r.id}>
                        <SelectTrigger aria-label={`Status for feedback ${r.id}`} className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {STATUSES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              {safePage * PAGE + 1}–{safePage * PAGE + pageRows.length} of {filtered.length}
              {filtered.length !== rows.length ? ` (filtered from ${rows.length})` : ""}
            </span>
            {pageCount > 1 && (
              <span className="flex items-center gap-2">
                <Button aria-label="Previous page" variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</Button>
                <span>Page {safePage + 1} / {pageCount}</span>
                <Button aria-label="Next page" variant="outline" size="sm" disabled={safePage >= pageCount - 1} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}>Next</Button>
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
