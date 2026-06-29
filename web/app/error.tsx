"use client";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface to the browser console / Vercel logs; no PII.
    console.error("App error:", error?.digest ?? error?.message);
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-20 text-center">
      <h1 className="text-2xl font-bold text-navy">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        An unexpected error occurred. Trying again usually clears a one-off hiccup; if it keeps
        happening, head back home or get in touch and we&rsquo;ll take a look.
      </p>
      {error?.digest && (
        <p className="mt-3 text-xs text-muted-foreground">
          Reference code: <code className="rounded bg-tile px-1.5 py-0.5 font-mono text-foreground">{error.digest}</code> — quote this if you contact us.
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Back home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/contact">Contact us</Link>
        </Button>
      </div>
    </div>
  );
}
