"use client";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CancelResult } from "@/lib/lemonsqueezy";

const MESSAGES: Record<string, string> = {
  "no-api-key": "Resuming in-app isn't enabled yet — use the billing portal.",
  "no-subscription": "We couldn't find your subscription.",
  "http-error": "The billing provider rejected the request. Please try the billing portal.",
  network: "Network error reaching the billing provider. Please try again.",
};

export default function ResumeSubscription({ onResume }: { onResume: () => Promise<CancelResult> }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = () => {
    setMsg(null);
    startTransition(async () => {
      const r = await onResume();
      setMsg(
        r.ok
          ? { ok: true, text: "Your subscription is back on — it'll renew as normal and you keep Pro access." }
          : { ok: false, text: MESSAGES[r.reason] ?? "Something went wrong." }
      );
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={run} disabled={pending} className="w-fit">
        {pending && <Loader2 data-icon="inline-start" className="animate-spin" />}
        Resume subscription
      </Button>
      {msg && <p className={msg.ok ? "text-sm text-[#1a7f37]" : "text-sm text-destructive"}>{msg.text}</p>}
    </div>
  );
}
