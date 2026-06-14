"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setEditionHidden } from "./actions";

// Unpublish (hide) or restore an edition. Hidden editions vanish from the public site,
// sitemap and reader, but stay in the DB and R2 so they can be restored.
export default function EditionToggle({ id, hidden }: { id: string; hidden: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const toggle = () =>
    start(async () => {
      const r = await setEditionHidden(id, !hidden);
      if (r.ok) router.refresh();
    });
  return (
    <button
      type="button"
      disabled={pending}
      onClick={toggle}
      title={hidden ? "Hidden from the site — click to restore" : "Live — click to unpublish"}
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition disabled:opacity-50 ${
        hidden ? "bg-[#ffebe9] text-[#cf222e] hover:bg-[#ffd7d5]" : "bg-[#dafbe1] text-[#1a7f37] hover:bg-[#bff0cb]"
      }`}
    >
      {pending ? "…" : hidden ? "Hidden" : "Live"}
    </button>
  );
}
