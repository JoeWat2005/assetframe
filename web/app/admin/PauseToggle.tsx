"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAutomationPaused } from "./actions";
import { Button } from "@/components/ui/button";

// Pause/Resume the engine's daily automation. Mirrors AdminTierToggle: optimistic-free,
// just useTransition + router.refresh() so the pill re-renders from the fresh server state.
export default function PauseToggle({ paused }: { paused: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const toggle = () =>
    start(async () => {
      const r = await setAutomationPaused(!paused);
      if (r.ok) router.refresh();
    });
  return (
    <Button
      size="sm"
      variant={paused ? "default" : "outline"}
      disabled={pending}
      onClick={toggle}
      title={paused ? "Automation paused — click to resume daily runs" : "Automation active — click to pause daily runs"}
    >
      {pending ? "…" : paused ? "Resume automation" : "Pause automation"}
    </Button>
  );
}
