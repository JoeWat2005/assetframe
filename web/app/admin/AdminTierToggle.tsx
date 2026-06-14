"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMyAdminTier } from "./actions";
import { Button } from "@/components/ui/button";

// Admins get Pro for free; this lets them flip their own view to the Free tier (and back)
// without paying, to see exactly what non-subscribers see.
export default function AdminTierToggle({ current }: { current: "pro" | "free" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const set = (tier: "pro" | "free") =>
    start(async () => {
      const r = await setMyAdminTier(tier);
      if (r.ok) router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex overflow-hidden rounded-lg border border-line">
        <Button
          size="sm"
          variant={current !== "free" ? "default" : "ghost"}
          disabled={pending}
          className="rounded-none"
          onClick={() => set("pro")}
        >
          Pro
        </Button>
        <Button
          size="sm"
          variant={current === "free" ? "default" : "ghost"}
          disabled={pending}
          className="rounded-none border-l border-line"
          onClick={() => set("free")}
        >
          Free
        </Button>
      </div>
      <span className="text-sm text-muted-foreground">
        Currently viewing the <b className="text-ink">{current === "free" ? "Free" : "Pro"}</b> tier.
      </span>
    </div>
  );
}
