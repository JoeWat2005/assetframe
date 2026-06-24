"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setEditionHidden } from "./actions";

// Approve (publish) an edition that was generated hidden behind the engine's approval gate.
// Reuses setEditionHidden(id, false) — the same action the EditionToggle uses to restore —
// then refreshes so the approved edition drops out of the pending list.
export default function ApproveButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const approve = () =>
    start(async () => {
      const r = await setEditionHidden(id, false);
      if (r.ok) router.refresh();
    });
  return (
    <Button
      type="button"
      size="sm"
      disabled={pending}
      onClick={approve}
      title="Approve — publish this edition to the public site"
    >
      <Check data-icon="inline-start" />
      {pending ? "Approving…" : "Approve"}
    </Button>
  );
}
