"use client";
import { ExternalLink, FileText } from "lucide-react";
import type { Edition } from "@/lib/content";
import { Badge } from "@/components/ui";
import { Button } from "@/components/ui/button";
import Paginated from "@/components/Paginated";
import ApproveButton from "./ApproveButton";

// Pending-approval queue (editions the engine generated HIDDEN behind its approval gate). This can
// balloon while you're seeding the ledger with backdated runs, so it paginates (8/page) to stay
// mobile-friendly. Client component: it owns the page state and renders the per-row Approve button.
export default function PendingApprovalList({ pending }: { pending: Edition[] }) {
  return (
    <Paginated
      items={pending}
      noun="awaiting approval"
      pageSize={8}
      containerClassName="divide-y divide-line border-t border-line"
      emptyChildren={<p className="mx-6 mb-2 rounded-xl border border-dashed border-line bg-tile/40 px-4 py-8 text-center text-sm text-muted-foreground">All caught up — nothing is waiting for your approval.</p>}
      keyOf={(e) => `${e.date}/${e.slug}`}
      render={(e) => {
        const id = `${e.date}/${e.slug}`;
        return (
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <b className="truncate">{e.instrument}</b>
                <span className="text-muted-foreground">{e.ticker}</span>
                {e.status && <Badge label={e.status} kind="status" />}
                {e.risk && <Badge label={e.risk} kind="risk" />}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {e.reportDate} · prediction window to {e.windowEnd || "—"}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button asChild size="sm" variant="outline">
                <a href={`/reports/${id}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink data-icon="inline-start" />Preview
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={`/api/report/${id}/free.pdf`} target="_blank" rel="noopener noreferrer">
                  <FileText data-icon="inline-start" />PDF
                </a>
              </Button>
              <ApproveButton id={id} />
            </div>
          </div>
        );
      }}
    />
  );
}
