"use client";
import { useState, useTransition, useRef } from "react";
import { submitFeedback, type FeedbackResult } from "./actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const CATEGORIES: [string, string][] = [
  ["feature", "Feature request"],
  ["bug", "Bug / something broke"],
  ["data", "Data accuracy"],
  ["general", "General feedback"],
  ["other", "Other"],
];

export default function FeedbackForm() {
  const [category, setCategory] = useState("feature");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<FeedbackResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("category", category);
    startTransition(async () => {
      const r = await submitFeedback(fd);
      setResult(r);
      if (r.ok) formRef.current?.reset();
    });
  };

  if (result?.ok) {
    return (
      <div className="rounded-xl border border-[#cdd9ea] bg-tile px-4 py-6 text-center">
        <p className="font-semibold text-navy">{result.message}</p>
        <button type="button" className="mt-2 text-sm text-navy underline underline-offset-2" onClick={() => setResult(null)}>
          Send another
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="fb-cat" className="mb-1 block text-sm font-semibold text-ink">What&rsquo;s this about?</label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="fb-cat" aria-label="Feedback category" className="w-full sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {CATEGORIES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label htmlFor="fb-msg" className="mb-1 block text-sm font-semibold text-ink">Your feedback</label>
        <Textarea id="fb-msg" name="message" required maxLength={4000} placeholder="What would you like us to build, fix, or cover?" />
      </div>
      <div>
        <label htmlFor="fb-email" className="mb-1 block text-sm font-semibold text-ink">
          Email <span className="font-normal text-muted-foreground">(optional — only if you&rsquo;d like a reply)</span>
        </label>
        <Input id="fb-email" name="email" type="email" placeholder="you@example.com" className="sm:w-72" />
      </div>
      {/* Honeypot: hidden from users, bots tend to fill it. */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      {result && !result.ok && <p className="text-sm font-medium text-[#b91c1c]">{result.message}</p>}
      <div>
        <Button type="submit" disabled={pending}>{pending ? "Sending…" : "Send feedback"}</Button>
      </div>
      <p className="text-xs text-muted-foreground">
        We use this only to improve AssetFrame — see our{" "}
        <a href="/privacy" className="underline underline-offset-2">privacy policy</a>. AssetFrame is research only and can&rsquo;t give personal advice.
      </p>
    </form>
  );
}
