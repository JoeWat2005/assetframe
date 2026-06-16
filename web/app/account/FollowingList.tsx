"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { toggleFollow } from "@/lib/social-actions";
import type { Follow } from "@/lib/social";

export default function FollowingList({ initial }: { initial: Follow[] }) {
  const [items, setItems] = useState(initial);
  const [, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <p className="mt-1 text-sm text-muted-foreground">
        You&rsquo;re not following any instruments yet. Open a report and tap <b>Follow</b> to get an email when a new edition publishes.
      </p>
    );
  }

  const unfollow = (sym: string, instrument: string) => {
    setBusy(sym);
    start(async () => {
      const r = await toggleFollow(sym, instrument);
      if (r.ok && !r.following) setItems((xs) => xs.filter((x) => x.symbol !== sym));
      setBusy(null);
    });
  };

  return (
    <ul className="mt-3 divide-y divide-line">
      {items.map((f) => (
        <li key={f.symbol} className="flex items-center justify-between py-2">
          <Link href="/reports" className="text-sm font-semibold text-navy hover:underline">{f.instrument || f.symbol}</Link>
          <button
            type="button"
            onClick={() => unfollow(f.symbol, f.instrument)}
            disabled={busy === f.symbol}
            aria-label={`Unfollow ${f.instrument || f.symbol}`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-[#b91c1c] disabled:opacity-50"
          >
            <X className="size-3.5" aria-hidden="true" /> Unfollow
          </button>
        </li>
      ))}
    </ul>
  );
}
