"use client";
import { useState, useTransition } from "react";
import { subscribeNewsletter } from "@/lib/social-actions";

// Newsletter sign-up form styled for light (white/tile) backgrounds.
export default function NewsletterSignupLight() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => setResult(await subscribeNewsletter(fd)));
  };

  if (result?.ok) {
    return <p className="text-sm text-[#1a7f37]">{result.message}</p>;
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          aria-label="Email for newsletter"
          className="h-9 w-full min-w-0 rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-muted-foreground outline-none focus:border-navy"
        />
        <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg bg-navy px-3 text-sm font-semibold text-white transition-colors hover:bg-navy-700 disabled:opacity-60"
        >
          {pending ? "…" : "Subscribe"}
        </button>
      </div>
      {result && !result.ok && <p className="text-xs text-[#b91c1c]">{result.message}</p>}
      <p className="text-xs text-muted-foreground">Daily digest of every new report. Double opt-in; unsubscribe anytime.</p>
    </form>
  );
}
