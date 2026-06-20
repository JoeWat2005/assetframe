"use client";
import { Fragment, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

// Reusable client-side pager for admin lists — keeps long lists (pending approvals, engine
// run/command logs) mobile-friendly with a compact Prev/Next + "x–y of N" footer. Rows are
// emitted via keyed Fragments so they stay DIRECT children of `containerClassName` (the
// divide-y / border-t row styling the admin lists use keeps working). The controls hide
// entirely when everything fits on one page, so short lists look exactly as before.
export default function Paginated<T>({
  items,
  render,
  keyOf,
  pageSize = 8,
  noun = "items",
  containerClassName,
  emptyChildren,
}: {
  items: T[];
  render: (item: T, index: number) => ReactNode;
  keyOf: (item: T, index: number) => string;
  pageSize?: number;
  noun?: string;
  containerClassName?: string;
  emptyChildren?: ReactNode;
}) {
  const [page, setPage] = useState(0);
  if (items.length === 0) return <>{emptyChildren ?? null}</>;

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pageCount - 1); // clamp if the list shrank under us
  const start = safePage * pageSize;
  const rows = items.slice(start, start + pageSize);

  return (
    <>
      <div className={containerClassName}>
        {rows.map((it, i) => (
          <Fragment key={keyOf(it, start + i)}>{render(it, start + i)}</Fragment>
        ))}
      </div>
      {items.length > pageSize && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-6 pt-1 text-xs text-muted-foreground">
          <span>
            {start + 1}–{start + rows.length} of {items.length} {noun}
          </span>
          <span className="flex items-center gap-2">
            <Button aria-label="Previous page" variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              Prev
            </Button>
            <span>
              Page {safePage + 1} / {pageCount}
            </span>
            <Button aria-label="Next page" variant="outline" size="sm" disabled={safePage >= pageCount - 1} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}>
              Next
            </Button>
          </span>
        </div>
      )}
    </>
  );
}
