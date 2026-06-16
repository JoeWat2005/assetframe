"use client";
import { useState, useTransition } from "react";
import { subscribeNewsletter } from "@/lib/social-actions";

// Footer email-capture (navy background, so light-on-dark styling). Double opt-in is handled
// server-side; this just collects the address and shows the result.
export default function NewsletterForm() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => setResult(await subscribeNewsletter(fd)));
  };

  if (result?.ok) return <p className="text-sm text-[#aebfd6]">{result.message}</p>;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <label htmlFor="nl-email" className="text-sm font-semibold text-white">New-edition alerts</label>
      <div className="flex gap-2">
        <input
          id="nl-email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          aria-label="Email for new-edition alerts"
          className="h-9 w-full min-w-0 rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white placeholder:text-[#7e93b3] outline-none focus:border-white/50"
        />
        <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg bg-white px-3 text-sm font-semibold text-navy transition-colors hover:bg-white/90 disabled:opacity-60"
        >
          {pending ? "…" : "Subscribe"}
        </button>
      </div>
      {result && !result.ok && <p className="text-xs text-[#ffb4b4]">{result.message}</p>}
      <p className="text-xs text-[#7e93b3]">Pre-market edition alerts. Double opt-in; unsubscribe anytime.</p>
    </form>
  );
}
