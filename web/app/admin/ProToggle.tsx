"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPro } from "./actions";

// The Pro/Free badge in the members list, made clickable: toggles the member's access.
export default function ProToggle({ email, subscribed }: { email: string; subscribed: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const toggle = () =>
    start(async () => {
      try {
        const r = await setPro(email, !subscribed);
        if (r.ok) router.refresh();
      } catch {
        /* surfaced via the Manage access panel; row stays as-is */
      }
    });
  return (
    <button
      type="button"
      disabled={pending || !email.includes("@")}
      onClick={toggle}
      title={!email.includes("@") ? "No email on file" : subscribed ? "Click to revoke Pro" : "Click to grant Pro"}
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
        subscribed ? "bg-[#dafbe1] text-[#1a7f37] hover:bg-[#bff0cb]" : "bg-tile text-muted-foreground hover:bg-line"
      }`}
    >
      {pending ? "…" : subscribed ? "Pro" : "Free"}
    </button>
  );
}
