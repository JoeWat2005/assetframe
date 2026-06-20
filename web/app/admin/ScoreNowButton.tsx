"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendEngineCommand } from "./actions";
import { Button } from "@/components/ui/button";

type Result = { ok: boolean; message: string };

// "Score now" surfaced in the daily-loop section (Generate → Score), since grading closed windows
// is part of the launch-week workflow — not box maintenance. Generates nothing; it enqueues a
// run_scoring command the box claims on its next ~30s poll. Same useTransition + router.refresh
// pattern as GenerateForm / BoxControls.
export default function ScoreNowButton() {
  const router = useRouter();
  const [msg, setMsg] = useState<Result | null>(null);
  const [pending, start] = useTransition();

  const score = () =>
    start(async () => {
      try {
        const r = await sendEngineCommand("run_scoring");
        setMsg(r);
        if (r.ok) router.refresh();
      } catch {
        setMsg({ ok: false, message: "Action failed — not authorized?" });
      }
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={score}
        title="Grade any closed prediction windows into the ledger now (no new reports generated)."
      >
        {pending ? "Scoring…" : "Score now"}
      </Button>
      {msg && <span className={`text-sm ${msg.ok ? "text-[#1a7f37]" : "text-[#cf222e]"}`}>{msg.message}</span>}
    </div>
  );
}
